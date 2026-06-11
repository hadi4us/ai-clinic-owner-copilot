# Google Apps Script Architecture

## Purpose

Dokumen ini mendesain arsitektur teknis Google Apps Script untuk **AI Clinic CFO Copilot / AI Clinic Owner Copilot**.

Scope dokumen ini adalah desain sistem, bukan implementasi kode.

Google Apps Script berperan sebagai backend MVP yang menghubungkan:

```text
SIM Klinik export / source files
        ↓
Google Apps Script backend
        ↓
Google Spreadsheet Data Warehouse
        ↓
KPI Engine + Data Quality Engine
        ↓
HTML Service Dashboard / API / MCP tools
```

Dokumen ini mengikuti prinsip utama dari `CLAW.md`:

1. Tidak membangun SIM Klinik.
2. Tidak membuat double entry.
3. SIM Klinik tetap source of truth.
4. Connector ke SIM Klinik hanya read-only.
5. Semua data/query/API/dashboard/MCP wajib scoped dengan `tenant_id`.
6. Dashboard dan AI tidak boleh menghasilkan angka finance yang tidak bisa ditelusuri ke jurnal/source valid.
7. Jika data belum auditable, finance metric harus diberi status `estimated` atau `incomplete`.

---

## 1. Architectural Role of Google Apps Script

Google Apps Script menjadi **MVP backend runtime** untuk Phase 1.

Peran utamanya:

- Spreadsheet setup and schema validation.
- Import orchestration dari CSV/XLSX/Drive file.
- Mapping source export ke canonical staging format.
- Validation and data quality checks.
- Fact building.
- Accounting/source traceability enforcement.
- KPI computation.
- Dashboard data service.
- API-like endpoint via `doGet` / `doPost`.
- Scheduled jobs via Apps Script triggers.
- Audit logging.

Google Apps Script **tidak** berperan sebagai:

- SIM Klinik replacement.
- Full transactional accounting system.
- EMR/medical data processor.
- Long-term high-volume warehouse.
- Public unrestricted API gateway.

---

## 2. High-Level GAS Architecture

```text
┌───────────────────────────────────────────────┐
│                External Sources               │
│  SIM Klinik CSV/XLSX/API, finance export       │
└───────────────────────┬───────────────────────┘
                        │ read-only
                        ▼
┌───────────────────────────────────────────────┐
│              GAS Integration Layer             │
│ ImportController, FileReader, SourceDetector   │
└───────────────────────┬───────────────────────┘
                        ▼
┌───────────────────────────────────────────────┐
│              Spreadsheet Warehouse             │
│ raw_* → stg_* → fact_* → journal/trace → metric_* │
└───────────────────────┬───────────────────────┘
                        ▼
┌───────────────────────────────────────────────┐
│                GAS Analytics Layer             │
│ KPIEngine, DataQualityEngine, Traceability     │
└───────────────────────┬───────────────────────┘
                        ▼
┌───────────────────────────────────────────────┐
│                 GAS API Layer                  │
│ DashboardService, ApiRouter, McpToolService    │
└─────────────┬───────────────────────┬─────────┘
              ▼                       ▼
┌─────────────────────┐     ┌─────────────────────┐
│ HTML Service         │     │ OpenClaw / MCP       │
│ Mobile Dashboard     │     │ AI tool calls        │
└─────────────────────┘     └─────────────────────┘
```

---

## 3. Core Design Principles

### 3.1 Tenant Context First

Every protected operation must resolve a verified tenant context before reading or writing data.

Conceptual context:

```json
{
  "tenant_id": "klinik_001",
  "actor_id": "user_001",
  "role": "owner",
  "clinic_scope": ["clinic_001"],
  "timezone": "Asia/Jakarta",
  "currency": "IDR"
}
```

Rules:

- `tenant_id` must not be trusted from arbitrary query parameters.
- `tenant_id` must come from authenticated user/session/config mapping.
- Every service receives `tenantContext`, not loose `tenant_id` strings where avoidable.
- Every sheet read/write must include tenant filtering unless the sheet is explicitly global.

