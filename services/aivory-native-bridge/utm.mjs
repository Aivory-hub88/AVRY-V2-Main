// Pure helpers for Mira's `campaign_links` (agents/marketing-content.mjs).
//
// No database and no network: Mira passes in the campaign name and the landing URLs,
// this file normalises the UTM values and builds the tagged links, so Lex and Ivo can
// attribute leads to the campaign later. It never "fixes" a URL it does not understand:
// anything odd comes back as an error for that link, with the reason.
//
// Rules:
//   * utm values are lowercase [a-z0-9_-] only (diacritics stripped, spaces become "-");
//   * a URL that already carries a utm_* parameter is refused, never overwritten;
//   * only http(s) URLs; the fragment and other query parameters are kept;
//   * source/medium come from a small channel table unless the caller overrides them;
//     an unknown channel without both overrides is refused instead of guessed.

export const MAX_LINKS = 30;
export const SLUG_MAX = 60;

// channel -> [utm_source, utm_medium]
export const CHANNELS = {
  instagram: ['instagram', 'social'],
  tiktok: ['tiktok', 'social'],
  linkedin: ['linkedin', 'social'],
  facebook: ['facebook', 'social'],
  x: ['x', 'social'],
  youtube: ['youtube', 'social'],
  whatsapp: ['whatsapp', 'messaging'],
  telegram: ['telegram', 'messaging'],
  email: ['email', 'email'],
  newsletter: ['newsletter', 'email'],
  google_ads: ['google', 'cpc'],
  meta_ads: ['meta', 'paid_social'],
  tiktok_ads: ['tiktok', 'paid_social'],
  linkedin_ads: ['linkedin', 'paid_social'],
  blog: ['blog', 'content'],
  qr: ['qr', 'offline'],
};

export function slug(input) {
  if (typeof input !== 'string') return '';
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
}

export function normaliseChannel(channel) {
  const key = slug(channel).replace(/-/g, '_');
  return key;
}

export function buildLink(item, campaignSlug) {
  const channelKey = normaliseChannel(item?.channel);
  const errors = [];
  if (!channelKey) errors.push('channel is required');

  let source = item?.source != null ? slug(item.source) : null;
  let medium = item?.medium != null ? slug(item.medium) : null;
  if (item?.source != null && !source) errors.push('source has no usable characters');
  if (item?.medium != null && !medium) errors.push('medium has no usable characters');
  const known = CHANNELS[channelKey];
  if (!known && (!source || !medium) && channelKey) {
    errors.push(`unknown channel "${item.channel}": give both source and medium, or use one of ${Object.keys(CHANNELS).join(', ')}`);
  }
  source = source || (known ? known[0] : null);
  medium = medium || (known ? known[1] : null);

  let url = null;
  if (typeof item?.url !== 'string' || !item.url.trim()) {
    errors.push('url is required');
  } else {
    try {
      url = new URL(item.url.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.push('url must start with http:// or https://');
        url = null;
      }
    } catch {
      errors.push('url is not a valid absolute URL');
    }
  }

  const content = item?.content != null && item.content !== '' ? slug(item.content) : null;
  const term = item?.term != null && item.term !== '' ? slug(item.term) : null;
  if (item?.content != null && item.content !== '' && !content) errors.push('content has no usable characters');
  if (item?.term != null && item.term !== '' && !term) errors.push('term has no usable characters');

  if (url) {
    const existing = [...url.searchParams.keys()].filter((k) => k.toLowerCase().startsWith('utm_'));
    if (existing.length) errors.push(`url already has ${existing.join(', ')}; remove them or give the untagged URL (not overwritten)`);
  }

  if (errors.length) return { channel: item?.channel ?? null, ok: false, errors };

  const tagged = new URL(url.toString());
  tagged.searchParams.set('utm_source', source);
  tagged.searchParams.set('utm_medium', medium);
  tagged.searchParams.set('utm_campaign', campaignSlug);
  if (content) tagged.searchParams.set('utm_content', content);
  if (term) tagged.searchParams.set('utm_term', term);
  return {
    channel: channelKey,
    ok: true,
    url: tagged.toString(),
    utm: { source, medium, campaign: campaignSlug, content, term },
  };
}

export function campaignLinks({ campaign, links }) {
  const campaignSlug = slug(campaign);
  if (!campaignSlug) return { ok: false, error: 'campaign needs a name with letters or digits' };
  if (!Array.isArray(links) || links.length === 0) return { ok: false, error: 'Give at least one link.' };
  if (links.length > MAX_LINKS) return { ok: false, error: `At most ${MAX_LINKS} links per call; split the list.` };

  const results = links.map((l) => buildLink(l, campaignSlug));
  // Two links with the same tags would make attribution ambiguous: say so.
  const seen = new Map();
  const notes = [];
  for (const r of results) {
    if (!r.ok) continue;
    const key = [r.utm.source, r.utm.medium, r.utm.content ?? '', r.utm.term ?? '', new URL(r.url).origin + new URL(r.url).pathname].join('|');
    if (seen.has(key)) notes.push(`Two links share the same destination and tags (${r.utm.source}/${r.utm.medium}${r.utm.content ? `/${r.utm.content}` : ''}): add a content tag to tell them apart.`);
    seen.set(key, true);
  }
  const okOnes = results.filter((r) => r.ok);
  return {
    ok: true,
    campaign: campaignSlug,
    summary: { links: results.length, tagged: okOnes.length, refused: results.length - okOnes.length },
    results,
    packet_utm: [...new Set(okOnes.map((r) => `${r.utm.source} / ${r.utm.medium} / ${campaignSlug}`))],
    notes: [
      ...notes,
      'Tags only record where a click came from. A lead can only be attributed to this campaign if the form or CRM captures the utm_* values; say so if it does not.',
    ],
  };
}
