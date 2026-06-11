# Workflows

## Purpose

Dokumen ini mendesain workflow sistem untuk **AI Clinic CFO Copilot / AI Clinic Owner Copilot**.

Scope dokumen ini adalah desain sistem, bukan implementasi kode.

Workflow berfokus pada Phase 1 dan foundation menuju phase berikutnya:

1. Spreadsheet Data Warehouse.
2. KPI Engine.
3. Finance Dashboard.
4. Data Quality.
5. Accounting Traceability.
6. Future MCP/OpenClaw AI tools.

Prinsip utama:

- Tidak membuat SIM Klinik.
- Tidak membuat double entry.
- SIM Klinik tetap source of truth.
- Connector hanya read-only.
- Semua proses wajib tenant-scoped.
- Angka finance harus traceable atau diberi status `estimated` / `incomplete`.

---

## 1. Workflow Overview

High-level workflow:

```text
Tenant Setup
    ↓
Source Configuration
    ↓
SIM Klinik Export Import
    ↓
Raw Data Preservation
    ↓
Mapping and Validation
    ↓
Fact Building
    ↓
Accounting / Source Traceability Check
    ↓
KPI Computation
    ↓
Data Quality Classification
    ↓
Dashboard Payload
    ↓
Owner Insight / Future AI Tool Response
```

---

## 2. Actors

| Actor | Description | Main Workflows |
|---|---|---|
| Owner | Clinic owner/business owner. | View dashboard, ask AI future, receive summary future. |
| Manager | Clinic/business manager. | Import/export coordination, operational dashboard if allowed. |
| Staff | Operational staff. | Upload/import SIM export if permitted. |
| System | Apps Script triggers/jobs. | Scheduled sync, compute metrics, data quality checks. |
| OpenClaw Agent | Future AI layer. | Read approved metrics via MCP tools. |
| Admin | Deployment/operator. | Setup tenant, configure source, manage access. |

---

## 3. Core Data Flow

```text
SIM Klinik Export / Source File
        ↓
raw_* sheets
        ↓
stg_* sheets
        ↓
fact_* sheets
        ↓
journal/source trace layer
        ↓
metric_* sheets
        ↓
Dashboard / API / AI Tools
```

Rules:

- `raw_*` preserves original source rows.
- `stg_*` stores mapped and validated canonical rows.
- `fact_*` stores normalized business facts.
- journal/source trace layer validates finance lineage.
- `metric_*` stores precomputed dashboard-ready data.
- Dashboard and AI only consume approved metric/API payloads.

---

## 4. Tenant Setup Workflow

### 4.1 Purpose

Prepare one tenant/clinic for MVP usage.

### 4.2 Trigger

Manual admin action during onboarding.

### 4.3 Preconditions

- Tenant approved for pilot/MVP.
- Google Spreadsheet warehouse exists or will be created.
- Apps Script deployment/environment is available.
- Owner/manager/staff emails known.

### 4.4 Steps

```text
Admin creates tenant record
        ↓
Admin creates/assigns tenant spreadsheet
        ↓
Setup service creates required sheets and headers
        ↓
Admin creates clinic record
        ↓
Admin creates user-role mapping
        ↓
Admin configures integration source
        ↓
Admin runs schema validation
        ↓
Admin runs fixture/smoke test if dev/staging
        ↓
Tenant is ready for source import
```

### 4.5 Data Written

- `cfg_tenant`
- `cfg_clinic`
- `cfg_integration_source`
- `cfg_mapping_template`
- recommended future:
  - `cfg_user`
  - `cfg_user_tenant_role`
  - `cfg_coa`

### 4.6 Success Criteria

- Required sheets exist.
- Required headers exist.
- Tenant has `tenant_id`.
- Clinic has `clinic_id`.
- Owner user can be resolved.
- Schema validation passes.

### 4.7 Failure Handling

| Failure | Handling |
|---|---|
| Missing sheet/header | Setup should create missing structure without deleting data. |
| Duplicate tenant ID | Reject setup and log error. |
| Missing owner mapping | Tenant remains inactive until fixed. |
| Spreadsheet access denied | Stop setup and request permission correction. |

---

## 5. Source Configuration Workflow

### 5.1 Purpose

Configure how SIM Klinik/export data maps into canonical warehouse schema.

### 5.2 Trigger

Admin/manager prepares import source.

### 5.3 Steps

```text
Identify SIM Klinik vendor/export format
        ↓
Register source in cfg_integration_source
        ↓
Choose or create mapping_template_id
        ↓
Map source columns to canonical columns
        ↓
Define transforms and required fields
        ↓
Validate mapping against sample file
        ↓
Activate source configuration
```

