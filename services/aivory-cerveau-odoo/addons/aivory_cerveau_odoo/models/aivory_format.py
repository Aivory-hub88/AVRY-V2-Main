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
# table separator row: "---  ---  ---" or "|---|:---:|" (agents send either, and the chat gateway
# may strip the pipes, leaving columns separated by runs of spaces)
_TABLE_SEP = re.compile(r'^\s*\|?\s*:?-{3,}:?\s*(?:[|\s]\s*:?-{3,}:?\s*)+\|?\s*$')
_NUMERIC = re.compile(r'^[\s$€£+\-−]*[\d][\d.,\s]*[%kKmM]?$')


def _cells(line):
    line = line.strip()
    if '|' in line:
        return [c.strip() for c in line.strip('|').split('|')]
    return [c.strip() for c in re.split(r'\s{2,}', line)]


def _table(header, rows):
    def cell(tag, text):
        align = ' style="text-align:right"' if tag == 'td' and _NUMERIC.match(text) else ''
        return f'<{tag}{align}>{_inline(text)}</{tag}>'
    head = ''.join(cell('th', c) for c in header)
    body = ''.join('<tr>' + ''.join(cell('td', c) for c in r) + '</tr>' for r in rows)
    return f'<table class="table table-sm"><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>'


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

    lines = (text or '').replace('\r\n', '\n').split('\n')
    i = 0
    while i < len(lines):
        raw = lines[i]
        i += 1
        # a table = header line, separator line, then row lines (>= 2 cells) up to a blank line
        if raw.strip() and i < len(lines) and _TABLE_SEP.match(lines[i]) and len(_cells(raw)) >= 2:
            header, rows, j = _cells(raw), [], i + 1
            while j < len(lines) and lines[j].strip() and len(_cells(lines[j])) >= 2:
                rows.append(_cells(lines[j]))
                j += 1
            flush_para()
            flush_list()
            blocks.append(_table(header, rows))
            i = j
            continue
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


def with_context_note(text, company, author, currency=''):
    """Prefix a question with where it came from and how to answer it.

    The agent API takes only ``text``. Without this the agent has no idea the question was asked
    inside Odoo: with several CRMs connected it picked Aivory's own lead inbox (test leads) over
    the tenant's Odoo, and it drifted into the language of that data instead of the user's.
    Kept short: it travels with every message and lands in the agent's history.
    """
    who = f' · asked by {author}' if author else ''
    money = (f'Amounts are in {currency}: report them as they are, with no currency conversion or web lookups. '
             if currency else '')
    note = (
        f'[Odoo Discuss · {company}{who}]\n'
        "This company's CRM and ERP live in Odoo. If Odoo tools (server tenant_odoo) are available, use them "
        'for anything about leads, pipeline, quotes, orders, invoices, purchases, projects or the calendar, '
        'and do not substitute another CRM. Prefer one aggregate query (odoo_read_group) over many small ones. '
        + money +
        'Reply in the language the question below is written in (not the language of this note).\n\n'
    )
    return (note + text)[:8000]
