import logging
import time

import requests

from odoo import fields, models

_logger = logging.getLogger(__name__)

# Public, unauthenticated -- see backend/avry-backend/app/routes/agent_roster.py.
# .id vs .uk: the aivory.id -> aivory.uk domain migration is in progress
# (docs/aivory-uk-domain-migration.md); .id still resolves during the
# migration, update this once .uk is the sole canonical domain.
AGENT_ROSTER_URL = 'https://backend.aivory.id/api/v1/agent-roster'
AGENT_ROSTER_CACHE_TTL_SECONDS = 300
AGENT_ROSTER_FETCH_TIMEOUT_SECONDS = 3

# Used only if the roster endpoint is unreachable (offline dev, backend
# down, etc) so the settings page still renders instead of raising. Kept
# deliberately identical to backend/avry-backend/app/routes/agent_roster.py's
# AGENT_ROSTER at the time this was written -- it WILL drift if the real
# roster changes and the fallback is never hit in practice, which is an
# accepted tradeoff for "don't brick the settings page over a network blip",
# not a second source of truth to maintain carefully.
FALLBACK_AGENT_TYPE_SELECTION = [
    ('autonomous', 'Geno -- Generalist Agent'),
    ('customer_service', 'Teo -- Ticket Ops Agent'),
    ('leads_qualifier', 'Lex -- Leads Qualifier Agent'),
    ('finance_invoice_ops', 'Finn -- Finance & Invoice Ops Agent'),
    ('office_assistant', 'Ofira -- Office Assistant'),
]

_roster_cache = {'selection': None, 'fetched_at': 0.0}


def _fetch_agent_type_selection():
    """Selection options for aivory_cerveau_agent_type, fetched live from the
    Aivory backend's agent roster so this addon never hardcodes agent names --
    resolves the drift problem flagged in docs/CERVEAU-ODOO-UI-WIDGET-PLAN.md
    open question #3. Process-local cache, not persisted -- fine for a
    settings page nobody hits at high frequency."""
    now = time.monotonic()
    if _roster_cache['selection'] is not None and (now - _roster_cache['fetched_at']) < AGENT_ROSTER_CACHE_TTL_SECONDS:
        return _roster_cache['selection']

    try:
        resp = requests.get(AGENT_ROSTER_URL, timeout=AGENT_ROSTER_FETCH_TIMEOUT_SECONDS)
        resp.raise_for_status()
        agents = resp.json()['agents']
        selection = [(a['agent_type'], f"{a['name']} -- {a['title']}") for a in agents]
        if not selection:
            raise ValueError('agent roster response was empty')
    except Exception:
        _logger.warning('Could not fetch agent roster from %s, using fallback list', AGENT_ROSTER_URL, exc_info=True)
        return FALLBACK_AGENT_TYPE_SELECTION

    _roster_cache['selection'] = selection
    _roster_cache['fetched_at'] = now
    return selection


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
        string='Aivory Account User ID',
        config_parameter='aivory_cerveau.tenant_id',
        help=(
            'Your Aivory account\'s user_id -- NOT an arbitrary name. Every '
            'live Cerveau integration (dashboard, Telegram, Slack, memory) '
            'sends X-Tenant-Id=user_id and writes to the t_<user_id>.<agent_type> '
            'scope; putting anything else here disconnects this widget\'s '
            'conversations from that tenant\'s real Cerveau memory/history '
            'instead of sharing it. Confirmed against backend/avry-backend\'s '
            'live X-Tenant-Id usage 2026-09-14 -- see docs/CERVEAU-ODOO-UI-WIDGET-PLAN.md '
            'open question #3/#5. There is currently no dashboard page that '
            'shows a tenant their own user_id to copy here; that is a separate, '
            'not-yet-built follow-up.'
        ),
    )
    aivory_cerveau_agent_type = fields.Selection(
        selection=lambda self: _fetch_agent_type_selection(),
        string='Cerveau Agent',
        config_parameter='aivory_cerveau.agent_type',
        default='autonomous',
        help=(
            'Which Cerveau agent this widget talks to for this Odoo install. '
            'Options are fetched live from the Aivory agent roster, not '
            'hardcoded here.'
        ),
    )