### 5.4 Mapping Examples

| Source Column | Target Column | Transform |
|---|---|---|
| Tanggal Transaksi | `transaction_date` | `parse_date_id` |
| Nominal | `amount` | `parse_idr_number` |
| Kode Dokter | `source_doctor_id` | none |
| Jenis Layanan | `revenue_category` | `map_revenue_category` |

### 5.5 Success Criteria

- Required canonical fields are mapped.
- Sample file can be parsed.
- Mapping template is versioned.
- Missing required fields are known before production import.

---

## 6. Import Workflow

### 6.1 Purpose

Import SIM Klinik export into the warehouse without double entry and without mutating SIM Klinik.

### 6.2 Trigger Options

- Manual staff/manager import.
- Scheduled import from Drive folder.
- Future API pull from SIM Klinik, read-only.

### 6.3 Preconditions

- Tenant context resolved.
- Actor has import permission.
- Source is active.
- File is accessible.
- Mapping template exists.

### 6.4 Steps

```text
Actor selects/imports source file
        ↓
System creates sync_id
        ↓
System validates source config
        ↓
System reads file read-only
        ↓
System writes original rows to raw_*
        ↓
System records log_sync started
        ↓
System maps raw rows to stg_*
        ↓
System validates staging rows
        ↓
System rejects invalid rows with notes
        ↓
System records rows_imported / rows_rejected / rows_duplicated
        ↓
System marks log_sync success / partial / failed
```

### 6.5 Data Written

- `raw_visit`
- `raw_revenue`
- `raw_expense`
- optional `raw_payment`
- `stg_visit`
- `stg_revenue`
- `stg_expense`
- `log_sync`
- `log_audit`

### 6.6 Deduplication Rule

Recommended dedupe key:

```text
tenant_id + clinic_id + source_id + source_row_id + source_period
```

Alternative when `source_row_id` is unavailable:

```text
tenant_id + clinic_id + source_id + hash(raw_payload) + source_period
```

### 6.7 Success Criteria

- Raw source rows preserved.
- Valid staging rows created.
- Invalid rows logged.
- Duplicate rows not double-counted.
- No writeback to SIM Klinik.

### 6.8 Failure Handling

| Failure | Handling |
|---|---|
| Invalid file type | Reject import; write `log_sync` failed. |
| Missing required source column | Reject or mark partial depending severity. |
| Invalid date/amount | Reject affected rows; create data quality warning. |
| Duplicate rows | Skip duplicates; count in `rows_duplicated`. |
| Apps Script timeout | Mark partial; resume strategy needed for larger files. |

---

## 7. Mapping and Validation Workflow

### 7.1 Purpose

Convert raw export rows into canonical staging rows with validation status.

### 7.2 Steps

```text
Read raw rows for sync_id
        ↓
Load mapping template
        ↓
For each raw row:
    map source columns
    apply transforms
    validate required fields
    validate date/amount/enum
    assign validation_status
    assign validation_notes
        ↓
Write valid/warning rows to stg_*
        ↓
Log rejected rows / warnings
```

### 7.3 Validation Status

| Status | Meaning |
|---|---|
| `valid` | Row can be used to build facts. |
| `warning` | Row can be used but has caveat. |
| `rejected` | Row must not be used for facts/metrics. |

### 7.4 Core Validation Rules

- `tenant_id` required.
- `clinic_id` required.
- `sync_id` required.
- `source_row_id` required or generated stable hash.
- date columns parse correctly.
- amount columns parse as number.
- required business category exists.
- row belongs to expected period.
- no cross-tenant mismatch.

---

## 8. Fact Building Workflow

### 8.1 Purpose

Create normalized business fact rows from staging rows.

### 8.2 Steps

```text
Read valid stg_* rows
        ↓
Resolve dimensions if available
        ↓
Generate stable fact IDs
        ↓
Check duplicate fact keys
        ↓
Write facts into fact_* sheets
        ↓
Preserve sync_id and source_row_id
        ↓
Attach initial source trace fields
```

### 8.3 Fact Outputs

- `fact_visit`
- `fact_revenue`
- `fact_cost`
- `fact_expense`

### 8.4 Success Criteria

- Every fact row has `tenant_id` and `clinic_id`.
- Every fact row has trace back to staging/source row.
- Finance facts include source/journal trace fields or trace status.
- Duplicate facts are not created.

---

## 9. Accounting Traceability Workflow

### 9.1 Purpose

Ensure financial reports can be derived from valid accounting journals/source rows, or mark them as not final.

### 9.2 Trigger

After fact build and before KPI computation.