### 3.2 Metrics Over Raw Data

Dashboard and AI should read from approved metric outputs, not raw source rows.

Allowed for dashboard:

- `metric_monthly_summary`
- `metric_daily_summary`
- `metric_finance_breakdown`
- `metric_growth_trend`
- `metric_profit_change_driver`
- `metric_data_quality`

Not allowed for dashboard direct access:

- `raw_*`
- unrestricted `stg_*`
- unrestricted patient or medical data.

### 3.3 Accounting Traceability

All financial metrics must be traceable.

Minimum trace fields for financial facts:

- `tenant_id`
- `clinic_id`
- `period`
- `sync_id`
- `source_id`
- `source_row_id`
- `journal_entry_id` or `trace_status`
- `data_status`

If journal/source trace is incomplete:

- metric may still be computed as management estimate.
- dashboard must show `estimated` or `incomplete`.
- AI must include caveat.

### 3.4 Read-Only Integration

Integration with SIM Klinik must be read-only.

Allowed:

- read export file.
- read API response.
- read spreadsheet/file uploaded by staff.
- import data into AI Clinic CFO warehouse.

Not allowed:

- writeback to SIM Klinik.
- edit SIM Klinik transaction.
- override source-of-truth data.

### 3.5 Mobile-First and Owner-First

GAS backend should optimize for owner dashboard speed.

Implications:

- Precompute metrics.
- Avoid heavy calculation during dashboard load.
- Dashboard calls should return compact payloads.
- Target dashboard summary load: under 3 seconds for MVP dataset.
- Target AI metric answer: under 10 seconds.

---

## 4. Recommended GAS Module Structure

Active Apps Script source remains under:

```text
gas/src/
```

Recommended logical modules:

```text
gas/src/
├── appsscript.json
├── Config.js
├── Constants.js                    # optional future module
├── Api.js
├── Router.js                       # optional future module
├── AuthService.js                  # recommended
├── TenantContextService.js         # recommended
├── SpreadsheetService.js
├── Schema.js
├── Setup.js
├── ImportController.js             # recommended
├── FileReaderService.js            # recommended
├── MappingService.js               # recommended
├── ValidationService.js            # recommended
├── FactBuilder.js                  # recommended
├── AccountingTraceService.js       # recommended
├── KpiEngine.js
├── DataQualityService.js           # recommended
├── DashboardService.js
├── McpToolService.js               # recommended future module
├── AuditLogService.js              # recommended
├── TriggerService.js               # recommended
├── Tests.js
├── Fixture.js
├── Utils.js
├── Dashboard.html
└── Kode.js
```

Current files do not need to be renamed immediately. This is the target modular design.

---

## 5. Module Responsibilities

### 5.1 `Config.js`

Purpose:

- Central configuration values.
- Spreadsheet ID registry for current deployment.
- Environment flags.
- Default tenant/clinic for fixture only.
- Feature flags.

Design rules:

- Do not store secrets directly in source code.
- Secrets should use Apps Script `PropertiesService`.
- Config must distinguish dev/staging/production.

Recommended configuration groups:

- `APP_ENV`
- `SPREADSHEET_ID`
- `DEFAULT_TIMEZONE`
- `DEFAULT_CURRENCY`
- `FEATURE_FLAGS`
- `MCP_TOKEN_PROPERTY_KEY`
- `TELEGRAM_TOKEN_PROPERTY_KEY` future only.

### 5.2 `AuthService.js`

Purpose:

- Resolve current Google user.
- Validate user identity.
- Map user email/ID to tenant and role.
- Reject unauthorized access.

Conceptual responsibilities:

- `getCurrentActor()`
- `requireAuthenticatedActor()`
- `hasRole(actor, requiredRoles)`
- `canAccessClinic(actor, tenantId, clinicId)`

Data source:

- `cfg_user` recommended.
- `cfg_user_tenant_role` recommended.
- For MVP, a simple config sheet may be enough.

