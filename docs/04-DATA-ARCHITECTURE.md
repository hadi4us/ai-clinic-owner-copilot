<!-- Canonical doc alias for requested repository structure. Source: docs/03-data-model.md -->

# 03. Data Model

## Data Model Principles

1. Every table/sheet must include `tenant_id`.
2. Raw source data must be preserved for auditability.
3. Normalized fact/dimension sheets are derived from raw data.
4. Metrics are precomputed for dashboard speed.
5. No patient-sensitive detail should be exposed to AI unless absolutely required.
6. Owner-facing metrics should be traceable to source period and source table.

## Sheet Layering

```text
raw_*       = source import from SIM Klinik/export/API
stg_*       = cleaned and mapped staging data
dim_*       = dimensions/master entities
fact_*      = transactional facts
metric_*    = precomputed business metrics
cfg_*       = tenant and system configuration
log_*       = sync/audit/error logs
```

## Core Configuration Sheets

### cfg_tenant

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Unique tenant/clinic group ID |
| tenant_name | string | Clinic/business name |
| status | enum | active, suspended, trial |
| timezone | string | Tenant timezone |
| currency | string | Default IDR |
| created_at | datetime | Creation timestamp |
| updated_at | datetime | Last update timestamp |

### cfg_clinic

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| clinic_id | string | Clinic branch ID |
| clinic_name | string | Branch name |
| clinic_type | string | pratama, utama, gigi, perusahaan, etc. |
| address | string | Optional |
| status | enum | active/inactive |

### cfg_integration_source

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| source_id | string | Integration source ID |
| source_type | enum | csv, xlsx, api, connector |
| sim_vendor | string | SIM Klinik vendor name if known |
| mapping_template_id | string | Mapping template used |
| last_sync_at | datetime | Last successful sync |
| status | enum | active/error/inactive |

## Raw Sheets

Raw sheets depend on vendor/export format. Minimum common sheets:

### raw_visit

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| source_id | string | Import source |
| source_row_id | string | Unique row key from source/import |
| raw_payload | json/string | Original row data |
| imported_at | datetime | Import timestamp |
| source_period | date/month | Reporting period |

Other raw sheets:

- `raw_billing`
- `raw_payment`
- `raw_doctor`
- `raw_poli`
- `raw_medicine`
- `raw_inventory_movement`
- `raw_bpjs_claim`
- `raw_expense`

## Dimension Sheets

### dim_doctor

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| doctor_id | string | Normalized doctor ID |
| source_doctor_id | string | Source doctor ID/code |
| doctor_name | string | Doctor name |
| specialty | string | Specialty if available |
| status | enum | active/inactive |

### dim_poli

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| poli_id | string | Normalized poli ID |
| source_poli_id | string | Source poli ID/code |
| poli_name | string | Poli name |
| status | enum | active/inactive |

### dim_medicine

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| medicine_id | string | Normalized medicine ID |
| source_medicine_id | string | Source medicine ID/code |
| medicine_name | string | Medicine name |
| category | string | Category |
| unit | string | Unit |
| status | enum | active/inactive |

### dim_date

| Column | Type | Description |
|---|---|---|
| date_id | string | YYYYMMDD |
| date | date | Actual date |
| month | string | YYYY-MM |
| quarter | string | Quarter |
| year | number | Year |
| day_of_week | string | Day name |

## Fact Sheets

### fact_visit

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| clinic_id | string | Clinic branch ID |
| visit_id | string | Normalized visit ID |
| source_visit_id | string | Source visit ID |
| visit_date | date | Visit date |
| doctor_id | string | Doctor dimension ID |
| poli_id | string | Poli dimension ID |
| patient_ref | string | Hashed/pseudonymous patient reference, optional |
| visit_type | string | umum, bpjs, asuransi, etc. |
| status | string | completed/cancelled/etc. |

### fact_revenue

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| clinic_id | string | Clinic branch ID |
| revenue_id | string | Revenue row ID |
| source_transaction_id | string | Source transaction ID |
| transaction_date | date | Transaction date |
| visit_id | string | Related visit |
| doctor_id | string | Related doctor |
| poli_id | string | Related poli |
| payer_type | enum | cash, bpjs, insurance, corporate |
| revenue_category | string | consultation, procedure, medicine, lab, etc. |
| amount | number | Revenue amount |

### fact_cost

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| clinic_id | string | Clinic branch ID |
| cost_id | string | Cost row ID |
| cost_date | date | Cost date |
| visit_id | string | Optional related visit |
| doctor_id | string | Optional related doctor |
| poli_id | string | Optional related poli |
| cost_category | string | cogs_medicine, doctor_fee, lab_cost, operational, etc. |
| amount | number | Cost amount |
| allocation_method | string | direct, revenue_ratio, visit_ratio, manual_rule |