### 9.3 Preferred Workflow with Journal Layer

```text
Read finance facts
        ↓
Map revenue/cost/expense categories to COA
        ↓
Create/validate journal_entry
        ↓
Create/validate journal_line debit/credit rows
        ↓
Check journal balance
        ↓
Link fact rows to journal lines
        ↓
Set trace_status = traceable / partially_traceable / not_traceable
        ↓
Write warnings for missing or invalid trace
```

### 9.4 Minimum MVP Workflow Without Full Journal

If valid journal data is not available yet:

```text
Read finance facts
        ↓
Validate source_row_id + sync_id + source_id exists
        ↓
Validate COA/category mapping exists
        ↓
Build finance_trace_map
        ↓
Set trace_status based on source trace completeness
        ↓
Mark metric data_status as estimated if journal is missing
```

### 9.5 Trace Status Decision

| Condition | trace_status | data_status impact |
|---|---|---|
| All finance rows linked to valid journal/source trace | `traceable` | may be `complete` |
| Some finance rows missing trace | `partially_traceable` | usually `estimated` |
| Finance rows lack source/journal trace | `not_traceable` | `estimated` or `incomplete` |
| Non-finance metric | `not_applicable` | no finance impact |

### 9.6 Required Warnings

- `missing_finance_trace`
- `missing_journal_entry`
- `unbalanced_journal_entry`
- `missing_coa_mapping`
- `missing_source_row_id`
- `missing_sync_id`

---

## 10. KPI Computation Workflow

### 10.1 Purpose

Compute owner-facing metrics from approved fact and trace data.

### 10.2 Trigger Options

- After successful import.
- Scheduled daily/monthly trigger.
- Manual admin recompute.
- Fixture smoke test.

### 10.3 Steps

```text
Receive tenant_id, clinic_id, period
        ↓
Validate tenant and clinic scope
        ↓
Read fact_visit for period
        ↓
Read fact_revenue for period
        ↓
Read fact_cost for period
        ↓
Read fact_expense for period
        ↓
Read trace/data quality state
        ↓
Calculate KPIs
        ↓
Determine data_status
        ↓
Write metric_monthly_summary
        ↓
Write metric_finance_breakdown
        ↓
Write metric_growth_trend
        ↓
Write metric_data_quality
        ↓
Log metric run
```

### 10.4 KPI Formulas

```text
total_visits = count(fact_visit where status = completed)
total_revenue = sum(fact_revenue.amount)
direct_cost = sum(fact_cost.amount)
operating_expense = sum(fact_expense.amount)
gross_profit = total_revenue - direct_cost
net_profit = total_revenue - direct_cost - operating_expense
profit_margin = net_profit / total_revenue
```

### 10.5 Data Status Decision

| Condition | data_status |
|---|---|
| Revenue, direct cost, operating expense, and required trace complete | `complete` |
| Direct cost partially missing or allocated by estimate | `estimated` |
| Operating expense missing | `incomplete` |
| Revenue missing | `incomplete` |
| Journal/source trace missing for finance rows | `estimated` or `incomplete` depending severity |

### 10.6 Success Criteria

- Metrics are written for requested tenant/clinic/period.
- Dashboard can load without raw scans.
- Data status is correct.
- Warnings are visible in `metric_data_quality`.

---

## 11. Data Quality Workflow

### 11.1 Purpose

Make data reliability visible to owner, dashboard, and AI.

### 11.2 Trigger

- During import validation.
- During fact build.
- During traceability check.
- During KPI computation.
- Scheduled daily scan.

### 11.3 Steps

```text
Collect validation issues
        ↓
Collect traceability issues
        ↓
Collect KPI completeness issues
        ↓
Classify severity
        ↓
Write/update metric_data_quality
        ↓
Attach warnings to dashboard/API payload
        ↓
AI includes caveat when answering future questions
```

### 11.4 Severity Levels

| Severity | Meaning |
|---|---|
| `low` | Minor issue, metric still reliable. |
| `medium` | Issue may affect detail metric. |
| `high` | Issue affects important KPI or interpretation. |
| `critical` | Metric should not be treated as complete. |

### 11.5 Example Rules

| Rule ID | Severity | Impact |
|---|---|---|
| `missing_direct_cost` | high | Net Profit estimated. |
| `missing_operating_expense` | critical | Net Profit incomplete. |
| `missing_finance_trace` | critical | Finance metric estimated/incomplete. |
| `invalid_amount` | high | Affected row rejected. |
| `invalid_date` | high | Affected row rejected. |
| `duplicate_source_row` | medium | Duplicate skipped. |
| `missing_doctor_mapping` | medium | Doctor profitability limited. |
| `missing_poli_mapping` | medium | Poli profitability limited. |