### 5.3 `TenantContextService.js`

Purpose:

- Build verified tenant context.
- Prevent user-supplied tenant spoofing.
- Apply clinic scope.

Rules:

- Dashboard/API functions should use resolved context.
- `tenant_id` in request should be treated as a filter request, not authority.
- If user belongs to multiple tenants, UI must explicitly choose allowed tenant.

### 5.4 `SpreadsheetService.js`

Purpose:

- Generic spreadsheet read/write abstraction.
- Header-based row mapping.
- Append rows.
- Replace rows by key.
- Find rows by tenant/clinic/period.
- Validate sheet existence.

Design rules:

- All sheet operations must preserve header names.
- Do not reorder columns casually.
- Use `snake_case` technical column names.
- Reads should filter by `tenant_id` early.

### 5.5 `Schema.js`

Purpose:

- Define sheet names.
- Define required headers.
- Define required columns and optional columns.
- Support schema validation.

Must include future accounting traceability fields once approved:

- `journal_entry`
- `journal_line`
- `cfg_coa`
- trace fields in financial fact/metric sheets.

### 5.6 `Setup.js`

Purpose:

- Create required sheets.
- Apply header rows.
- Seed fixture/default config.
- Run schema validation.

Design rules:

- Must preserve existing rows by default.
- Must not silently delete tenant data.
- Destructive reset should be explicit and limited to fixture/test mode.

### 5.7 `ImportController.js`

Purpose:

- Orchestrate import from SIM Klinik export or prepared source files.
- Assign `sync_id`.
- Write raw rows.
- Trigger mapping/validation/fact build.
- Log sync result.

Responsibilities:

- Validate source config.
- Determine source type: visit/revenue/expense/payment.
- Validate file metadata.
- Call file reader.
- Store raw payload.
- Create `log_sync` entry.

### 5.8 `FileReaderService.js`

Purpose:

- Read CSV/XLSX/Google Sheet files from Drive.
- Normalize rows into raw payloads.

Design rules:

- File reading must not mutate source file.
- Sensitive fields should be minimized or redacted where possible.
- Large files should be processed in chunks if Apps Script limits are reached.

### 5.9 `MappingService.js`

Purpose:

- Convert vendor/source columns into canonical staging columns using `cfg_mapping_template`.
- Apply transform functions.
- Preserve mapping template version.

Example mapping:

```text
Tanggal Transaksi → transaction_date
Nominal           → amount
Jenis Layanan     → revenue_category
```

Design rules:

- Missing required columns create validation errors.
- Unknown columns may stay in raw payload but should not become facts automatically.
- Mapping changes must be versioned.

### 5.10 `ValidationService.js`

Purpose:

- Validate staging rows before fact build.

Validation categories:

- required field missing.
- invalid date.
- invalid amount.
- invalid enum.
- duplicate source row.
- missing tenant/clinic.
- cross-tenant mismatch.
- missing COA mapping.
- missing source/journal trace.

Outputs:

- valid staging rows.
- warning rows.
- rejected rows.
- `metric_data_quality` warnings.

### 5.11 `FactBuilder.js`

Purpose:

- Build normalized fact tables from staging.
- Generate stable normalized IDs.
- Deduplicate source rows.
- Link dimensions.

Fact targets:

- `fact_visit`
- `fact_revenue`
- `fact_cost`
- `fact_expense`

Rules:

- Never create unscoped fact rows.
- Preserve `sync_id` and `source_row_id`.
- Finance facts should carry accounting/source trace fields.

### 5.12 `AccountingTraceService.js`

Purpose:

- Enforce accounting traceability rule.
- Link finance facts to source rows or journal rows.
- Determine whether metrics are `complete`, `estimated`, or `incomplete`.

Recommended responsibilities:

- Validate finance facts have source references.
- Validate journal entry/line completeness when journal layer exists.
- Build metric lineage summary.
- Produce data quality warnings for missing trace.

Recommended future sheets:

