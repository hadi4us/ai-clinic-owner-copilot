# Spreadsheet Schema

## Purpose

This document defines the Google Spreadsheet Data Warehouse schema for AI Clinic Owner Copilot.

Phase 1 focuses on:

- Data Warehouse.
- KPI Engine.
- Finance Dashboard.

All sheets must include `tenant_id` except global reference sheets explicitly marked as global.

## Naming Rules

- Sheet names use lowercase snake case.
- Columns use lowercase snake case.
- IDs are strings.
- Dates use ISO style where possible: `YYYY-MM-DD`.
- Datetimes use ISO timestamp where possible.
- Money uses numeric IDR amount without currency symbol.

## Sheet Groups

```text
cfg_*       configuration
raw_*       raw imported source rows
stg_*       mapped staging rows
fact_*      normalized fact rows
dim_*       dimensions
metric_*    dashboard-ready metric rows
log_*       sync/audit/error logs
```

## Phase 1 Required Sheets

### cfg_tenant

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 | Tenant = Klinik |
| tenant_name | yes | Klinik Sehat Sentosa | Clinic name |
| status | yes | active | active/suspended/trial |
| timezone | yes | Asia/Jakarta | Default tenant timezone |
| currency | yes | IDR | MVP IDR |
| created_at | yes | 2026-06-09T10:00:00+07:00 |  |
| updated_at | yes | 2026-06-09T10:00:00+07:00 |  |

### cfg_clinic

For Phase 1, this supports both single-clinic and future branch expansion.

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 |  |
| clinic_name | yes | Klinik Sehat Sentosa |  |
| clinic_type | no | pratama |  |
| status | yes | active | active/inactive |

### cfg_integration_source

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| source_id | yes | sim_export_main |  |
| source_type | yes | csv | csv/xlsx/api/connector |
| sim_vendor | no | vendor_x |  |
| mapping_template_id | yes | default_phase1_v1 |  |
| last_sync_at | no | 2026-06-09T10:00:00+07:00 |  |
| status | yes | active | active/error/inactive |

### cfg_mapping_template

Defines source column mapping for CSV/XLSX exports.

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| mapping_template_id | yes | default_phase1_v1 |  |
| source_type | yes | revenue | visit/revenue/expense/payment |
| source_column | yes | Tanggal Transaksi | Column from export |
| target_column | yes | transaction_date | Canonical staging column |
| transform | no | parse_date_id | transform function name |
| required | yes | true | true/false |
| default_value | no |  | optional |
| active | yes | true | true/false |

## Raw Sheets

Raw sheets preserve source rows. For MVP, `raw_payload` stores source row JSON/string.

### raw_visit

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 |  |
| sync_id | yes | sync_20260609_001 |  |
| source_id | yes | sim_export_main |  |
| source_row_id | yes | visit_1001 | Stable dedupe key |
| source_period | yes | 2026-06 | Month or date range |
| raw_payload | yes | `{...}` | Original row |
| imported_at | yes | 2026-06-09T10:00:00+07:00 |  |

### raw_revenue

Same structure as `raw_visit`, for billing/revenue rows.

### raw_expense

Same structure as `raw_visit`, for operating expense rows.

### raw_payment

Optional Phase 1 sheet if payment export exists.

## Staging Sheets

Staging sheets contain canonical mapped values but are not yet final facts.

### stg_visit

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 |  |
| sync_id | yes | sync_20260609_001 |  |
| source_row_id | yes | visit_1001 |  |
| visit_date | yes | 2026-06-09 |  |
| source_visit_id | yes | V1001 |  |
| source_doctor_id | no | D001 |  |
| source_poli_id | no | P001 |  |
| patient_ref | no | hash_xxx | Pseudonymous only |
| visit_type | no | umum | umum/bpjs/asuransi/corporate |
| status | yes | completed |  |
| validation_status | yes | valid | valid/warning/rejected |
| validation_notes | no |  |  |

