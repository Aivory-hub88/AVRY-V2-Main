#!/usr/bin/env python3
"""Produce a committable, redacted snapshot of a Cerveau config.toml.

The live config carries real Composio API keys, the bridge key, webhook
secrets and a Postgres URL with its password. The point of tracking it is the
*structure* -- which MCP servers exist, which bundles each agent type carries,
and every tool's risk tier -- none of which is secret. Values are replaced by
`<<REDACTED:key>>`; the file then fails a high-entropy sweep rather than being
written if anything slipped through.

The result is a record, not a deployable file.
"""
import re, sys

SRC, DST = sys.argv[1], sys.argv[2]

# Key names whose value is always secret material.
SECRET_KEYS = {
    "x-api-key", "x-bridge-key", "x-bridge-secret", "api_key", "api_token",
    "apikey", "token", "secret", "shared_secret", "client_secret", "client_id",
    "password", "passwd", "db_url", "database_url", "dsn", "webhook_secret",
    "auth_token", "bearer", "private_key", "encryption_key",
    # Array-valued: the encrypted channel-binding blobs. Encrypted at rest,
    # but still credential material -- structure is the point here, not these.
    "paired_tokens",
}

out = []
redacted = 0
for line in open(SRC).read().splitlines():
    m = re.match(r'^(\s*)("?)([A-Za-z0-9_\-]+)\2(\s*=\s*)"(.*)"(\s*)$', line)
    if m:
        indent, q, key, eq, value, tail = m.groups()
        if key.lower() in SECRET_KEYS and value:
            out.append(f'{indent}{q}{key}{q}{eq}"<<REDACTED:{key}>>"{tail}')
            redacted += 1
            continue
    # Array-valued secret keys, e.g. paired_tokens = ["enc2:...", "enc2:..."]
    ma = re.match(r'^(\s*)("?)([A-Za-z0-9_\-]+)\2(\s*=\s*)\[.*\](\s*)$', line)
    if ma and ma.group(3).lower() in SECRET_KEYS:
        indent, q, key, eq, tail = ma.groups()
        out.append(f'{indent}{q}{key}{q}{eq}[]{tail}  # <<REDACTED:{key}>>')
        redacted += 1
        continue
    # A URL with inline credentials (postgres://user:pass@host/db) anywhere.
    line = re.sub(r'(\w+://[^:\s"]+:)[^@\s"]+(@)', r'\1<<REDACTED:password>>\2', line)
    out.append(line)

blob = "\n".join(out) + "\n"

# Refuse on any surviving unbroken 32+ char alphanumeric run -- the shape of
# every API key and hex secret in this file. UUIDs survive on purpose: they
# are Composio MCP server ids, which are structure and appear in the URLs the
# deployed config must match.
leftovers = [
    m for m in re.findall(r'[A-Za-z0-9]{32,}', blob)
    if re.search(r'\d', m) and re.search(r'[a-z]', m)
]
if leftovers:
    print("REFUSING TO WRITE — possible unredacted secret(s):", leftovers[:5])
    sys.exit(1)

open(DST, "w").write(blob)
print(f"wrote {DST} ({redacted} values redacted, {len(out)} lines)")