- `cfg_coa`
- `journal_entry`
- `journal_line`
- `finance_trace_map`

### 5.13 `KpiEngine.js`

Purpose:

- Compute approved finance and operational KPIs.
- Write precomputed `metric_*` rows.

Phase 1 KPIs:

- `total_visits`
- `total_revenue`
- `direct_cost`
- `operating_expense`
- `gross_profit`
- `net_profit`
- `profit_margin`
- growth metrics.
- finance breakdown.

Rules:

- KPI computation must filter by `tenant_id`, `clinic_id`, and period.
- KPI computation must not read raw sheets directly except in test/diagnostic mode.
- Finance KPI result must include `data_status`.

### 5.14 `DataQualityService.js`

Purpose:

- Generate, update, and resolve data quality warnings.

Warning categories:

- missing direct cost.
- missing operating expense.
- missing source trace.
- missing journal trace.
- invalid amount.
- invalid date.
- duplicate row.
- unmapped revenue/cost/expense category.
- missing doctor/poli mapping.

Outputs:

- `metric_data_quality` rows.
- dashboard warning payload.
- AI caveat payload.

### 5.15 `DashboardService.js`

Purpose:

- Build dashboard payload from metric sheets.
- Provide compact mobile-first response.
- Hide raw spreadsheet details.

Rules:

- Dashboard reads `metric_*` only.
- Dashboard must show `data_status`.
- Dashboard must show period and clinic context.
- Dashboard must convert technical keys into user-facing labels.

### 5.16 `McpToolService.js`

Purpose:

- Serve approved MCP tool calls for OpenClaw/AI layer.
- Enforce stricter authorization.
- Return grounded metric data only.

Rules:

- No raw sheet access tool.
- All tool calls audited.
- All tool responses include data status and caveats.
- Tool timeout target under 10 seconds.

### 5.17 `AuditLogService.js`

Purpose:

- Record sensitive events.

Events to audit:

- dashboard view.
- metric API access.
- MCP tool call.
- import trigger.
- failed auth.
- cross-tenant access attempt.
- notification send future.

Audit target:

- `log_audit`.

### 5.18 `TriggerService.js`

Purpose:

- Manage scheduled jobs and safe trigger entry points.

Trigger categories:

- scheduled import.
- scheduled metric computation.
- data quality check.
- daily executive summary future.

Rules:

- Triggers must run tenant-scoped.
- Triggers must log failures.
- Triggers must not send external notifications unless configured and verified.

### 5.19 `Tests.js` and `Fixture.js`

Purpose:

- Provide smoke tests and synthetic fixture validation.
- Verify schema and KPI expected results.

Required test coverage:

- schema exists.
- fixture load.
- KPI expected values.
- date parsing.
- tenant filtering.
- data status rules.
- traceability warnings.

---

## 6. Spreadsheet Architecture

### 6.1 MVP Sheet Layers

```text
cfg_*       configuration and tenant settings
raw_*       imported SIM/export source rows
stg_*       mapped and validated canonical rows
dim_*       normalized reference entities
fact_*      normalized business facts
journal_*   accounting journal layer, recommended for traceability
metric_*    dashboard/API-ready aggregated metrics
log_*       sync/audit/error logs
```

### 6.2 Recommended MVP Accounting Additions

Because `CLAW.md` requires accounting traceability, Phase 1 design should include at least one of these approaches.

#### Preferred: Journal Layer

```text
cfg_coa
journal_entry
journal_line
finance_trace_map
```

Use this if source data can be mapped into accounting-style journals.

#### Minimum Acceptable: Source Trace Layer

```text
finance_trace_map
```

Use this if real journal entry data is not available yet. In this case, finance metrics must often be `estimated`, not final accounting reports.

### 6.3 Data Status Model

`data_status` values:

| Status | Meaning |
|---|---|
| `complete` | Required source/journal trace exists and key finance components are complete. |
| `estimated` | Metric is usable for management insight, but one or more cost/allocation/journal components are estimated. |
| `incomplete` | Metric should not be treated as reliable because required source data is missing. |

