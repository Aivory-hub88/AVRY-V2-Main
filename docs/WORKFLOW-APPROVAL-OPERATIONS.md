# Workflow Approval Operations

## Safe fallback (current)

Exception approval does **not** create an n8n Wait node yet. It sends a native
Slack notification and writes these fields into the current item:

```json
{
  "exception_status": "awaiting_manual_approval",
  "approval_required": true
}
```

## Reviewer visibility without callback infrastructure

Until the resume callback is deployed, reviewers can find pending cases in the
n8n UI:

1. Open the workflow in n8n.
2. Open **Executions**.
3. Filter by the workflow and inspect the latest successful execution.
4. Open the node output for `Set exception status to awaiting_manual_approval`.
5. Filter the item JSON for `exception_status === "awaiting_manual_approval"`.

For an API-based check, use the n8n API with a read-only API key:

```bash
curl -sS \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_BASE_URL/api/v1/executions?workflowId=$WORKFLOW_ID&includeData=true" \
| jq '.data[] | select(.status == "success") | {id, startedAt, stoppedAt, status}'
```

Then inspect the execution detail returned for the node named
`Set exception status to awaiting_manual_approval` and confirm:

```text
exception_status = awaiting_manual_approval
approval_required = true
```

This is an audit query only. It does not approve, reject, or resume anything.

## Callback prerequisite

The Wait/resume pattern must not be re-enabled until all of these exist:

- a persisted approval-case record linked to workflow and execution IDs;
- the n8n execution-specific resume URL captured securely;
- an authenticated approve/reject endpoint;
- a reviewer UI or API client that submits the decision;
- an execution-level regression proving the workflow resumes and reaches its
  downstream node after approval.
