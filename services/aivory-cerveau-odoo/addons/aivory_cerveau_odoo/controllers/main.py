import logging

import requests

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)

# Scaffold only -- tenant identity is hardcoded until open question #3
# (docs/CERVEAU-ODOO-UI-WIDGET-PLAN.md) picks a real source
# (res.company.id / res.users.id / a dedicated admin-set field).
SCAFFOLD_TENANT_ID = 'scaffold-tenant'


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

        headers = {'Content-Type': 'application/json'}
        if shared_secret:
            # Placeholder auth shape -- open question #4 in the plan doc asks
            # whether this should match the existing x-bridge-key pattern
            # used by Cerveau's native-tools bridge.
            headers['x-bridge-key'] = shared_secret

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