### stg_revenue

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 |  |
| sync_id | yes | sync_20260609_001 |  |
| source_row_id | yes | rev_1001 |  |
| source_transaction_id | yes | TRX1001 |  |
| transaction_date | yes | 2026-06-09 |  |
| source_visit_id | no | V1001 |  |
| source_doctor_id | no | D001 |  |
| source_poli_id | no | P001 |  |
| payer_type | no | cash | cash/bpjs/insurance/corporate |
| revenue_category | yes | consultation | consultation/procedure/medicine/lab/other |
| amount | yes | 250000 | Numeric IDR |
| validation_status | yes | valid | valid/warning/rejected |
| validation_notes | no |  |  |

### stg_expense

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 |  |
| sync_id | yes | sync_20260609_001 |  |
| source_row_id | yes | exp_1001 |  |
| source_expense_id | no | EXP1001 |  |
| expense_date | yes | 2026-06-09 |  |
| expense_category | yes | salary | salary/rent/utilities/marketing/supplies/other |
| amount | yes | 5000000 | Numeric IDR |
| allocation_target | no | shared | clinic/poli/doctor/shared |
| validation_status | yes | valid | valid/warning/rejected |
| validation_notes | no |  |  |

## Dimension Sheets

### dim_doctor

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| doctor_id | yes | doc_001 | Normalized ID |
| source_doctor_id | yes | D001 |  |
| doctor_name | yes | dr. A |  |
| specialty | no | umum |  |
| status | yes | active |  |

### dim_poli

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| poli_id | yes | poli_001 | Normalized ID |
| source_poli_id | yes | P001 |  |
| poli_name | yes | Poli Umum |  |
| status | yes | active |  |

## Fact Sheets

### fact_visit

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 |  |
| visit_id | yes | visit_001 | Generated normalized ID |
| source_visit_id | yes | V1001 |  |
| visit_date | yes | 2026-06-09 |  |
| doctor_id | no | doc_001 | Nullable in Phase 1 |
| poli_id | no | poli_001 | Nullable in Phase 1 |
| patient_ref | no | hash_xxx | Pseudonymous only |
| visit_type | no | umum |  |
| status | yes | completed |  |
| sync_id | yes | sync_20260609_001 |  |
| created_at | yes | 2026-06-09T10:00:00+07:00 |  |

### fact_revenue

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 |  |
| revenue_id | yes | rev_001 | Generated normalized ID |
| source_transaction_id | yes | TRX1001 |  |
| transaction_date | yes | 2026-06-09 |  |
| visit_id | no | visit_001 |  |
| doctor_id | no | doc_001 |  |
| poli_id | no | poli_001 |  |
| payer_type | no | cash |  |
| revenue_category | yes | consultation |  |
| amount | yes | 250000 |  |
| sync_id | yes | sync_20260609_001 |  |
| created_at | yes | 2026-06-09T10:00:00+07:00 |  |

### fact_cost

Phase 1 uses this for direct costs if available from source.

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 |  |
| cost_id | yes | cost_001 |  |
| cost_date | yes | 2026-06-09 |  |
| visit_id | no | visit_001 |  |
| doctor_id | no | doc_001 |  |
| poli_id | no | poli_001 |  |
| cost_category | yes | cogs_medicine | cogs_medicine/doctor_fee/lab_cost/other_direct |
| amount | yes | 90000 |  |
| allocation_method | yes | direct | direct/revenue_ratio/visit_ratio/manual_rule |
| sync_id | yes | sync_20260609_001 |  |
| created_at | yes | 2026-06-09T10:00:00+07:00 |  |

### fact_expense

Phase 1 uses this for operating expenses.

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 |  |
| expense_id | yes | exp_001 |  |
| expense_date | yes | 2026-06-09 |  |
| expense_category | yes | salary |  |
| amount | yes | 5000000 |  |
| allocation_target | yes | shared | clinic/poli/doctor/shared |
| sync_id | yes | sync_20260609_001 |  |
| created_at | yes | 2026-06-09T10:00:00+07:00 |  |

## Metric Sheets

### metric_daily_summary

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 | Use ALL for aggregate |
| date | yes | 2026-06-09 |  |
| total_visits | yes | 120 |  |
| total_revenue | yes | 7500000 |  |
| direct_cost | yes | 2500000 |  |
| operating_expense | yes | 1800000 |  |
| gross_profit | yes | 5000000 | revenue - direct_cost |
| net_profit | yes | 3200000 | gross_profit - operating_expense |
| profit_margin | yes | 0.4267 | net_profit / revenue |
| data_status | yes | complete | complete/estimated/incomplete |
| computed_at | yes | 2026-06-09T10:00:00+07:00 |  |

