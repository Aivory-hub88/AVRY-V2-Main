"""Shared client for the Aivory agent API.

Single place that talks to ``POST /api/v1/agent-api/message`` on
``backend.aivory.id`` with a per-tenant ``X-Aivory-Api-Key``. Used by both the
systray controller (``controllers/main.py``) and the Discuss bot hook
(``models/discuss_channel.py``) so the two surfaces behave identically.

The key is bound server-side to one ``(user_id, agent_type)`` pair at
creation -- this addon never holds Cerveau's shared webhook secret (see
docs/ADR-006-CERVEAU-CLIENT-DEPLOYMENT-API.md).
"""

import logging

import requests

_logger = logging.getLogger(__name__)

AIVORY_API_BASE_URL = 'https://backend.aivory.id'
# The gateway allows up to ~195s for a tool-using turn; stay just above it.
TIMEOUT = 200

# Result kinds: 'reply' (agent text), 'show' (user-facing error, safe to
# display), 'silent' (config/auth problem -- log it, don't spill admin issues
# into shared channels).
REPLY, SHOW, SILENT = 'reply', 'show', 'silent'


def post_agent_message(api_key, text, session_id=None, base_url=None):
    """Send one message, return ``(kind, text)``. ``text`` is None for SILENT.

    ``base_url`` overrides the production backend (staging / tests).
    """
    if not api_key:
        return SILENT, None
    payload = {'text': text}
    if session_id:
        payload['session_id'] = session_id
    try:
        resp = requests.post(
            f'{(base_url or AIVORY_API_BASE_URL).rstrip("/")}/api/v1/agent-api/message',
            json=payload,
            headers={
                'Content-Type': 'application/json',
                'X-Aivory-Api-Key': api_key,
            },
            timeout=TIMEOUT,
        )
    except requests.RequestException:
        _logger.exception('Aivory agent-api call failed')
        return SHOW, 'Could not reach Aivory. Check your connection and try again.'
    if resp.status_code == 401:
        _logger.warning('Aivory agent-api rejected the configured API key (401)')
        return SILENT, None
    if resp.status_code == 402:
        return SHOW, 'This Aivory account is out of credits.'
    if resp.status_code == 403:
        _logger.warning('Aivory agent-api plan check failed (403)')
        return SILENT, None
    if resp.status_code == 429:
        return SHOW, 'Too many messages sent recently. Try again in a moment.'
    if not resp.ok:
        _logger.error('Aivory agent-api call returned %s: %s', resp.status_code, resp.text[:200])
        return SHOW, 'Aivory agent is temporarily unavailable. Try again shortly.'
    data = resp.json()
    return REPLY, data.get('reply') or data.get('message') or ''
