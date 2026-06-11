# 13. KPI Definition

## Purpose

This document defines Phase 1 KPI formulas for the KPI Engine and Finance Dashboard.

Phase 1 answers:

1. Berapa laba klinik saya?
2. Mengapa laba naik/turun?
3. Bagaimana tren pertumbuhan klinik?

## KPI Principles

1. KPI must be computed from fact/metric sheets, not raw source rows.
2. Every KPI must be tenant-scoped by `tenant_id`.
3. Period and clinic scope must be explicit.
4. If source data is incomplete, label KPI as `estimated` or `incomplete`.
5. Never silently show unreliable profit as final profit.

## Common Filters

All KPI functions accept:

| Filter | Required | Description |
|---|---:|---|
| tenant_id | yes | Tenant/clinic scope from authenticated context |
| clinic_id | yes | Clinic branch or ALL |
| period_start | yes | Start date |
| period_end | yes | End date |
| comparison_period_start | no | Previous period start |
| comparison_period_end | no | Previous period end |

## Phase 1 Core KPIs

### 1. Total Visits

Owner question:

- Bagaimana tren pertumbuhan klinik?

Formula:

```text
total_visits = count(fact_visit where status = completed)
```

Filters:

- `tenant_id`
- `clinic_id`
- `visit_date between period_start and period_end`

Notes:

- Cancelled visits should be excluded.
- If visit status unavailable, include row but create data quality warning.

### 2. Total Revenue

Owner question:

- Berapa omzet/revenue klinik saya?

Formula:

```text
total_revenue = sum(fact_revenue.amount)
```

Filters:

- `tenant_id`
- `clinic_id`
- `transaction_date between period_start and period_end`

Revenue categories:

- consultation.
- procedure.
- medicine.
- lab.
- other.

Important:

- Phase 1 default is accrual-like revenue from billing export.
- If using payment export, call it `cash_revenue` instead.

### 3. Direct Cost

Owner question:

- Kenapa laba turun?

Formula:

```text
direct_cost = sum(fact_cost.amount where cost_category in direct cost categories)
```

Direct cost categories:

- cogs_medicine.
- doctor_fee.
- lab_cost.
- other_direct.

If direct cost is unavailable:

- set `direct_cost = 0` only for calculation placeholder.
- set data_status = `estimated` or `incomplete`.
- create warning: `missing_direct_cost`.

### 4. Operating Expense

Owner question:

- Berapa laba saya setelah biaya operasional?

Formula:

```text
operating_expense = sum(fact_expense.amount)
```

Categories:

- salary.
- rent.
- utilities.
- marketing.
- supplies.
- admin.
- other.

If operating expense is unavailable:

- gross profit can still be shown.
- net profit should be marked `incomplete`.

### 5. Gross Profit

Formula:

```text
gross_profit = total_revenue - direct_cost
```

If direct cost missing:

```text
gross_profit_status = estimated
```

### 6. Net Profit

Formula:

```text
net_profit = total_revenue - direct_cost - operating_expense
```

Alternative representation:

```text
net_profit = gross_profit - operating_expense
```

Data status:

| Condition | Status |
|---|---|
| revenue + direct cost + operating expense complete | complete |
| direct cost partially missing | estimated |
| operating expense missing | incomplete |
| revenue missing | incomplete |

### 7. Profit Margin

Formula:

```text
profit_margin = net_profit / total_revenue
```

If total revenue is zero:

```text
profit_margin = null
```

### 8. Revenue Growth Percentage

Formula:

```text
revenue_growth_pct = (current_total_revenue - previous_total_revenue) / previous_total_revenue
```

If previous revenue is zero or missing:

```text
revenue_growth_pct = null
```

### 9. Profit Growth Percentage

Formula:

```text
profit_growth_pct = (current_net_profit - previous_net_profit) / abs(previous_net_profit)
```

If previous net profit is zero or missing:

```text
profit_growth_pct = null
```

Use `abs(previous_net_profit)` to avoid misleading sign when previous period loss is negative.

### 10. Visit Growth Percentage

Formula:

```text
visit_growth_pct = (current_total_visits - previous_total_visits) / previous_total_visits
```

If previous visits is zero or missing:

```text
visit_growth_pct = null
```

## Finance Breakdown KPIs

### Revenue by Category

Formula:

```text
revenue_by_category[category] = sum(fact_revenue.amount where revenue_category = category)
```

Percentage:

```text
pct_of_total = category_amount / total_revenue
```

### Direct Cost by Category

Formula:

```text
direct_cost_by_category[category] = sum(fact_cost.amount where cost_category = category)
```

Percentage:

```text
pct_of_total = category_amount / direct_cost
```

### Operating Expense by Category

Formula:

```text
expense_by_category[category] = sum(fact_expense.amount where expense_category = category)
```

Percentage:

```text
pct_of_total = category_amount / operating_expense
```

## Profit Change Driver Logic

Purpose:

Answer “Mengapa laba naik/turun?” without AI yet.

### Inputs

- current period metrics.
- previous period metrics.

### Basic Driver Formulas

