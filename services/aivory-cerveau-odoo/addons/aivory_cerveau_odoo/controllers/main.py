import logging

import requests

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)

# Scaffold only -- tenant identity is hardcoded until open question #3
# (docs/CERVEAU-ODOO-UI-WIDGET-PLAN.md) picks a real source
# (res.company.id / res.users.id / a dedicated admin-set field).
SCAFFOLD_TENANT_ID = 'scaffold-tenant'

# Scaffold only -- which Cerveau agent type this widget talks to isn't
# decided yet; there's no per-product agent alias for a generic Odoo
# chat widget the way there is for e.g. finance_invoice_ops.
SCAFFOLD_AGENT_TYPE = 'generalist'


class CerveauChatController(http.Controller):

    @http.route('/aivory_cerveau/chat', type='json', auth='user', methods=['POST'], csrf=False)
    def chat(self, message=None, **kwargs):
        message = (message or '').strip()
        if not message:
            return {'error': 'message is required'}

        icp = request.env['ir.config_parameter'].sudo()
        base_url = icp.get_param('aivory_cerveau.base_url')
        shared_secret = icp.get_param('aivory_cerveau.shared_secret')

        if not base_url:
            return {
                'error': (
                    'Cerveau base URL is not configured. '
                    'Set it under Settings > General Settings > Aivory Cerveau.'
                )
            }

        headers = {
            'Content-Type': 'application/json',
            'X-Tenant-Id': SCAFFOLD_TENANT_ID,
            'X-Agent-Type': SCAFFOLD_AGENT_TYPE,
        }
        if shared_secret:
            # Matches the gateway's real X-Webhook-Secret contract
            # (docs/CERVEAU-STATUS.md) -- confirmed 2026-09-14, replacing an
            # earlier guess at an x-bridge-key header. Where this per-install
            # secret should live/be provisioned is still open question #4.
            headers['X-Webhook-Secret'] = shared_secret

        try:
            resp = requests.post(
                f'{base_url.rstrip("/")}/webhook',
                json={'tenant_id': SCAFFOLD_TENANT_ID, 'message': message},
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
        except requests.RequestException:
            _logger.exception('Cerveau /webhook call failed')
            return {'error': 'Could not reach Cerveau. Check the base URL and that the service is running.'}

        return resp.json()