---

## 12. Dashboard Workflow

### 12.1 Purpose

Show owner mobile-first finance insight from precomputed metrics.

### 12.2 Trigger

Owner opens Web App dashboard.

### 12.3 Steps

```text
Owner opens dashboard URL
        ↓
Google Login/session resolves actor
        ↓
Tenant context resolved
        ↓
Dashboard HTML loads
        ↓
Frontend requests dashboard payload
        ↓
Backend reads metric_* rows only
        ↓
Backend attaches data quality warnings
        ↓
Backend logs dashboard view
        ↓
Frontend renders KPI cards, charts, breakdown, warnings
```

### 12.4 Dashboard Must Display

- Dashboard Keuangan title.
- Clinic selector if multiple clinics.
- Period selector.
- Revenue.
- Gross Profit.
- Net Profit.
- Cost.
- Margin.
- Visits.
- Finance Breakdown.
- Revenue vs Net Profit.
- Data Quality Status.
- `complete` / `estimated` / `incomplete` badge.

### 12.5 Dashboard Must Not Display

- raw patient data.
- medical diagnosis.
- unrestricted raw source rows.
- finance numbers as final if traceability fails.

### 12.6 Empty/Error States

| State | UI Behavior |
|---|---|
| No metric data | Show empty state: data belum tersedia. |
| Import in progress | Show Loading / processing state. |
| Data incomplete | Show warning badge and explanation. |
| Unauthorized | Show access denied. |
| System error | Show friendly error and suggest retry/contact admin. |

---

## 13. Owner Review Workflow

### 13.1 Purpose

Owner validates whether dashboard numbers make business sense.

### 13.2 Steps

```text
Owner opens Finance Dashboard
        ↓
Owner checks Net Profit, Revenue, Cost, Margin
        ↓
Owner checks Data Quality Status
        ↓
Owner compares with internal finance/accounting records
        ↓
If mismatch, manager/admin reviews source import and mapping
        ↓
Mapping/data quality corrected
        ↓
Metrics recomputed
```

### 13.3 Success Criteria

- Owner understands metric basis.
- Owner sees caveat if data incomplete.
- Metric discrepancy can be traced to source row/journal/mapping.

---

## 14. MCP / AI Question Workflow Future

### 14.1 Purpose

Allow OpenClaw/AI to answer owner business questions using approved metric tools only.

### 14.2 Trigger

Owner asks future AI question:

```text
“Berapa laba bulan ini?”
“Kenapa laba turun?”
“Revenue naik tapi Net Profit turun kenapa?”
```

### 14.3 Steps

```text
Owner asks AI question
        ↓
OpenClaw determines approved tool needed
        ↓
OpenClaw calls MCP tool API
        ↓
API validates token and tenant context
        ↓
MCP service reads metric_* only
        ↓
Data quality caveats attached
        ↓
Audit log written
        ↓
AI generates answer with period, basis, caveat, next action
```

### 14.4 AI Answer Must Include

- Direct answer.
- Period.
- Clinic scope.
- Metric basis.
- Data status.
- Caveat if `estimated` or `incomplete`.
- Recommended next action.

### 14.5 AI Must Not

- invent finance numbers.
- read raw unrestricted sheets.
- expose patient-sensitive data.
- present estimated numbers as final accounting reports.
- mutate SIM Klinik.

---

## 15. Scheduled Jobs Workflow

### 15.1 Purpose

Automate recurring backend tasks safely.

### 15.2 Recommended Triggers

| Trigger | Frequency | Purpose |
|---|---|---|
| `syncFromIntegrationSources` | hourly/daily | Import source data if configured. |
| `computeMetrics` | after sync + scheduled | Refresh KPI metrics. |
| `dataQualityCheck` | daily | Scan warnings and completeness. |
| `generateDailySummary` | future daily | Prepare executive summary. |
| `sendDailySummary` | future daily | Send Telegram/WhatsApp summary. |

### 15.3 Scheduled Sync Steps

```text
Trigger starts
        ↓
Load active tenants/sources
        ↓
For each tenant/source within execution budget:
    resolve system tenant context
    import new source files read-only
    map and validate rows
    build facts
    check traceability
    compute metrics
    update logs
        ↓
If remaining tenants exceed time budget, schedule/resume later
```

### 15.4 Safety Rules

- Scheduled jobs must be tenant-scoped.
- Jobs must not process all tenants blindly if time limit risk is high.
- Jobs must log partial/failed status.
- External notifications future must only send to verified recipients.

---

