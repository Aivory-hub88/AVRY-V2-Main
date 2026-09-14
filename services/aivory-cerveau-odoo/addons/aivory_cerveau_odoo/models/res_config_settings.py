from odoo import fields, models

# The five Cerveau agent_type ids and their first-name identities, per
# frontend/avry-user-dashboard/lib/workspaceAccess.ts (AGENT_DISPLAY_NAMES) --
# kept in sync manually since this addon has no shared package with that repo.
AGENT_TYPE_SELECTION = [
    ('autonomous', 'Geno -- Generalist Agent'),
    ('customer_service', 'Teo -- Ticket Ops Agent'),
    ('leads_qualifier', 'Lex -- Leads Qualifier Agent'),
    ('finance_invoice_ops', 'Finn -- Finance & Invoice Ops Agent'),
    ('office_assistant', 'Ofira -- Office Assistant'),
]


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    aivory_cerveau_base_url = fields.Char(
        string='Cerveau Base URL',
        config_parameter='aivory_cerveau.base_url',
        help='e.g. https://cerveau.aivory.uk',
    )
    aivory_cerveau_shared_secret = fields.Char(
        string='Cerveau Shared Secret',
        config_parameter='aivory_cerveau.shared_secret',
        help=(
            'Sent as the X-Webhook-Secret header on every controller call to '
            'Cerveau, matching the live gateway contract. Where this per-install '
            'value should be provisioned from is still open question #4 in '
            'docs/CERVEAU-ODOO-UI-WIDGET-PLAN.md.'
        ),
    )
    aivory_cerveau_tenant_id = fields.Char(
        string='Cerveau Tenant ID',
        config_parameter='aivory_cerveau.tenant_id',
        help=(
            'The tenant identifier Cerveau knows this Odoo install as. Set '
            'explicitly by the admin during setup (resolves open question #3: '
            'the most explicit option, no "magic" mapping from res.company or '
            'res.users).'
        ),
    )
    aivory_cerveau_agent_type = fields.Selection(
        selection=AGENT_TYPE_SELECTION,
        string='Cerveau Agent',
        config_parameter='aivory_cerveau.agent_type',
        default='autonomous',
        help='Which Cerveau agent this widget talks to for this Odoo install.',
    )
