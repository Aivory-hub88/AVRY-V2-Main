-- Test-only copy of the aivory_ops tables kpi_snapshot reads. Column names and
-- types were read from production's information_schema on 2026-11-09 (schema
-- only, no data); leads columns are from migrations/2026-08-30-leads-deal-value.sql
-- plus the columns leads-qualifier.mjs selects. Constraints are trimmed to what
-- the queries depend on. NEVER run this against a real database: the integration
-- test refuses any database whose name does not contain "test".
DROP SCHEMA IF EXISTS aivory_ops CASCADE;
CREATE SCHEMA aivory_ops;

CREATE TABLE aivory_ops.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  name text NOT NULL,
  company text DEFAULT '',
  email text DEFAULT '',
  stage text NOT NULL DEFAULT 'new',
  amount numeric(14,2),
  currency text,
  expected_close_date date,
  owner text,
  probability smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_amount_currency_together CHECK ((amount IS NULL) = (currency IS NULL))
);

CREATE TABLE aivory_ops.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  customer_name text NOT NULL,
  customer_email text,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'USD',
  total_amount numeric,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE aivory_ops.invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES aivory_ops.invoices(id),
  tenant_id text NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE aivory_ops.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  subject text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