```text
revenue_impact = current_total_revenue - previous_total_revenue

direct_cost_impact = -(current_direct_cost - previous_direct_cost)

operating_expense_impact = -(current_operating_expense - previous_operating_expense)

visit_impact = current_total_visits - previous_total_visits
```

Profit delta should roughly equal:

```text
net_profit_delta = revenue_impact + direct_cost_impact + operating_expense_impact
```

### Driver Severity

| Impact Amount | Severity |
|---:|---|
| <= -10,000,000 | high |
| <= -3,000,000 | medium |
| < 0 | low |
| >= 0 | info/positive |

Thresholds should become tenant-configurable later.

### Driver Labels

| Driver | Example Label |
|---|---|
| revenue_change | Revenue naik/turun |
| direct_cost_increase | Biaya langsung naik |
| direct_cost_decrease | Biaya langsung turun |
| expense_increase | Biaya operasional naik |
| expense_decrease | Biaya operasional turun |
| visit_change | Kunjungan naik/turun |

### Example Output

```json
[
  {
    "driver_type": "direct_cost_increase",
    "impact_amount": -9000000,
    "severity": "high",
    "explanation": "Biaya langsung naik Rp9 jt dibanding bulan lalu."
  },
  {
    "driver_type": "revenue_change",
    "impact_amount": 5000000,
    "severity": "positive",
    "explanation": "Revenue naik Rp5 jt, tetapi belum cukup menutup kenaikan biaya."
  }
]
```

## Data Status Rules

### complete

Use when:

- revenue exists.
- direct cost exists or direct cost genuinely zero.
- operating expense exists or genuinely zero.
- no critical data quality issue.

### estimated

Use when:

- revenue exists.
- cost data is partially available.
- metric can still guide direction but not final accounting.

Dashboard wording:

```text
Estimasi laba bersih
```

### incomplete

Use when:

- revenue missing.
- operating expense missing and net profit cannot be responsibly shown.
- critical mapping issue affects most records.

Dashboard wording:

```text
Data laba belum lengkap
```

## KPI Output Contract

### Finance Summary

```json
{
  "tenant_id": "klinik_001",
  "clinic_id": "clinic_001",
  "period_start": "2026-06-01",
  "period_end": "2026-06-30",
  "total_visits": 2100,
  "total_revenue": 125000000,
  "direct_cost": 52000000,
  "operating_expense": 28000000,
  "gross_profit": 73000000,
  "net_profit": 45000000,
  "profit_margin": 0.36,
  "data_status": "complete",
  "warnings": []
}
```

### Finance Trend

```json
{
  "period": "2026-06",
  "revenue_growth_pct": 0.08,
  "profit_growth_pct": -0.274,
  "visit_growth_pct": 0.12,
  "previous_period": "2026-05"
}
```

### Profit Driver

```json
{
  "current_period": "2026-06",
  "comparison_period": "2026-05",
  "net_profit_delta": -17000000,
  "drivers": [
    {
      "driver_type": "direct_cost_increase",
      "impact_amount": -9000000,
      "severity": "high",
      "explanation": "Biaya langsung naik Rp9 jt dibanding bulan lalu."
    }
  ]
}
```

## Dashboard Display Rules

- Use IDR compact formatting: `Rp45 jt`, `Rp1,2 M`.
- Always show period.
- Use green for positive growth, red for negative profit impact, amber for warning/incomplete data.
- If data_status is `estimated`, label primary KPI as “Estimasi Laba Bersih”.
- If data_status is `incomplete`, do not show final net profit as if reliable.

## Phase 1 KPI Test Fixtures

### Fixture A: Complete Profit

Input:

```text
total_revenue = 125,000,000
direct_cost = 52,000,000
operating_expense = 28,000,000
```

Expected:

```text
gross_profit = 73,000,000
net_profit = 45,000,000
profit_margin = 0.36
data_status = complete
```

### Fixture B: Missing Direct Cost

Input:

```text
total_revenue = 125,000,000
direct_cost = missing
operating_expense = 28,000,000
```

Expected:

```text
data_status = estimated or incomplete depending policy
warning = missing_direct_cost
```

Recommended policy:

- if direct cost source unavailable entirely, net profit = incomplete.
- if direct cost source partially missing, net profit = estimated.

### Fixture C: Profit Drop

Input:

```text
previous_net_profit = 62,000,000
current_net_profit = 45,000,000
previous_direct_cost = 43,000,000
current_direct_cost = 52,000,000
```

Expected:

```text
profit_delta = -17,000,000
direct_cost_impact = -9,000,000
profit_growth_pct = -0.274
```

## Open KPI Decisions

Need MasBro decision before implementation if no sample export exists:

1. Use billing date or payment date for revenue recognition?
2. Are doctor fees included in SIM export or separate cost file?
3. Are operating expenses available from SIM or separate finance sheet?
4. Should Phase 1 show gross profit only when cost data is weak, or still show estimated net profit?

Recommended MVP default:

- Use billing date for revenue.
- Use separate expense import for operating expense.
- Use cost fields from export if available.
- Show “estimated” clearly when cost data is partial.