### fact_bpjs_claim

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| clinic_id | string | Clinic branch ID |
| claim_id | string | Claim ID |
| source_claim_id | string | Source claim ID |
| claim_date | date | Claim submitted date |
| service_month | string | Service month |
| claim_amount | number | Submitted claim amount |
| approved_amount | number | Approved amount |
| paid_amount | number | Paid amount |
| outstanding_amount | number | claim/approved minus paid |
| status | enum | submitted, approved, partially_paid, paid, rejected |
| paid_at | date | Payment date |

### fact_inventory_movement

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| clinic_id | string | Clinic branch ID |
| movement_id | string | Movement ID |
| movement_date | date | Movement date |
| medicine_id | string | Medicine ID |
| batch_no | string | Batch number |
| expiry_date | date | Expiry date |
| movement_type | enum | in, out, adjustment, expired |
| quantity | number | Quantity |
| unit_cost | number | Unit cost |
| total_cost | number | Quantity x unit cost |

### fact_expense

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| clinic_id | string | Clinic branch ID |
| expense_id | string | Expense ID |
| expense_date | date | Expense date |
| expense_category | string | rent, salary, utilities, marketing, etc. |
| amount | number | Expense amount |
| allocation_target | string | clinic, poli, doctor, shared |

## Metric Sheets

### metric_daily_summary

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| clinic_id | string | Clinic ID or ALL |
| date | date | Metric date |
| total_visits | number | Visit count |
| total_revenue | number | Revenue |
| total_cost | number | Cost |
| gross_profit | number | Revenue - direct costs |
| operating_expense | number | Operating expense |
| net_profit | number | Gross profit - operating expense |
| bpjs_receivable | number | Outstanding BPJS amount |
| inventory_risk_value | number | At-risk inventory value |

### metric_doctor_profitability

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| period | string | YYYY-MM or custom range |
| doctor_id | string | Doctor ID |
| doctor_name | string | Snapshot name |
| visit_count | number | Visits handled |
| revenue | number | Doctor-linked revenue |
| direct_cost | number | Doctor-linked direct cost |
| allocated_cost | number | Shared cost allocation |
| net_profit | number | Profit contribution |
| profit_margin | number | Net profit / revenue |
| rank | number | Rank by profit |

### metric_poli_profitability

Similar to doctor profitability, grouped by `poli_id`.

### metric_inventory_risk

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| clinic_id | string | Clinic ID |
| medicine_id | string | Medicine ID |
| medicine_name | string | Snapshot name |
| batch_no | string | Batch |
| expiry_date | date | Expiry date |
| stock_qty | number | Current stock |
| unit_cost | number | Unit cost |
| risk_value | number | stock_qty x unit_cost |
| risk_reason | string | expiring_soon, slow_moving, overstock, expired |
| risk_level | enum | low, medium, high, critical |

### metric_growth_trend

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| period | string | YYYY-MM |
| revenue | number | Revenue |
| net_profit | number | Net profit |
| visit_count | number | Visits |
| bpjs_receivable | number | BPJS outstanding |
| revenue_growth_pct | number | Period-over-period growth |
| profit_growth_pct | number | Period-over-period growth |
| visit_growth_pct | number | Period-over-period growth |

## Logs

### log_sync

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| sync_id | string | Sync run ID |
| source_id | string | Integration source |
| started_at | datetime | Start time |
| finished_at | datetime | Finish time |
| status | enum | success, partial, failed |
| rows_imported | number | Rows imported |
| rows_rejected | number | Rows rejected |
| error_message | string | Error summary |

### log_audit

| Column | Type | Description |
|---|---|---|
| tenant_id | string | Tenant ID |
| audit_id | string | Audit ID |
| actor_id | string | User/system/AI actor |
| action | string | Action performed |
| resource | string | Resource accessed |
| created_at | datetime | Timestamp |
| metadata | json/string | Optional metadata |

## Profitability Calculation Concept

### Net Profit

```text
net_profit = total_revenue - direct_cost - allocated_operational_expense
```

### Doctor Profitability

```text
doctor_net_profit = doctor_revenue
                  - doctor_direct_cost
                  - allocated_shared_cost
```

Allocation method should be configurable:

- by revenue ratio.
- by visit count ratio.
- by direct mapping.
- by manual owner rule.

### Poli Profitability

Same model as doctor profitability, grouped by poli.

## BPJS Receivable Calculation

```text
bpjs_receivable = approved_amount - paid_amount
```

If approval data is unavailable:

```text
bpjs_receivable = claim_amount - paid_amount
```

The system must clearly label which basis is being used.

## Inventory Risk Calculation

Risk sources:

- expired stock.
- stock expiring soon.
- slow-moving stock.
- overstock relative to usage trend.
- negative margin medicine.

Example:

```text
risk_value = stock_qty * unit_cost
```

## Data Quality Flags

For every metric run, generate data quality warnings:

- missing doctor mapping.
- missing poli mapping.
- negative revenue.
- missing cost assumptions.
- unallocated expense.
- BPJS paid amount greater than claim amount.
- stock without expiry date.

AI summaries must include these caveats when relevant.
