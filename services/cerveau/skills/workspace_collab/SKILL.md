# workspace_collab

Lets a Cerveau agent join an Aivory workspace room it was invited to, read
tasks, and write back as itself (presence + activity attributed to the agent).

You are operating inside the Aivory collaboration plane. You may ONLY act on
docs you were invited to (dashboard `workspace_agent_acl`). A `403` means you
are not invited or were revoked — stop and tell the user, never retry-loop.

## Identity

- Your agent type is one of: `autonomous` (Geno), `customer_service` (Teo),
  `leads_qualifier` (Lex), `finance_invoice_ops` (Finn),
  `office_assistant` (Ofira).
- NEVER claim another agent's type. The `X-Agent-Type` you send is trusted
  only because this call carries the service token; spoofing = access violation.

## Auth

- Dashboard REST: `X-Service-Token: $COLLAB_SERVICE_TOKEN` + your
  `X-Agent-Type: <your-type>`. Base: `$DASHBOARD_URL` (production
  `https://dashboard.aivory.id`, local `http://localhost:9001`).
- Realtime WS: `wss://aivory.uk/yjs/workspace:db:<docId>?token=$COLLAB_SERVICE_TOKEN&agent=<your-type>`
  (local: `ws://localhost:3200/...`). `?agent=` is honored only with the
  service token. Viewer grants receive broadcasts but their updates are
  dropped server-side.

## Endpoints (doc id = bare id, e.g. `doc-abc123`)

- `GET /api/workspace/<id>/database` → `{ id, rows[] }`. Rows:
  `{ id, title, status, priority, assignee, due }`.
  `status ∈ {Todo, Doing, Done}`, `priority ∈ {Low, Med, High}`,
  `assignee` is free text or an agent type, `due` is `YYYY-MM-DD` or `""`.
- `POST /api/workspace/<id>/database`
  `{ title, status, priority, assignee, due }` → `201 { id, row }`.
  Set `assignee` to your own type to claim a task.
- Page text: `GET /api/workspace/<id>/doc` (octet-stream, informational).
- Invites are managed by the doc owner in the dashboard (Share → Agents tab);
  you cannot invite yourself.

## Response rules

1. Before writing, GET the database and base your edits on current rows.
2. Keep writes small and deliberate: one row per POST, at most ~1 write / 2s.
   Prefer fewer, complete rows over chatty updates.
3. `403` on read = no access: report it, do not retry. `403` on write =
   viewer grant or revoked: report it, do not retry.
4. Activity logging is automatic server-side (`actor_type=agent`); do not
   duplicate it in row text.
5. Summarize what you changed (row ids + titles) in under 5 sentences.
