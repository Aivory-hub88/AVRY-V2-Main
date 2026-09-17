import logging

from odoo import http
from odoo.http import request

from odoo.addons.aivory_cerveau_odoo.models.aivory_api import (
    REPLY,
    SHOW,
    post_agent_message,
)

_logger = logging.getLogger(__name__)


class AivoryChatController(http.Controller):

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
                    'Set it under Settings > General Settings > Aivory.'
                )
            }

        kind, reply = post_agent_message(api_key, message)
        if kind == REPLY:
            return {'reply': reply, 'session_id': None}
        if kind == SHOW:
            return {'error': reply}
        return {'error': 'Aivory API Key is invalid or has been revoked. Check Settings > Aivory.'}
