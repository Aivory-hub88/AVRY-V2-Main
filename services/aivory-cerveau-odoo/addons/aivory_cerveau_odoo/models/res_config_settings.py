from odoo import fields, models


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
            'Sent as the x-bridge-key header on every controller call to Cerveau. '
            'Scaffold placeholder -- production auth mechanism is still open '
            'question #4 in docs/CERVEAU-ODOO-UI-WIDGET-PLAN.md.'
        ),
    )
