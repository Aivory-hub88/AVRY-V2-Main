import logging

import requests

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)

# The Aivory backend, not Cerveau directly -- see docs/CERVEAU-ODOO-UI-WIDGET-PLAN.md
# open question #4. Calling Cerveau's own /webhook would mean this addon has
# to hold Cerveau's single shared X-Webhook-Secret, which per
# docs/ADR-006-CERVEAU-CLIENT-DEPLOYMENT-API.md is explicitly NOT safe to
# hand to a tenant-controlled server (any holder could set X-Tenant-Id to a
# different tenant's user_id and read/write a stranger's agent). Using
# POST /api/v1/agent-api/message with a per-tenant X-Aivory-Api-Key instead
# avoids that entirely -- the key is bound to one (user_id, agent_type) pair
# at creation, server-side, and never carries cross-tenant capability.
AIVORY_API_BASE_URL = 'https://backend.aivory.id'


class CerveauChatController(http.Controller):

    @http.route('/aivory_cerveau/chat', type='json', auth='user', methods=['POST'], csrf=False)
    def chat(self, message=None, **kwargs):
        message = (message or '').strip()
        if not message:
            return {'error': 'message is required'}

        icp = request.env['ir.config_parameter'].sudo()
        api_key = icp.get_param('aivory_cerveau.api_key')

        if not api_key:
            return {
                'error': (
                    'Aivory API Key is not configured. '
                    'Set it under Settings > General Settings > Aivory Cerveau.'
                )
            }

        try:
            resp = requests.post(
                f'{AIVORY_API_BASE_URL}/api/v1/agent-api/message',
                json={'text': message},
                headers={
                    'Content-Type': 'application/json',
                    'X-Aivory-Api-Key': api_key,
                },
                timeout=200,  # the gateway itself allows up to 195s for a tool-using turn
            )
        except requests.RequestException:
            _logger.exception('Aivory agent-api call failed')
            return {'error': 'Could not reach Aivory. Check your connection and try again.'}

        if resp.status_code == 401:
            return {'error': 'Aivory API Key is invalid or has been revoked. Check Settings > Aivory Cerveau.'}
        if resp.status_code == 402:
            return {'error': 'This Aivory account is out of credits.'}
        if resp.status_code == 403:
            return {'error': 'This Aivory account\'s plan no longer supports API access.'}
        if resp.status_code == 429:
            return {'error': 'Too many messages sent recently. Try again in a moment.'}
        if not resp.ok:
            _logger.error('Aivory agent-api call returned %s: %s', resp.status_code, resp.text[:200])
            return {'error': 'Aivory agent is temporarily unavailable. Try again shortly.'}

        return resp.json()
