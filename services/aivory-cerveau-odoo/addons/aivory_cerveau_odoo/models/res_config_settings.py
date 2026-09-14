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
        string='Cerveau Tenant ID',
        config_parameter='aivory_cerveau.tenant_id',
        help=(
            'The tenant identifier Cerveau knows this Odoo install as. Set '
            'explicitly by the admin during setup (resolves open question #3: '
            'the most explicit option, no "magic" mapping from res.company or '
            'res.users).'
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