### metric_monthly_summary

Same columns as `metric_daily_summary`, but replace `date` with `period`.

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 | Use ALL for aggregate |
| period | yes | 2026-06 | YYYY-MM |
| total_visits | yes | 2100 |  |
| total_revenue | yes | 125000000 |  |
| direct_cost | yes | 52000000 |  |
| operating_expense | yes | 28000000 |  |
| gross_profit | yes | 73000000 |  |
| net_profit | yes | 45000000 |  |
| profit_margin | yes | 0.36 |  |
| data_status | yes | estimated | complete/estimated/incomplete |
| computed_at | yes | 2026-06-30T17:00:00+07:00 |  |

### metric_finance_breakdown

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 |  |
| period | yes | 2026-06 |  |
| metric_type | yes | revenue_category | revenue_category/direct_cost_category/expense_category |
| category | yes | consultation |  |
| amount | yes | 75000000 |  |
| pct_of_total | yes | 0.60 |  |
| computed_at | yes | 2026-06-30T17:00:00+07:00 |  |

### metric_growth_trend

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 |  |
| period | yes | 2026-06 |  |
| total_revenue | yes | 125000000 |  |
| net_profit | yes | 45000000 |  |
| total_visits | yes | 2100 |  |
| revenue_growth_pct | no | 0.08 | vs previous period |
| profit_growth_pct | no | -0.274 | vs previous period |
| visit_growth_pct | no | 0.12 | vs previous period |
| computed_at | yes | 2026-06-30T17:00:00+07:00 |  |

### metric_profit_change_driver

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 |  |
| current_period | yes | 2026-06 |  |
| comparison_period | yes | 2026-05 |  |
| driver_type | yes | direct_cost_increase | revenue_change/direct_cost_increase/expense_increase/visit_change |
| driver_label | yes | HPP/biaya langsung naik | Owner-facing label |
| impact_amount | yes | -9000000 | Positive/negative impact on profit |
| explanation | yes | Biaya langsung naik Rp9 jt dibanding bulan lalu. |  |
| severity | yes | high | low/medium/high |
| computed_at | yes | 2026-06-30T17:00:00+07:00 |  |

### metric_data_quality

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| clinic_id | yes | clinic_001 |  |
| period | yes | 2026-06 |  |
| rule_id | yes | missing_direct_cost |  |
| severity | yes | high | low/medium/high/critical |
| status | yes | open | open/resolved/ignored |
| affected_sheet | yes | fact_cost |  |
| affected_count | yes | 25 |  |
| message | yes | 25 revenue rows do not have direct cost. Net profit is estimated. |  |
| created_at | yes | 2026-06-30T17:00:00+07:00 |  |

## Logs

### log_sync

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| sync_id | yes | sync_20260609_001 |  |
| source_id | yes | sim_export_main |  |
| source_type | yes | revenue | visit/revenue/expense/payment |
| started_at | yes | 2026-06-09T10:00:00+07:00 |  |
| finished_at | no | 2026-06-09T10:01:00+07:00 |  |
| status | yes | success | success/partial/failed |
| rows_imported | yes | 1500 |  |
| rows_rejected | yes | 3 |  |
| rows_duplicated | yes | 0 |  |
| error_message | no |  |  |

### log_audit

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 |  |
| audit_id | yes | audit_001 |  |
| actor_id | yes | user_001 | user/system |
| role | yes | owner | owner/manager/staff/system |
| action | yes | view_finance_dashboard |  |
| resource | yes | metric_monthly_summary |  |
| created_at | yes | 2026-06-09T10:00:00+07:00 |  |
| metadata | no | `{...}` |  |

## Phase 1 Minimum Spreadsheet Tabs

Create these first:

1. `cfg_tenant`
2. `cfg_clinic`
3. `cfg_integration_source`
4. `cfg_mapping_template`
5. `raw_visit`
6. `raw_revenue`
7. `raw_expense`
8. `stg_visit`
9. `stg_revenue`
10. `stg_expense`
11. `dim_doctor`
12. `dim_poli`
13. `fact_visit`
14. `fact_revenue`
15. `fact_cost`
16. `fact_expense`
17. `metric_daily_summary`
18. `metric_monthly_summary`
19. `metric_finance_breakdown`
20. `metric_growth_trend`
21. `metric_profit_change_driver`
22. `metric_data_quality`
23. `log_sync`
24. `log_audit`

