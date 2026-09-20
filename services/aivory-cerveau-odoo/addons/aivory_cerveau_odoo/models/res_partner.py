"""Show Aivory agent bots as online, like OdooBot.

A bot has a user but never opens a web client, so Odoo would render it offline
(grey circle) even though it answers instantly. OdooBot avoids that with the
special ``bot`` status (green heart, counted as online); do the same for every
partner that belongs to an ``aivory.agent``.
"""

from odoo import models


class ResPartner(models.Model):
    _inherit = 'res.partner'

    def _compute_im_status(self):
        super()._compute_im_status()
        bots = self.env['aivory.agent'].sudo().with_context(active_test=False).search(
            [('partner_id', 'in', self.ids)],
        ).partner_id
        for partner in self & bots:
            partner.im_status = 'bot'
            partner.offline_since = False
