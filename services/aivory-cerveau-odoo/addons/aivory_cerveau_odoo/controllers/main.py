import logging

import requests

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)

# Falls back to the generalist agent (Geno) if the admin hasn't picked one
# yet -- matches AGENT_DISPLAY_NAMES.autonomous in
# frontend/avry-user-dashboard/lib/workspaceAccess.ts.
DEFAULT_AGENT_TYPE = 'autonomous'


class CerveauChatController(http.Controller):

    @http.route('/aivory_cerveau/chat', type='json', auth='user', methods=['POST'], csrf=False)
    def chat(self, message=None, **kwargs):
        message = (message or '').strip()
        if not message:
            return {'error': 'message is required'}

        icp = request.env['ir.config_parameter'].sudo()
        base_url = icp.get_param('aivory_cerveau.base_url')
        shared_secret = icp.get_param('aivory_cerveau.shared_secret')
        tenant_id = icp.get_param('aivory_cerveau.tenant_id')
        agent_type = icp.get_param('aivory_cerveau.agent_type') or DEFAULT_AGENT_TYPE

        if not base_url:
            return {
                'error': (
                    'Cerveau base URL is not configured. '
                    'Set it under Settings > General Settings > Aivory Cerveau.'
                )
            }
        if not tenant_id:
            return {
                'error': (
                    'Aivory Account User ID is not configured. '
                    'Set it under Settings > General Settings > Aivory Cerveau.'
                )
            }

        headers = {
            'Content-Type': 'application/json',
            'X-Tenant-Id': tenant_id,
            'X-Agent-Type': agent_type,
        }
        if shared_secret:
            # Matches the gateway's real X-Webhook-Secret contract, confirmed
            # against docs/CERVEAU-STATUS.md 2026-09-14.
            headers['X-Webhook-Secret'] = shared_secret

        try:
            resp = requests.post(
                f'{base_url.rstrip("/")}/webhook',
                json={'tenant_id': tenant_id, 'agent_type': agent_type, 'message': message},
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
        except requests.RequestException:
            _logger.exception('Cerveau /webhook call failed')
            return {'error': 'Could not reach Cerveau. Check the base URL and that the service is running.'}

        return resp.json()