## Schema Validation Rules

Before any metric calculation:

- required sheets exist.
- required columns exist.
- `tenant_id` exists on all non-global sheets.
- no duplicate header names.
- date columns parse correctly.
- amount columns parse as numbers.
- source rows have stable dedupe keys.

---

## MVP V1 Accounting Traceability Addendum

MVP V1 adds accounting traceability so Finance Dashboard numbers can be traced to source rows and journal entries.

### New / Updated Tables

#### cfg_coa

Minimal Chart of Accounts used by MVP V1 synthetic accounting trace.

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 | Tenant scope |
| coa_id | yes | coa_revenue | Stable COA identifier |
| coa_code | yes | 4100 | Accounting code |
| coa_name | yes | Clinical Revenue | Human label |
| coa_type | yes | revenue | asset/liability/revenue/expense/equity |
| normal_balance | yes | credit | debit/credit |
| category | yes | revenue | Finance category |
| active | yes | true | Active flag |

#### journal_entry

Journal header table.

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 | Tenant scope |
| clinic_id | yes | clinic_001 | Clinic scope |
| journal_entry_id | yes | je_rev_001 | Stable journal id |
| period | yes | 2026-06 | Reporting period |
| entry_date | yes | 2026-06-01 | Entry date |
| source_type | yes | fact_revenue | fact_revenue/fact_cost/fact_expense |
| source_id | yes | rev_001 | Fact id |
| source_row_id | yes | rev_001 | Original source row id |
| sync_id | yes | sync_202606_001 | Sync/import id |
| description | yes | Revenue consultation | Journal description |
| entry_status | yes | posted | draft/posted/reversed |
| created_at | yes | timestamp | Created timestamp |

#### journal_line

Balanced debit/credit journal lines.

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 | Tenant scope |
| clinic_id | yes | clinic_001 | Clinic scope |
| journal_line_id | yes | je_rev_001_dr | Stable line id |
| journal_entry_id | yes | je_rev_001 | Parent journal |
| coa_id | yes | coa_revenue | COA id |
| debit | yes | 0 | Numeric amount |
| credit | yes | 250000 | Numeric amount |
| line_memo | no | Credit revenue | Memo |
| created_at | yes | timestamp | Created timestamp |

#### finance_trace_map

Mapping from metric rows back to fact/source/journal.

| Column | Required | Example | Notes |
|---|---:|---|---|
| tenant_id | yes | klinik_001 | Tenant scope |
| clinic_id | yes | clinic_001 | Clinic scope |
| metric_scope | yes | monthly_summary | Metric scope |
| metric_key | yes | total_revenue | Metric key |
| period | yes | 2026-06 | Reporting period |
| fact_sheet | yes | fact_revenue | Source fact table |
| fact_id | yes | rev_001 | Fact id |
| journal_entry_id | yes | je_rev_001 | Journal id |
| source_row_id | yes | rev_001 | Source row id |
| sync_id | yes | sync_202606_001 | Sync/import id |
| trace_status | yes | traceable | traceable/partially_traceable/not_traceable |
| created_at | yes | timestamp | Created timestamp |

### Updated Finance Fact Columns

`fact_revenue`, `fact_cost`, and `fact_expense` now include:

- `source_row_id`
- `sync_id`
- `journal_entry_id`
- `trace_status`

### Updated Metric Columns

`metric_monthly_summary` and `metric_daily_summary` now include:

- `data_status`
- `trace_status`
- `trace_summary_json`
- `computed_at`

`metric_finance_breakdown` now includes:

- `data_status`
- `trace_status`

### MVP V1 Fixture Expectation

For fixture period `2026-06`:

- `total_revenue = 1,950,000`
- `direct_cost = 660,000`
- `operating_expense = 1,750,000`
- `net_profit = -460,000`
- `data_status = complete`
- `trace_status = traceable`
- `finance_trace_map = 13 rows`
- `journal_entry = 13 rows`
- `journal_line = 26 rows`
- total debit equals total credit
