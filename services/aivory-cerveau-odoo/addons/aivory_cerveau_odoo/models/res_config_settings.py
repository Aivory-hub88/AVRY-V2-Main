from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    aivory_cerveau_api_key = fields.Char(
        string='Aivory API Key',
        config_parameter='aivory_cerveau.api_key',
        help=(
            'Create one from the Aivory dashboard: Agents > pick an agent > '
            'Customize > Deploy > Create API Key (needs the Business plan or '
            'above). The key is already bound to that one specific agent, so '
            'this widget always talks to that agent for this tenant -- no '
            'separate agent picker or tenant ID needed here. Sent as the '
            'X-Aivory-Api-Key header on every message '
            '(POST /api/v1/agent-api/message), never Cerveau\'s own shared '
            'webhook secret -- see docs/CERVEAU-ODOO-UI-WIDGET-PLAN.md open '
            'question #4 and docs/ADR-006-CERVEAU-CLIENT-DEPLOYMENT-API.md '
            'for why that distinction matters.'
        ),
    )
