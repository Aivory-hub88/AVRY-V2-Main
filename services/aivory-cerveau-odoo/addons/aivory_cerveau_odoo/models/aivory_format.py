"""Turn an agent's markdown-ish reply into safe chat HTML.

Agents answer in light markdown (paragraphs, ``- `` lists, ``**bold**``, ``code``).
Odoo chat renders HTML, not markdown, so plain text would show the markers and, worse,
raw ``<br/>`` if newlines were converted by hand. Everything is HTML-escaped FIRST and
only a fixed set of tags is produced afterwards, so a reply can never inject markup.
"""

import re

from markupsafe import Markup, escape

_BOLD = re.compile(r'\*\*(.+?)\*\*')
_CODE = re.compile(r'`([^`\n]+)`')
_LINK = re.compile(r'\[([^\]\n]+)\]\((https?://[^\s)]+)\)')
_BULLET = re.compile(r'^\s*[-*•]\s+(.*)$')
_NUMBER = re.compile(r'^\s*\d+[.)]\s+(.*)$')
_HEADING = re.compile(r'^\s*#{1,6}\s+(.*)$')


def _inline(text):
    out = str(escape(text))  # escape first; the substitutions below only add fixed tags
    out = _CODE.sub(r'<code>\1</code>', out)
    out = _BOLD.sub(r'<b>\1</b>', out)
    out = _LINK.sub(r'<a href="\2" target="_blank" rel="noopener noreferrer">\1</a>', out)
    return out


def render_reply(text):
    """Return Markup: <p>/<ul>/<ol> blocks, single newlines as <br/>."""
    blocks, para, items, kind = [], [], [], None

    def flush_para():
        if para:
            blocks.append('<p>' + '<br/>'.join(_inline(x) for x in para) + '</p>')
            para.clear()

    def flush_list():
        nonlocal kind
        if items:
            blocks.append(f'<{kind}>' + ''.join(f'<li>{_inline(i)}</li>' for i in items) + f'</{kind}>')
            items.clear()
        kind = None

    for raw in (text or '').replace('\r\n', '\n').split('\n'):
        bullet, number, heading = _BULLET.match(raw), _NUMBER.match(raw), _HEADING.match(raw)
        if bullet or number:
            flush_para()
            want = 'ul' if bullet else 'ol'
            if kind and kind != want:
                flush_list()
            kind = want
            items.append((bullet or number).group(1))
        elif not raw.strip():
            flush_para()
            flush_list()
        elif heading:
            flush_para()
            flush_list()
            blocks.append('<p><b>' + _inline(heading.group(1)) + '</b></p>')
        else:
            flush_list()
            para.append(raw.strip())
    flush_para()
    flush_list()
    return Markup(''.join(blocks) or '<p></p>')
