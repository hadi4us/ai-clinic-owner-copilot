<!-- Canonical doc alias for requested repository structure. Source: docs/04-mcp-design.md -->

# 04. MCP Design

## Purpose

MCP architecture allows OpenClaw AI to safely access clinic BI data through approved tools instead of reading arbitrary spreadsheets or inventing numbers.

The AI layer should behave like:

- Virtual CFO.
- Virtual COO.
- Virtual Inventory Manager.
- Virtual Business Analyst.

## Design Goals

1. AI answers must be grounded in computed metrics.
2. AI must respect tenant isolation.
3. AI must never mutate source-of-truth SIM Klinik data.
4. AI tools should expose business-level operations, not raw unrestricted sheet access.
5. AI response target: <10 seconds for common owner questions.

## MCP Boundary

```text
OpenClaw AI
   │
   ▼
MCP Tools
   │
   ▼
Apps Script AI Tool API
   │
   ▼
Metric Sheets / Analytics Services
   │
   ▼
Raw/Staging/Facts if drilldown needed
```

## Tool Categories

### 1. Metrics Read Tools

Read precomputed KPIs.

- `get_profit_summary`
- `get_growth_trend`
- `get_doctor_profitability`
- `get_poli_profitability`
- `get_bpjs_receivables`
- `get_inventory_risks`

### 2. Explanation Tools

Return structured drivers behind changes.

- `explain_profit_change`
- `explain_revenue_change`
- `explain_cost_change`
- `explain_inventory_risk`

### 3. Summary Tools

Generate structured business summaries.

- `get_daily_executive_summary_data`
- `get_weekly_owner_summary_data`
- `get_monthly_business_review_data`

### 4. Notification Tools

Trigger approved outbound notifications.

- `send_owner_alert`
- `send_daily_summary`

Notification tools require stricter authorization and audit logging.

## Proposed MCP Tools

### get_profit_summary

**Purpose:** Answer “Berapa laba saya?”

Input:

```json
{
  "tenant_id": "tenant_001",
  "clinic_id": "ALL",
  "period_start": "2026-06-01",
  "period_end": "2026-06-30"
}
```

Output:

```json
{
  "tenant_id": "tenant_001",
  "period_start": "2026-06-01",
  "period_end": "2026-06-30",
  "total_revenue": 125000000,
  "direct_cost": 52000000,
  "operating_expense": 28000000,
  "gross_profit": 73000000,
  "net_profit": 45000000,
  "profit_margin": 0.36,
  "data_quality_warnings": []
}
```

### explain_profit_change

**Purpose:** Answer “Mengapa laba turun?”

Input:

```json
{
  "tenant_id": "tenant_001",
  "current_period": "2026-06",
  "comparison_period": "2026-05",
  "clinic_id": "ALL"
}
```

Output:

```json
{
  "net_profit_current": 45000000,
  "net_profit_previous": 62000000,
  "change_amount": -17000000,
  "change_pct": -0.274,
  "drivers": [
    {
      "driver": "medicine_cogs_increase",
      "impact_amount": -9000000,
      "explanation": "HPP obat naik 18% sementara revenue obat hanya naik 4%."
    },
    {
      "driver": "bpjs_payment_delay",
      "impact_amount": -5000000,
      "explanation": "Piutang BPJS bertambah dan belum menjadi cash-in."
    }
  ],
  "data_quality_warnings": []
}
```

### get_doctor_profitability

Input:

```json
{
  "tenant_id": "tenant_001",
  "period": "2026-06",
  "clinic_id": "ALL",
  "limit": 10,
  "sort": "net_profit_desc"
}
```

Output:

```json
{
  "period": "2026-06",
  "items": [
    {
      "doctor_id": "doc_001",
      "doctor_name": "dr. A",
      "visit_count": 320,
      "revenue": 52000000,
      "direct_cost": 21000000,
      "allocated_cost": 8000000,
      "net_profit": 23000000,
      "profit_margin": 0.442
    }
  ]
}
```

