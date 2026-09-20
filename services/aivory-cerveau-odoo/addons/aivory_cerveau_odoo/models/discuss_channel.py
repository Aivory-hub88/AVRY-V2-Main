"""Aivory agents inside Odoo Discuss, next to OdooBot.

Every configured ``aivory.agent`` owns a bot (Geno, Teo, Lex, ...). It answers
when (a) a message @-mentions it (its partner id is in the message's
``partner_ids``) or (b) the channel is a 1-1 ``chat`` it is a member of.
Anything else -- group chatter without a mention, an agent's own messages, other
agents' messages, non-comments -- is ignored: each trigger costs one agent-api
call (credits + rate limit), and "agents never wake agents" is the
infinite-loop guard.

Each agent keeps its own conversation per channel (session id
``discuss-<channel uuid>-<agent_type>``), so Lex and Geno in the same channel do
not share a thread.

The agent call runs in a background thread *after* the user's message is
committed: a tool-using turn can take up to ~3 minutes, and doing it inline
would hold the sender's own message back until the agent had answered.

OdooBot (``addons/mail_bot``) is deliberately untouched.
"""

import html
import logging
import re
import threading

from markupsafe import Markup

from odoo import SUPERUSER_ID, api, models
from odoo.modules.registry import Registry

from odoo.addons.aivory_cerveau_odoo.models.aivory_format import render_reply, with_context_note
from odoo.addons.aivory_cerveau_odoo.models.aivory_api import (
    REPLY,
    SHOW,
    post_agent_message,
)

_logger = logging.getLogger(__name__)

_TAG_RE = re.compile(r'<[^>]+>')


def _html_to_text(body):
    text = _TAG_RE.sub(' ', body or '')
    return re.sub(r'[ \t]+', ' ', html.unescape(text).replace('\xa0', ' ')).strip()


def _deliver(dbname, channel_id, bot_partner_id, base_url, api_key, text, session_id):
    """Thread body: call the agent (no DB cursor held), then post its answer."""
    try:
        kind, reply = post_agent_message(api_key, text, session_id=session_id, base_url=base_url)
        if kind not in (REPLY, SHOW) or not reply:
            return  # SILENT: config/auth problem, already logged -- don't spill it into a channel
        # REPLY: agent markdown -> safe HTML. SHOW: a system notice, kept as one italic line.
        body = render_reply(reply) if kind == REPLY else Markup('<p><i>{}</i></p>').format(reply)
        with Registry(dbname).cursor() as cr:
            env = api.Environment(cr, SUPERUSER_ID, {})
            env['discuss.channel'].browse(channel_id).message_post(
                author_id=bot_partner_id, body=body, message_type='comment',
                silent=True, subtype_xmlid='mail.mt_comment',
            )
    except Exception:
        _logger.exception('Aivory agent reply failed (channel %s)', channel_id)


class DiscussChannel(models.Model):
    _inherit = 'discuss.channel'

    def _message_post_after_hook(self, message, msg_vals):
        self._aivory_dispatch(msg_vals)
        return super()._message_post_after_hook(message, msg_vals)

    def _aivory_targets(self, msg_vals):
        agents = self.env['aivory.agent'].sudo().search([]).filtered(lambda a: a.api_key and a.partner_id)
        if not agents or msg_vals.get('message_type') != 'comment':
            return self.env['aivory.agent'], agents
        if msg_vals.get('author_id') in agents.partner_id.ids:
            return self.env['aivory.agent'], agents  # agents never wake agents
        mentioned = set(msg_vals.get('partner_ids') or [])
        targets = agents.filtered(lambda a: a.partner_id.id in mentioned)
        if not targets and self.channel_type == 'chat':
            members = set(self.channel_member_ids.partner_id.ids)
            targets = agents.filtered(lambda a: a.partner_id.id in members)
        return targets, agents

    def _aivory_dispatch(self, msg_vals):
        self.ensure_one()
        targets, agents = self._aivory_targets(msg_vals)
        if not targets:
            return
        text = _html_to_text(msg_vals.get('body'))
        for name in agents.mapped('name'):  # "@Lex qualify this" -> "qualify this"
            text = re.sub(rf'@{re.escape(name)}\b', '', text, flags=re.I)
        text = text.strip()
        if not text:
            return
        base_url = self.env['ir.config_parameter'].sudo().get_param('aivory_cerveau.api_base_url')
        author = self.env['res.partner'].sudo().browse(msg_vals.get('author_id')).name or ''
        prompt = with_context_note(text, self.env.company.name, author, self.env.company.currency_id.name)
        dbname, channel_id, chan_key = self.env.cr.dbname, self.id, self.uuid or self.id
        for agent in targets:
            args = (dbname, channel_id, agent.partner_id.id, base_url, agent.api_key, prompt,
                    f'discuss-{chan_key}-{agent.agent_type}')
            # postcommit: the sender's message is already visible when the agent starts
            self.env.cr.postcommit.add(
                lambda args=args: threading.Thread(
                    target=_deliver, args=args, daemon=True, name=f'aivory-{args[2]}',
                ).start()
            )
