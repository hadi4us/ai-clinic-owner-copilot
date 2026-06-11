# 09. Deployment Plan

## Deployment Principles

1. Start simple with Google Apps Script + Google Spreadsheet.
2. Keep tenant isolation from the beginning.
3. Prefer repeatable deployment steps.
4. Never deploy without test data validation.
5. Keep migration path toward SaaS warehouse/backend.

## Environments

### 1. Development

Purpose:

- build features.
- test calculations.
- use fixture data.

Components:

- dev Apps Script project.
- dev Spreadsheet.
- test Telegram/WhatsApp recipients.

### 2. Staging

Purpose:

- production-like validation.
- tenant isolation tests.
- user acceptance testing.

Components:

- staging Apps Script project.
- staging Spreadsheet per tenant or isolated tenant tabs.
- test MCP endpoint.

### 3. Production

Purpose:

- live clinic owner usage.

Components:

- production Apps Script project.
- production tenant spreadsheets.
- production notification config.
- production MCP tool endpoint.

## Recommended MVP Tenant Deployment

Use one spreadsheet per tenant:

```text
Tenant A Spreadsheet
Tenant B Spreadsheet
Tenant C Spreadsheet
```

Maintain a central tenant registry:

```text
Master SaaS Registry Spreadsheet
- tenant_id
- spreadsheet_id
- status
- integration config
- notification config reference
```

This balances simplicity and isolation.

## Apps Script Deployment Steps

1. Create Google Apps Script project.
2. Link to tenant or SaaS registry spreadsheet.
3. Configure `appsscript.json` scopes.
4. Store secrets in Apps Script PropertiesService:
   - MCP API token.
   - Telegram token if applicable.
   - WhatsApp integration token if applicable.
   - tenant config references.
5. Deploy as Web App.
6. Set access policy based on auth model.
7. Register Web App URL in MCP/OpenClaw config.
8. Run smoke tests.

## Spreadsheet Setup Steps

For each tenant:

1. Create tenant warehouse spreadsheet.
2. Create required sheets:
   - `cfg_*`
   - `raw_*`
   - `stg_*`
   - `dim_*`
   - `fact_*`
   - `metric_*`
   - `log_*`
3. Apply header rows and protected ranges.
4. Restrict sharing.
5. Add tenant to SaaS registry.
6. Run fixture import.
7. Validate metrics.

## Scheduled Jobs

Use Apps Script triggers:

| Trigger | Frequency | Purpose |
|---|---|---|
| syncFromIntegrationSources | hourly/daily | Pull/import SIM Klinik data |
| computeMetrics | after sync + scheduled | Refresh metrics |
| generateDailySummary | daily | Prepare executive summary |
| sendDailySummary | daily | Send Telegram/WhatsApp summary |
| dataQualityCheck | daily | Validate mappings and anomalies |

## Deployment Phases

### Phase 0 — Design & Architecture

Current phase.

Deliverables:

- architecture.
- folder structure.
- data model.
- MCP design.
- API spec.
- wireframe.
- security design.
- test plan.
- deployment plan.

### Phase 1 — Data Warehouse, KPI Engine, Finance Dashboard

Deliverables:

- spreadsheet schema.
- import from CSV/XLSX.
- raw/staging/fact/metric pipeline.
- KPI engine.
- finance dashboard.
- profit summary.
- mobile dashboard skeleton.

### Phase 2 — BPJS Dashboard, Pharmacy Dashboard

Deliverables:

- BPJS receivable summary.
- BPJS aging dashboard.
- inventory risk summary.
- pharmacy dashboard.
- data quality checks for BPJS and inventory.

### Phase 3 — Telegram Integration, AI Insight

Deliverables:

- Telegram integration.
- scheduled daily summary.
- alert rules.
- AI insight generation from precomputed metrics.
- executive briefing data generation.

### Phase 4 — OpenClaw Agent, Business Intelligence Chat

Deliverables:

- MCP tool schema.
- Apps Script AI Tool API.
- OpenClaw tool integration.
- Finance Agent, BPJS Agent, Pharmacy Agent, Executive Agent.
- owner Q&A for top questions.
- business intelligence chat.

### Phase 5 — Multi-Tenant SaaS, Billing, Subscription

Deliverables:

- tenant registry and onboarding workflow.
- role management.
- audit dashboard.
- SaaS billing.
- subscription management.
- backup/restore.
- migration planning to BigQuery/Cloud SQL if needed.

### Phase 6 — API Connectors, Marketplace Integrations, Forecasting Engine

Deliverables:

- SIM vendor API connectors.
- marketplace integrations.
- automated connector health checks.
- forecasting engine.

## Multi-Tenant Note

Although full SaaS multi-tenancy, billing, and subscription are Phase 5, `tenant_id` scoping is mandatory from Phase 1 for every sheet, query, dashboard, API, MCP tool, agent, and report.

## Rollback Plan

Because this system does not mutate SIM Klinik, rollback is simpler:

1. Disable Apps Script triggers.
2. Disable Web App deployment or revert version.
3. Stop notifications.
4. Preserve spreadsheets for audit.
5. Restore previous Apps Script version.
6. Recompute metrics from raw data if needed.

## Backup Plan

- Spreadsheet backup daily during MVP.
- Keep raw imports unchanged.
- Export Apps Script project to repository regularly.
- Keep versioned mapping templates.
- Store deployment notes per release.

## Monitoring Plan

MVP monitoring sources:

- `log_sync` sheet.
- `log_audit` sheet.
- `log_error` sheet.
- Apps Script executions dashboard.
- notification delivery logs.

Monitor:

- failed sync.
- failed metric calculation.
- dashboard errors.
- MCP tool failures.
- notification failures.
- data quality warnings.

## Release Checklist

Before each release:

- [ ] Docs updated.
- [ ] Spreadsheet schema migration documented.
- [ ] Test fixtures pass.
- [ ] Tenant isolation checked.
- [ ] Dashboard smoke test passed on mobile.
- [ ] AI top questions tested.
- [ ] Notification test sent to verified recipient.
- [ ] Rollback version identified.

## Production Readiness Criteria

Minimum for first pilot tenant:

- one tenant spreadsheet secured.
- import pipeline works from their SIM export.
- profit summary calculation validated manually.
- BPJS receivable validated manually.
- inventory risk validated manually.
- owner dashboard works on mobile.
- AI answers at least these questions:
  - Berapa laba saya?
  - Mengapa laba turun?
  - Dokter mana paling menguntungkan?
  - Berapa piutang BPJS saya?
  - Obat apa yang berpotensi rugi?
- daily Telegram summary works.
- data quality caveats visible.
