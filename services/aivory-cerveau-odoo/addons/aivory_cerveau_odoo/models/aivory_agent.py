"""One Aivory agent persona deployed into this Odoo.

Each row = one persona (Geno, Teo, Lex, ...) + the Aivory API key that was
created for it in the Aivory dashboard (Agents > pick an agent > Customize >
Deploy > Create API Key). A key is bound server-side to exactly one agent, so
the row's agent type is what tells Odoo who is on the other end.

Each row owns a *bot* in Discuss carrying the persona's own name and avatar --
the same identity users see in the Aivory dashboard -- so ``@Lex`` in a channel
reaches Lex and only Lex (see ``discuss_channel.py``).

Why a res.users per bot: Discuss's @-mention autocomplete only offers partners
that belong to a user, so a bare partner would be unmentionable.
"""

import base64
import logging

from odoo import api, fields, models
from odoo.tools import file_open

_logger = logging.getLogger(__name__)

# Identity comes from Aivory's public roster (GET /api/v1/agent-roster,
# backend/avry-backend/app/routes/agent_roster.py); avatars are the dashboard's
# public/agents/<agent_type>.svg. Keep in sync when the roster changes.
ROSTER = [
    ('autonomous', 'Geno', 'Generalist Agent'),
    ('customer_service', 'Teo', 'Ticket Ops Agent'),
    ('leads_qualifier', 'Lex', 'Sales and Lead Agent'),
    ('finance_invoice_ops', 'Finn', 'Finance & Invoice Ops Agent'),
    ('office_assistant', 'Ofira', 'Office Assistant'),
    ('chief_of_staff', 'Aira', 'Chief of Staff Agent'),
]
ROSTER_BY_TYPE = {t: (n, title) for t, n, title in ROSTER}


def _avatar(agent_type):
    try:
        with file_open(f'aivory_cerveau_odoo/static/img/agents/{agent_type}.svg', 'rb') as f:
            return base64.b64encode(f.read())
    except FileNotFoundError:
        return False


class AivoryAgent(models.Model):
    _name = 'aivory.agent'
    _description = 'Aivory agent deployed to this Odoo'
    _order = 'id'

    agent_type = fields.Selection(
        [(t, f'{n} - {title}') for t, n, title in ROSTER],
        string='Agent', required=True,
    )
    name = fields.Char(compute='_compute_identity', store=True)
    title = fields.Char(compute='_compute_identity', store=True)
    handle = fields.Char(string='Mention with', compute='_compute_identity', store=True)
    api_key = fields.Char(
        string='Aivory API Key', groups='base.group_system',
        help='Create it in the Aivory dashboard: Agents > this agent > Customize > '
             'Deploy > Create API Key (Business plan or above). The key is bound to this '
             'one agent and cannot reach any other tenant.',
    )
    active = fields.Boolean(default=True)
    partner_id = fields.Many2one('res.partner', string='Discuss bot', readonly=True, copy=False)

    _agent_type_unique = models.Constraint(
        'UNIQUE(agent_type)', 'This Aivory agent is already configured in this Odoo.',
    )

    @api.depends('agent_type')
    def _compute_identity(self):
        for rec in self:
            name, title = ROSTER_BY_TYPE.get(rec.agent_type, (False, False))
            rec.name, rec.title = name, title
            rec.handle = f'@{name}' if name else False

    # -- bot provisioning ---------------------------------------------------------
    def _ensure_bot(self):
        Partners = self.env['res.partner'].sudo()
        Users = self.env['res.users'].sudo().with_context(active_test=False, no_reset_password=True)
        for rec in self.sudo():
            vals = {'name': rec.name, 'is_company': False, 'active': rec.active}
            if not rec.partner_id:
                # plain ORM create: XML-data creation of res.partner breaks on
                # account's NOT NULL autopost_bills under Odoo 19
                partner = Partners.create({**vals, 'image_1920': _avatar(rec.agent_type)})
                rec.partner_id = partner
                _logger.info('Aivory agent %s: Discuss bot created (partner %s)', rec.name, partner.id)
            else:
                rec.partner_id.sudo().write(vals)
            user = Users.search([('partner_id', '=', rec.partner_id.id)], limit=1)
            if not user:
                user = Users.create({
                    'name': rec.name, 'login': f'aivory-bot-{rec.agent_type}',
                    'email': False, 'partner_id': rec.partner_id.id, 'active': rec.active,
                })
            else:
                user.write({'active': rec.active})
            if not user.log_ids:
                # A user that never logged in shows up under Settings > "Pending
                # Invitations". Bots never log in, so record one login for them.
                self.env['res.users.log'].with_user(user).sudo().create({})

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        records._ensure_bot()
        return records

    def write(self, vals):
        res = super().write(vals)
        if {'agent_type', 'active'} & vals.keys():
            self._ensure_bot()
        return res

    def unlink(self):
        # keep the partner/user: message history references them. Just retire the bot.
        self.write({'active': False})
        return True
