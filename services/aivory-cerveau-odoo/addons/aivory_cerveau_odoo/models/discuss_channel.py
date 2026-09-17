"""Aivory bot inside Odoo Discuss (chatroom), next to OdooBot.

How OdooBot itself works (Odoo 19 source, ``addons/mail_bot``): ``mail.bot``
is an abstract model; ``discuss.channel._message_post_after_hook`` calls
``mail.bot._apply_logic``, which answers with canned strings as
``base.partner_root`` when the channel is a 1-1 chat with the bot or the bot
is mentioned. We deliberately do NOT touch that -- this module adds a
separate ``Aivory`` bot partner/user with its own hook below, so an Odoo
upgrade can never silently merge the two.

Trigger: the bot answers when (a) the message @-mentions it (its partner id
is in the message's ``partner_ids``), or (b) the channel is a 1-1 ``chat``
with the bot as member. Anything else (group chatter without a mention,
bot's own messages, non-comments) is ignored -- each trigger costs one
agent-api call (credits + rate limit), so group channels stay quiet unless
addressed.
"""

import html
import logging
import re

from markupsafe import Markup

from odoo import models

from odoo.addons.aivory_cerveau_odoo.models.aivory_api import (
    REPLY,
    SHOW,
    post_agent_message,
)

_logger = logging.getLogger(__name__)

_TAG_RE = re.compile(r'<[^>]+>')


def _html_to_text(body):
    text = _TAG_RE.sub(' ', body or '')
    return html.unescape(text).replace('\xa0', ' ').strip()


class DiscussChannel(models.Model):
    _inherit = 'discuss.channel'

    def _message_post_after_hook(self, message, msg_vals):
        self._aivory_bot_answer(message, msg_vals)
        return super()._message_post_after_hook(message, msg_vals)

    def _aivory_bot_answer(self, message, msg_vals):
        self.ensure_one()
        bot = self.env.ref(
            'aivory_cerveau_odoo.aivory_bot_partner', raise_if_not_found=False,
        )
        if not bot:
            return
        if msg_vals.get('message_type') != 'comment':
            return
        if msg_vals.get('author_id') == bot.id:
            return  # never answer ourselves -- infinite-loop guard
        mentioned = bot.id in (msg_vals.get('partner_ids') or [])
        is_dm = (
            self.channel_type == 'chat'
            and bot.id in self.channel_member_ids.partner_id.ids
        )
        if not (mentioned or is_dm):
            return
        text = _html_to_text(msg_vals.get('body'))
        if not text:
            return
        api_key = self.env['ir.config_parameter'].sudo().get_param('aivory_cerveau.api_key')
        if not api_key:
            _logger.info('Aivory bot: message in channel %s ignored, API key not configured', self.id)
            return
        session_id = f'discuss-{self.uuid or self.id}'
        kind, reply = post_agent_message(api_key, text, session_id=session_id)
        if kind == REPLY and reply:
            self.sudo().message_post(
                author_id=bot.id,
                body=Markup('<p>{}</p>').format(html.escape(reply).replace('\n', '<br/>')),
                message_type='comment',
                silent=True,
                subtype_xmlid='mail.mt_comment',
            )
        elif kind == SHOW:
            # Transient problem (no credits, rate limit, backend down): say so
            # once, in place. Config/auth problems stay silent (see aivory_api).
            self.sudo().message_post(
                author_id=bot.id,
                body=Markup('<p><i>{}</i></p>').format(html.escape(reply)),
                message_type='comment',
                silent=True,
                subtype_xmlid='mail.mt_comment',
            )
