import { test } from 'node:test';
import assert from 'node:assert/strict';

import { slug, buildLink, campaignLinks, MAX_LINKS } from './utm.mjs';

test('slug lowercases, strips diacritics, collapses separators and trims', () => {
  assert.equal(slug('  Promo Lebaran 2026!! '), 'promo-lebaran-2026');
  assert.equal(slug('Été Spécial'), 'ete-special');
  assert.equal(slug('a___b'), 'a-b');
  assert.equal(slug('---'), '');
  assert.equal(slug(42), '');
  assert.ok(slug('x'.repeat(200)).length <= 60);
});

test('a known channel gets its source and medium; the link is tagged exactly', () => {
  const r = buildLink({ channel: 'Instagram', url: 'https://shop.example.com/promo?ref=abc#top' }, 'lebaran-2026');
  assert.equal(r.ok, true);
  const u = new URL(r.url);
  assert.equal(u.searchParams.get('utm_source'), 'instagram');
  assert.equal(u.searchParams.get('utm_medium'), 'social');
  assert.equal(u.searchParams.get('utm_campaign'), 'lebaran-2026');
  assert.equal(u.searchParams.get('ref'), 'abc');
  assert.equal(u.hash, '#top');
});

test('content and term are slugged and added only when given', () => {
  const r = buildLink({ channel: 'email', url: 'https://x.id/', content: 'Hero Button', term: 'Roof Repair' }, 'c');
  assert.equal(new URL(r.url).searchParams.get('utm_content'), 'hero-button');
  assert.equal(new URL(r.url).searchParams.get('utm_term'), 'roof-repair');
  const plain = buildLink({ channel: 'email', url: 'https://x.id/' }, 'c');
  assert.equal(new URL(plain.url).searchParams.has('utm_content'), false);
});

test('an unknown channel is refused unless both source and medium are given', () => {
  assert.equal(buildLink({ channel: 'podcast', url: 'https://x.id/' }, 'c').ok, false);
  assert.equal(buildLink({ channel: 'podcast', url: 'https://x.id/', source: 'radio' }, 'c').ok, false);
  const r = buildLink({ channel: 'podcast', url: 'https://x.id/', source: 'Radio Kita', medium: 'audio' }, 'c');
  assert.equal(r.ok, true);
  assert.equal(r.utm.source, 'radio-kita');
});

test('existing utm parameters are never overwritten', () => {
  const r = buildLink({ channel: 'blog', url: 'https://x.id/?utm_source=old&a=1' }, 'c');
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /utm_source/);
});

test('only absolute http(s) URLs are accepted', () => {
  for (const url of ['javascript:alert(1)', 'ftp://x.id/', '/relative', 'not a url', '', undefined]) {
    assert.equal(buildLink({ channel: 'blog', url }, 'c').ok, false, String(url));
  }
});

test('campaignLinks counts, de-duplicates the packet line and refuses empty input', () => {
  const out = campaignLinks({
    campaign: 'Promo Lebaran',
    links: [
      { channel: 'instagram', url: 'https://x.id/p' },
      { channel: 'tiktok', url: 'https://x.id/p' },
      { channel: 'instagram', url: 'https://x.id/q' },
      { channel: 'nope', url: 'https://x.id/p' },
    ],
  });
  assert.equal(out.campaign, 'promo-lebaran');
  assert.deepEqual(out.summary, { links: 4, tagged: 3, refused: 1 });
  assert.deepEqual(out.packet_utm, ['instagram / social / promo-lebaran', 'tiktok / social / promo-lebaran']);
  assert.equal(campaignLinks({ campaign: '', links: [{}] }).ok, false);
  assert.equal(campaignLinks({ campaign: 'a', links: [] }).ok, false);
  assert.equal(campaignLinks({ campaign: 'a', links: Array.from({ length: MAX_LINKS + 1 }, () => ({})) }).ok, false);
});

test('identical destination and tags are flagged as ambiguous', () => {
  const out = campaignLinks({ campaign: 'c', links: [{ channel: 'email', url: 'https://x.id/p' }, { channel: 'email', url: 'https://x.id/p' }] });
  assert.match(out.notes.join(' '), /share the same destination/);
});

test('the attribution caveat is always present', () => {
  const out = campaignLinks({ campaign: 'c', links: [{ channel: 'email', url: 'https://x.id/' }] });
  assert.match(out.notes.join(' '), /captures the utm/);
});
