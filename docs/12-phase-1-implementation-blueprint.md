# 12. Phase 1 Implementation Blueprint

## Phase 1 Scope

Per `CLAW.md`, Phase 1 consists of:

1. Spreadsheet Data Warehouse.
2. KPI Engine.
3. Finance Dashboard.

No code should be written until this blueprint, spreadsheet schema, and KPI definitions are accepted.

## Phase 1 Objective

Build the minimum reliable BI foundation that answers the first owner questions:

1. **Berapa laba klinik saya?**
2. **Mengapa laba naik/turun?**
3. **Bagaimana tren pertumbuhan klinik?**

Phase 1 must not require staff to input data twice. Data must come from SIM Klinik export/import or prepared source files.

## Explicit Non-Scope for Phase 1

These are not Phase 1 implementation items unless MasBro explicitly approves scope expansion:

- BPJS dashboard.
- Pharmacy dashboard.
- Telegram bot.
- WhatsApp integration.
- OpenClaw agent runtime.
- Business intelligence chat.
- SaaS billing/subscription.
- API marketplace connectors.
- Writeback to SIM Klinik.

However, Phase 1 design must still include `tenant_id` and scalable abstractions so later phases do not require rewrite.

## Phase 1 Architecture Slice

```text
SIM Klinik Export / CSV / XLSX
        ↓
Import Controller
        ↓
raw_* sheets
        ↓
Staging Mapper + Validator
        ↓
stg_* sheets
        ↓
Fact Builder
        ↓
fact_visit / fact_revenue / fact_cost / fact_expense
        ↓
KPI Engine
        ↓
metric_daily_summary / metric_monthly_summary / metric_finance_breakdown
        ↓
Finance Dashboard HTML Service
```

## Phase 1 Data Sources

Minimum required source files:

| Source | Required | Purpose |
|---|---:|---|
| Visit/Kunjungan export | Yes | Visit count and trend |
| Billing/Revenue export | Yes | Revenue calculation |
| Payment export | Optional for Phase 1 | Cash-basis analysis if available |
| Doctor master/export | Recommended | Doctor dimension for later profitability |
| Poli master/export | Recommended | Poli dimension for later profitability |
| Expense export/manual finance file | Yes for net profit | Operating expense calculation |
| BPJS claim export | No | Phase 2 |
| Inventory/medicine export | No | Phase 2 |

## Important Finance Decision

Phase 1 needs one agreed MVP profit definition.

Recommended default:

```text
Phase 1 net_profit = total_revenue - direct_cost - operating_expense
```

If direct cost is incomplete, dashboard must show:

```text
estimated_net_profit
```

and include a data quality warning.

## Phase 1 Modules

### 1. Spreadsheet Data Warehouse

Responsibilities:

- Create and maintain standard sheets.
- Preserve raw imports.
- Normalize data into staging/fact tables.
- Keep all rows tenant-scoped.

Deliverables:

- sheet schema.
- sample fixture data.
- validation rules.
- data quality warning model.

### 2. Import Controller

Responsibilities:

- Read CSV/XLSX exports from Drive or uploaded files.
- Detect source type.
- Assign `tenant_id`, `source_id`, `sync_id`, `source_period`.
- Write raw rows to `raw_*` sheets.
- Log import result.

Phase 1 import targets:

- `raw_visit`
- `raw_revenue`
- `raw_expense`
- optional `raw_payment`
- optional `raw_doctor`
- optional `raw_poli`

### 3. Staging Mapper

Responsibilities:

- Map source columns into canonical columns.
- Convert date, number, enum, and ID formats.
- Reject invalid rows with reason.
- Preserve mapping template version.

Output:

- `stg_visit`
- `stg_revenue`
- `stg_expense`
- optional `stg_payment`

### 4. Fact Builder

Responsibilities:

- Generate stable normalized IDs.
- Deduplicate source rows.
- Build fact sheets from staging.
- Ensure every fact row has `tenant_id` and `clinic_id`.

Output:

- `fact_visit`
- `fact_revenue`
- `fact_cost`
- `fact_expense`

### 5. KPI Engine

Responsibilities:

- Calculate financial KPIs by day and month.
- Calculate trend comparison.
- Generate data quality warnings.
- Write precomputed metrics for fast dashboard load.

Output:

- `metric_daily_summary`
- `metric_monthly_summary`
- `metric_finance_breakdown`
- `metric_growth_trend`
- `metric_data_quality`

### 6. Finance Dashboard

Responsibilities:

- Mobile-first owner dashboard.
- Read only from `metric_*` sheets/API.
- Show KPI cards, trend chart, finance breakdown, and data warnings.

Phase 1 screens:

1. Finance Home.
2. Profit Detail.
3. Data Quality Status.

## Phase 1 User Stories

### US-001 Owner sees monthly profit