## 16. Deployment Workflow

### 16.1 Purpose

Deploy Apps Script and spreadsheet changes safely.

### 16.2 Steps

```text
Update docs/schema/design
        ↓
Apply Apps Script source changes when approved
        ↓
Run local/static inspection if available
        ↓
Push to Apps Script with clasp
        ↓
Run setup/schema validation
        ↓
Run fixture smoke test
        ↓
Deploy/redeploy Web App
        ↓
Open health endpoint
        ↓
Open dashboard on mobile
        ↓
Record deployment notes
```

### 16.3 Release Checklist

- [ ] Docs updated.
- [ ] Schema migration documented.
- [ ] Setup validation passed.
- [ ] Fixture smoke test passed.
- [ ] Tenant isolation checked.
- [ ] Dashboard mobile smoke test passed.
- [ ] Data quality warning tested.
- [ ] Traceability status tested.
- [ ] Rollback version identified.

---

## 17. Schema Migration Workflow

### 17.1 Purpose

Change spreadsheet schema safely without data loss.

### 17.2 Steps

```text
Document schema change
        ↓
Classify migration as additive or breaking
        ↓
Backup spreadsheet
        ↓
Add new sheets/columns without deleting old data
        ↓
Backfill if needed
        ↓
Run schema validation
        ↓
Run KPI smoke test
        ↓
Update docs and release notes
```

### 17.3 Rules

- Prefer additive changes.
- Do not delete columns with production data without explicit approval.
- Preserve header names used by Apps Script.
- Update mapping templates and tests with schema changes.

---

## 18. Incident Workflow

### 18.1 Dashboard Broken

```text
Owner reports dashboard error
        ↓
Check health endpoint
        ↓
Check Apps Script execution logs
        ↓
Check schema validation
        ↓
Check metric rows for tenant/period
        ↓
Check data quality warnings
        ↓
Fix config/schema/data issue
        ↓
Recompute metrics if needed
        ↓
Verify dashboard
```

### 18.2 Wrong Finance Number

```text
Owner reports number mismatch
        ↓
Identify tenant/clinic/period/metric
        ↓
Check metric_monthly_summary
        ↓
Trace metric to fact rows
        ↓
Trace fact rows to source_row_id/sync_id/journal
        ↓
Check mapping/COA/allocation rule
        ↓
Correct mapping/source issue
        ↓
Recompute metrics
        ↓
Mark data_status if unresolved
```

### 18.3 Cross-Tenant Access Attempt

```text
System detects forbidden tenant/clinic request
        ↓
Reject request with FORBIDDEN
        ↓
Write log_audit
        ↓
Review actor/session mapping
        ↓
Fix role/config if misconfigured
```

---

## 19. Backup and Restore Workflow

### 19.1 Backup

Recommended MVP backup:

```text
Daily spreadsheet copy per tenant
        ↓
Store backup with timestamp
        ↓
Record backup status
        ↓
Periodically test restore
```

### 19.2 Restore

```text
Identify restore point
        ↓
Disable triggers temporarily
        ↓
Copy/restore spreadsheet
        ↓
Validate schema
        ↓
Run smoke test / selected KPI check
        ↓
Re-enable triggers
        ↓
Verify dashboard
```

Rules:

- Raw imports should be preserved.
- Restore must not mutate SIM Klinik.
- Restore action should be audited.

---

## 20. Workflow Priority for MVP V1

Recommended implementation order after design approval:

```text
1. Tenant setup workflow
2. Schema validation workflow
3. Fixture/import workflow
4. Mapping and validation workflow
5. Fact building workflow
6. Accounting/source traceability workflow
7. KPI computation workflow
8. Data quality workflow
9. Dashboard workflow
10. Deployment workflow
11. MCP/AI workflow preparation
```

Do not prioritize these before Finance Dashboard foundation is reliable:

- BPJS Dashboard.
- Pharmacy Dashboard.
- Telegram bot.
- WhatsApp integration.
- Full OpenClaw Agent chat.
- SaaS billing/subscription.
- Tax Engine.
- Forecasting Engine.

---

## 21. Design Verdict

The workflow design should keep the product narrow and reliable in Phase 1.

The most important workflow is not the dashboard itself, but this chain:

```text
source row → staging row → fact row → journal/source trace → metric row → dashboard/API answer
```

If any finance number cannot pass that chain, the system must not pretend it is final.

Recommended MVP success definition:

> Owner can open the mobile Finance Dashboard, see Revenue/Gross Profit/Net Profit/Margin/Cost/Visits, understand whether the numbers are complete or estimated, and trace any finance discrepancy back to source rows or journals.
