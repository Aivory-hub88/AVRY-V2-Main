# n8n-as-code adapter (mirror of the production copy)

Production runs this file from `/opt/n8n-as-code-service/index.js` as the systemd unit
`n8n-as-code-adapter` (user `ubuntu`, `127.0.0.1:3500`, env from `/opt/workflows-store/.env`).
Until 2026-11-10 it only existed on the VPS (many `index.js.bak-*` copies, no git).
This directory is the versioned copy: change it here, then deploy.

Deploy:

```bash
scp backend/n8n-as-code-service/index.js aivory-prod:/tmp/adapter-index.js
ssh aivory-prod 'sudo -u ubuntu cp -p /opt/n8n-as-code-service/index.js /opt/n8n-as-code-service/index.js.bak-$(date +%Y%m%d-%H%M%S) \
  && sudo install -o ubuntu -g ubuntu -m 644 /tmp/adapter-index.js /opt/n8n-as-code-service/index.js \
  && sudo systemctl restart n8n-as-code-adapter && sleep 2 && curl -s http://127.0.0.1:3500/health'
```

## Setup report / credentials for configured nodes

When a step arrives with `n8nInspection.configured` (written by the bridge's
`nodeConfigurator.js` from n8n's own MCP: node, typeVersion, real parameters,
credential types, values the user must still supply), the setup report and credential
binding use that instead of the keyword templates in `inferNodeRequirement`:

- the credential types n8n lists for the node (OAuth2 preferred),
- only the values the user really has to provide (`needsInput`),
- nothing at all for nodes that need none (e.g. a webhook trigger).

Steps without `configured` keep the legacy regex templates as a fallback.
