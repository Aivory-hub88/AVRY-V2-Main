"""Aivory Discuss bot identity, created idempotently via post-init hook.

Why a hook and not a data XML file: Odoo 19's data-file creation path
(``_load_records_create``) bypasses ORM defaults, so creating ``res.partner``
from XML dies on ``account``'s NOT NULL ``autopost_bills`` column (verified
live 2026-09-17: ``NotNullViolation`` with the field set implicitly,
``Invalid field`` when set explicitly, because the upgrade-registry build
resolves ``res.partner`` without the ``account`` extension). A plain ORM
``create()`` applies defaults and works -- same path as the UI/API.
"""

import logging

_logger = logging.getLogger(__name__)


def ensure_aivory_bot(env):
    Partners = env['res.partner'].sudo()
    Users = env['res.users'].sudo()
    partner = Partners.search([('name', '=', 'Aivory'), ('is_company', '=', False)], limit=1)
    if not partner:
        partner = Partners.create({'name': 'Aivory', 'is_company': False})
        _logger.info('Aivory bot: partner created (%s)', partner.id)
    user = Users.search([('login', '=', 'aivory')], limit=1)
    if not user:
        user = Users.create({
            'name': 'Aivory',
            'login': 'aivory',
            'email': False,
            'partner_id': partner.id,
            'active': True,
        })
        _logger.info('Aivory bot: user created (%s)', user.id)
    elif not user.partner_id or user.partner_id.id != partner.id:
        user.write({'partner_id': partner.id})
    return partner


def post_init_hook(env):
    ensure_aivory_bot(env)