---

## 7. GAS Entry Points

### 7.1 Web Dashboard

Entry point:

```text
doGet(e)
```

Responsibilities:

- Render `Dashboard.html`.
- Optionally handle health check route.
- Resolve user context where possible.
- Avoid exposing raw data in HTML.

### 7.2 API-like GET Routes

Entry point:

```text
doGet(e)
```

Use cases:

- health check.
- dashboard JSON payload.
- sync status read.

### 7.3 API-like POST Routes

Entry point:

```text
doPost(e)
```

Use cases:

- MCP tool call.
- import trigger from approved source.
- future notification webhook.

### 7.4 HTML Service Internal Calls

Mechanism:

```text
google.script.run
```

Use cases:

- `getDashboardPayload`
- `getFinanceSummary`
- `getDataQualityWarnings`

Design rule:

- These functions must still enforce authorization and tenant scope.

### 7.5 Scheduled Triggers

Use Apps Script triggers for:

- periodic sync.
- metric recomputation.
- data quality scan.
- daily summary preparation future.

---

## 8. Request Lifecycle

### 8.1 Dashboard Load Lifecycle

```text
Owner opens Web App
        ↓
doGet renders Dashboard.html
        ↓
Dashboard calls getDashboardPayload
        ↓
AuthService resolves actor
        ↓
TenantContextService resolves tenant/clinic scope
        ↓
DashboardService reads metric_* sheets
        ↓
DataQualityService attaches warnings
        ↓
AuditLogService logs dashboard view
        ↓
Dashboard renders KPI cards/charts/warnings
```

### 8.2 Import Lifecycle

```text
Staff/manager provides SIM export file
        ↓
ImportController validates source config
        ↓
FileReaderService reads file read-only
        ↓
Raw rows written to raw_* with sync_id
        ↓
MappingService maps raw payload to stg_*
        ↓
ValidationService validates staging rows
        ↓
FactBuilder builds facts
        ↓
AccountingTraceService validates source/journal trace
        ↓
KpiEngine recomputes metrics
        ↓
DataQualityService writes warnings
        ↓
log_sync and log_audit updated
```

### 8.3 MCP Tool Lifecycle

```text
OpenClaw calls MCP/API tool
        ↓
ApiRouter validates token and route
        ↓
McpToolService validates tool allowlist
        ↓
TenantContextService resolves tenant context
        ↓
Metric service reads approved metric_* only
        ↓
DataQualityService attaches caveats
        ↓
AuditLogService logs tool call
        ↓
Response returned to AI with grounded data
```

---

## 9. Security Architecture

### 9.1 Authentication

MVP authentication:

- Google Login for Web App users.
- Token-based authorization for MCP/API calls if exposed externally.

Recommended user config sheets:

```text
cfg_user
cfg_user_tenant_role
```

### 9.2 Authorization

Roles:

| Role | Access |
|---|---|
| Owner | Full owner metrics, finance dashboard, AI insights. |
| Manager | Operational metrics and import status; finance access configurable. |
| Staff | Import/status only; no owner finance by default. |
| System | Scheduled jobs and internal service operations. |

### 9.3 Tenant Isolation

Rules:

- Every query must filter by `tenant_id`.
- Clinic access must filter by allowed `clinic_scope`.
- Cross-tenant request must return `FORBIDDEN`.
- Cross-tenant attempt must be logged.

### 9.4 Sensitive Data Minimization

Rules:

- Avoid patient name, diagnosis, medical notes.
- Use hashed/pseudonymous `patient_ref` only if required.
- AI tools must not expose patient-level data.
- Raw payload should be protected and not used for dashboard display.

---

## 10. Performance Architecture

### 10.1 Dashboard Performance

Target:

- dashboard summary load under 3 seconds for MVP dataset.

Approach:

- read only precomputed `metric_*` rows.
- avoid calculation during dashboard rendering.
- cache small payloads where safe.
- use period/tenant/clinic indexed lookups conceptually.