### get_poli_profitability

Same shape as doctor profitability, grouped by poli.

### get_bpjs_receivables

Input:

```json
{
  "tenant_id": "tenant_001",
  "as_of_date": "2026-06-30",
  "clinic_id": "ALL",
  "group_by": "service_month"
}
```

Output:

```json
{
  "as_of_date": "2026-06-30",
  "total_outstanding": 88000000,
  "basis": "approved_amount_minus_paid_amount",
  "aging": [
    { "bucket": "0-30", "amount": 35000000 },
    { "bucket": "31-60", "amount": 28000000 },
    { "bucket": "61-90", "amount": 15000000 },
    { "bucket": ">90", "amount": 10000000 }
  ],
  "data_quality_warnings": []
}
```

### get_inventory_risks

Input:

```json
{
  "tenant_id": "tenant_001",
  "clinic_id": "ALL",
  "risk_level_min": "medium",
  "limit": 20
}
```

Output:

```json
{
  "total_risk_value": 17500000,
  "items": [
    {
      "medicine_id": "med_001",
      "medicine_name": "Obat A",
      "risk_reason": "expiring_soon",
      "expiry_date": "2026-07-15",
      "stock_qty": 120,
      "risk_value": 3600000,
      "risk_level": "high"
    }
  ]
}
```

### get_growth_trend

Input:

```json
{
  "tenant_id": "tenant_001",
  "clinic_id": "ALL",
  "period_grain": "month",
  "period_count": 12
}
```

Output:

```json
{
  "items": [
    {
      "period": "2026-06",
      "revenue": 125000000,
      "net_profit": 45000000,
      "visit_count": 2100,
      "revenue_growth_pct": 0.08,
      "profit_growth_pct": -0.04,
      "visit_growth_pct": 0.12
    }
  ]
}
```

## AI Response Rules

AI must:

1. Say the period used.
2. Mention data quality caveats if any.
3. Never invent missing financial values.
4. Ask for clarification if period or clinic context is missing and no safe default exists.
5. Prefer concise owner-facing answers.
6. Provide recommended action when meaningful.

Example answer style:

```text
Laba bersih Juni 2026: Rp45 juta, margin 36%.
Turun Rp17 juta dibanding Mei. Penyebab terbesar: HPP obat naik Rp9 juta dan piutang BPJS tertahan Rp5 juta.
Saran: cek 10 obat dengan margin negatif dan follow-up klaim BPJS aging >60 hari.
```

## Tenant Isolation

Every MCP request must include tenant context from authenticated session, not from free text alone.

Rules:

- `tenant_id` should be injected by auth/session layer.
- AI should not be trusted to choose tenant arbitrarily.
- Tool API must reject missing or unauthorized tenant IDs.
- Audit every AI tool call.

## Write/Mutation Policy

Allowed AI-triggered writes:

- log AI question.
- create summary cache.
- send notification if user authorized.
- create internal recommendation record.

Forbidden AI writes:

- changing SIM Klinik data.
- editing raw imported records.
- changing financial source records.
- changing tenant config without admin authorization.

## Performance Strategy

To meet <10s answers:

- Common KPIs read from `metric_*` sheets.
- Heavy calculations run on scheduled sync, not during AI question.
- Use period filters and indexed row ranges where possible.
- Cache daily/weekly summary payloads.

## MCP Server Design Notes

MVP options:

1. OpenClaw-side MCP server calls Apps Script Web App endpoints.
2. Apps Script exposes signed HTTPS endpoints for tool calls.
3. Tool schemas live in `mcp/tools.schema.json`.

Recommended MVP:

```text
OpenClaw MCP tool -> Apps Script Web App /api/ai/tool -> Analytics Service -> Metric Sheets
```

This keeps Apps Script as backend while OpenClaw controls AI orchestration.