As an owner, I want to see current month revenue, costs, and net profit so I know how my clinic is performing.

Acceptance criteria:

- dashboard shows total revenue.
- dashboard shows direct cost.
- dashboard shows operating expense.
- dashboard shows net profit or estimated net profit.
- period is clearly visible.
- tenant scoping is enforced.

### US-002 Owner sees profit trend

As an owner, I want to compare this month to last month so I know whether the clinic is growing or declining.

Acceptance criteria:

- revenue growth percentage shown.
- net profit growth percentage shown.
- visit growth percentage shown.
- chart renders on mobile.

### US-003 Owner sees why profit changed

As an owner, I want to see high-level drivers of profit changes so I know what to investigate.

Acceptance criteria:

- dashboard shows revenue change.
- dashboard shows direct cost change.
- dashboard shows operating expense change.
- dashboard highlights the largest negative driver.

### US-004 Staff imports SIM Klinik export without double entry

As staff/manager, I want to import existing SIM Klinik export so I do not need to input data manually.

Acceptance criteria:

- import accepts configured export format.
- raw data is stored.
- invalid rows are logged.
- duplicate imports do not double-count.

### US-005 Owner sees data reliability

As an owner, I want to know if profit numbers are incomplete so I do not make decisions from misleading data.

Acceptance criteria:

- missing cost data creates warning.
- unmapped revenue creates warning.
- invalid date/amount rows create warning.
- AI/dashboard wording uses “estimated” when needed.

## Phase 1 API Surface

Dashboard internal functions/API:

- `getFinanceSummary(tenantContext, filters)`
- `getFinanceTrend(tenantContext, filters)`
- `getFinanceBreakdown(tenantContext, filters)`
- `getDataQualityStatus(tenantContext, filters)`
- `runImport(tenantContext, importRequest)`
- `runMetricComputation(tenantContext, period)`

No public unrestricted raw sheet API is allowed.

## Phase 1 Dashboard Components

### Mobile Finance Home

```text
┌─────────────────────────────┐
│ Finance Dashboard           │
│ Klinik: [Nama Klinik]       │
│ Periode: [Bulan Ini ▼]      │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Laba Bersih                 │
│ Rp45.000.000                │
│ ↓ 27% vs bulan lalu         │
│ Status data: Perlu cek HPP  │
└─────────────────────────────┘

┌──────────────┐ ┌──────────────┐
│ Revenue      │ │ Kunjungan    │
│ Rp125 jt     │ │ 2.100        │
│ ↑ 8%         │ │ ↑ 12%        │
└──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐
│ Biaya        │ │ Margin       │
│ Rp80 jt      │ │ 36%          │
│ ↑ 31%        │ │ ↓ 12 pt      │
└──────────────┘ └──────────────┘

┌─────────────────────────────┐
│ Kenapa berubah?             │
│ Biaya obat/layanan naik     │
│ paling besar: +Rp9 jt       │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Revenue vs Laba             │
│ [Chart.js line chart]       │
└─────────────────────────────┘
```

## Phase 1 Data Quality Rules

| Rule | Severity | Behavior |
|---|---|---|
| Missing tenant_id | critical | reject row |
| Missing clinic_id | high | default only if single-clinic tenant; otherwise reject |
| Missing transaction date | high | reject row |
| Missing amount | high | reject row |
| Negative revenue without refund marker | medium | warn |
| Duplicate source row | medium | skip and log |
| Missing direct cost | high | mark profit as estimated |
| Missing operating expense | high | show gross profit, mark net profit incomplete |
| Unmapped doctor/poli | low in Phase 1 | warn, do not block finance dashboard |

## Phase 1 Definition of Done

Phase 1 is done when:

- spreadsheet schema exists.
- sample fixture data exists.
- import flow loads raw/staging/fact sheets.
- KPI engine produces metric sheets.
- finance dashboard loads on mobile.
- owner can answer “Berapa laba saya?” from dashboard.
- owner can see basic reason why laba naik/turun.
- tenant isolation validated.
- data quality warnings visible.
- documentation updated.

## Recommended Build Order After Approval

1. Create spreadsheet schema spec and fixtures.
2. Create Apps Script project skeleton.
3. Implement sheet repository and constants.
4. Implement import raw writer.
5. Implement staging mapper for one sample format.
6. Implement fact builder.
7. Implement KPI engine.
8. Implement finance dashboard HTML.
9. Add tests/fixtures and manual QA checklist.

## Blockers Before Coding

Need at least one of these:

1. Real sample SIM Klinik export, or
2. Approval to create synthetic MVP sample format.

Need finance decision:

1. Use accrual revenue from billing export, or
2. use cash revenue from payment export, or
3. show both if data exists.

Recommendation for fastest MVP:

- use synthetic sample first to build pipeline.
- then adapt mapping to real SIM export once MasBro uploads sample.