### 10.2 Apps Script Limits

Potential constraints:

- execution time limit.
- spreadsheet read/write quota.
- trigger quota.
- URL fetch quota if future API connectors used.

Mitigations:

- batch reads/writes.
- process imports in chunks.
- precompute metrics after sync.
- keep one spreadsheet per tenant for MVP.
- avoid scanning all tenants in one execution.

---

## 11. Error Handling and Logging

### 11.1 Error Categories

| Category | Example | Handling |
|---|---|---|
| Auth error | unknown user | return `UNAUTHORIZED`, log audit. |
| Authorization error | cross-tenant request | return `FORBIDDEN`, log audit. |
| Schema error | missing sheet/header | return setup/schema warning. |
| Import error | invalid file | log sync failed. |
| Validation error | invalid date/amount | reject row or warning. |
| Data quality error | missing direct cost | metric warning + status estimated/incomplete. |
| Traceability error | missing journal/source trace | metric warning + status estimated/incomplete. |

### 11.2 Logs

Required logs:

- `log_sync`
- `log_audit`

Recommended future logs:

- `log_error`
- `log_api_request`
- `log_metric_run`

---

## 12. Deployment Architecture

### 12.1 Environment Model

Recommended environments:

```text
Development
Staging
Production
```

Each environment should have:

- Apps Script project.
- Spreadsheet warehouse.
- deployment URL.
- config properties.
- test fixtures.

### 12.2 Tenant Deployment Model

Recommended MVP:

```text
one spreadsheet per tenant
```

Benefits:

- stronger isolation.
- easier manual audit.
- easier pilot setup.
- smaller spreadsheet size.

Still required:

- every row must keep `tenant_id`.
- every API response must include tenant metadata.

### 12.3 Secrets

Secrets must not be stored in source code.

Use Apps Script `PropertiesService` for:

- MCP API token.
- notification tokens future.
- external connector credentials future.

---

## 13. Test Architecture

Required tests:

1. Schema validation.
2. Fixture setup.
3. KPI expected value verification.
4. Date parsing.
5. Duplicate import prevention.
6. Tenant isolation.
7. Role authorization.
8. Data quality status.
9. Accounting/source traceability.
10. Dashboard payload shape.
11. MCP tool response shape future.

Smoke test expected from Phase 1 fixture:

```text
total_visits = 5
total_revenue = 1,950,000
direct_cost = 660,000
operating_expense = 1,750,000
gross_profit = 1,290,000
net_profit = -460,000
profit_margin ≈ -0.2359
data_status = complete only if traceability rules pass
```

---

## 14. Migration Path Beyond GAS

Google Apps Script is acceptable for Phase 1 and pilot, but the architecture should allow later migration.

Potential future stack:

```text
Google Apps Script MVP
        ↓
Cloud Run / Node.js backend
        ↓
BigQuery or Cloud SQL warehouse
        ↓
Dedicated API Gateway
        ↓
OpenClaw MCP / Dashboard / Notifications
```

Design decisions that support migration:

- stable sheet/table names.
- stable English `snake_case` columns.
- explicit API contracts.
- metric-first dashboard.
- tenant-scoped context.
- audit logs.
- source/journal traceability.

---

## 15. Design Verdict

Google Apps Script is a good backend choice for MVP because it is fast to deploy, close to Google Spreadsheet, and suitable for early clinic owner validation.

However, production readiness depends on four hardening areas:

1. verified tenant context.
2. accounting/source traceability.
3. data quality status enforcement.
4. repeatable deployment and testing.

Recommended Phase 1 backend priority:

```text
Schema + Tenant Context
        ↓
Import + Mapping + Validation
        ↓
Fact + Accounting Trace
        ↓
KPI Engine + Data Quality
        ↓
Dashboard Service
        ↓
MCP Tool Service preparation
```

Do not expand to BPJS, Pharmacy, Telegram, WhatsApp, or full AI chat until the finance foundation is reliable and traceable.
