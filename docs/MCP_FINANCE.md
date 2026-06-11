# MCP Finance

## Purpose

MCP Finance mendesain tool contract untuk AI layer yang menjawab pertanyaan owner tentang performa keuangan klinik.

MCP Finance berperan sebagai **Virtual CFO** yang mengambil data hanya dari approved metrics/API, bukan dari raw spreadsheet bebas.

Contoh pertanyaan yang harus bisa dijawab:

- “Berapa Revenue bulan ini?”
- “Berapa Net Profit klinik saya?”
- “Kenapa laba turun?”
- “Cost terbesar bulan ini apa?”
- “Margin saya sehat atau tidak?”
- “Revenue naik tapi Net Profit turun kenapa?”

Guardrails utama:

- Semua tool wajib tenant-scoped.
- Semua output finance wajib punya `data_status` dan `trace_status`.
- Jika angka tidak traceable ke source/journal valid, AI wajib menyebut `estimated` atau `incomplete`.
- AI tidak boleh menyebut angka sebagai laporan final jika traceability gagal.
- AI tidak boleh membaca raw unrestricted sheets.
- AI tidak boleh melakukan writeback ke SIM Klinik.

---

## Source of Truth

MCP Finance hanya boleh membaca dari:

- `metric_monthly_summary`
- `metric_daily_summary`
- `metric_finance_breakdown`
- `metric_growth_trend`
- `metric_profit_change_driver`
- `metric_data_quality`
- approved Apps Script API finance endpoints.

MCP Finance tidak boleh membaca langsung:

- `raw_*`
- unrestricted `stg_*`
- patient-sensitive data
- diagnosis/medical record data.

---

## Tools

### 1. `get_profit_summary`

#### Purpose

Menjawab ringkasan performa keuangan untuk tenant/clinic/period tertentu.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "basis": "management_pnl_accrual_like"
}
```

`tenant_id` harus resolved dari verified tenant context, bukan dipercaya dari input user.

#### Outputs

```json
{
  "period": "2026-06",
  "clinic_id": "clinic_001",
  "basis": "management_pnl_accrual_like",
  "total_visits": 5,
  "total_revenue": 1950000,
  "direct_cost": 660000,
  "operating_expense": 1750000,
  "gross_profit": 1290000,
  "net_profit": -460000,
  "profit_margin": -0.2359,
  "data_status": "complete",
  "trace_status": "traceable",
  "data_quality_warnings": []
}
```

---

### 2. `get_finance_breakdown`

#### Purpose

Menjelaskan komponen Revenue, Direct Cost, dan Operating Expense.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "breakdown_type": "all"
}
```

Allowed `breakdown_type`:

- `revenue`
- `direct_cost`
- `operating_expense`
- `all`

#### Outputs

```json
{
  "period": "2026-06",
  "items": [
    {
      "group": "revenue",
      "category": "consultation",
      "label": "Consultation",
      "amount": 750000,
      "pct_of_total": 0.3846
    },
    {
      "group": "operating_expense",
      "category": "salary",
      "label": "Salary",
      "amount": 1000000,
      "pct_of_total": 0.5714
    }
  ],
  "data_status": "complete",
  "trace_status": "traceable"
}
```

---

### 3. `get_growth_trend`

#### Purpose

Menampilkan tren Revenue, Net Profit, Margin, Cost, dan Visits.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period_grain": "month",
  "period_count": 6,
  "metrics": ["total_revenue", "net_profit", "total_visits"]
}
```

#### Outputs

```json
{
  "period_grain": "month",
  "labels": ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"],
  "datasets": [
    {
      "metric": "total_revenue",
      "label": "Revenue",
      "values": [1000000, 1200000, 1400000, 1500000, 1700000, 1950000]
    },
    {
      "metric": "net_profit",
      "label": "Net Profit",
      "values": [100000, 200000, 250000, 100000, -200000, -460000]
    }
  ],
  "data_status": "complete"
}
```

---

### 4. `explain_profit_change`

#### Purpose

Menjawab “kenapa laba naik/turun?” dengan driver terstruktur.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "current_period": "2026-06",
  "comparison_period": "2026-05"
}
```

#### Outputs

```json
{
  "current_period": "2026-06",
  "comparison_period": "2026-05",
  "net_profit_current": -460000,
  "net_profit_previous": -200000,
  "change_amount": -260000,
  "change_pct": -1.3,
  "drivers": [
    {
      "driver": "operating_expense_increase",
      "impact_amount": -300000,
      "severity": "high",
      "explanation": "Operating Expense naik lebih besar daripada kenaikan Revenue."
    }
  ],
  "data_status": "complete",
  "trace_status": "traceable",
  "data_quality_warnings": []
}
```

---

### 5. `get_data_quality_status`

#### Purpose

Memberikan status reliabilitas angka finance.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "scope": "finance"
}
```

#### Outputs

```json
{
  "period": "2026-06",
  "scope": "finance",
  "overall_status": "complete",
  "warnings": [
    {
      "rule_id": "missing_direct_cost",
      "severity": "high",
      "message": "Direct Cost belum lengkap. Net Profit ditampilkan sebagai estimasi.",
      "affected_count": 12
    }
  ]
}
```

---

### 6. `get_doctor_profitability`

#### Purpose

Menampilkan profitabilitas dokter. Ini **bukan MVP Phase 1 final** jika allocation method belum disetujui.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "limit": 10,
  "sort": "net_profit_desc"
}
```

#### Outputs

```json
{
  "period": "2026-06",
  "allocation_method": "direct_or_estimated",
  "items": [
    {
      "doctor_id": "doc_001",
      "doctor_name": "dr. A",
      "visit_count": 320,
      "revenue": 52000000,
      "direct_cost": 21000000,
      "allocated_cost": 8000000,
      "net_profit": 23000000,
      "profit_margin": 0.442,
      "data_status": "estimated"
    }
  ],
  "data_quality_warnings": [
    {
      "rule_id": "estimated_cost_allocation",
      "severity": "medium",
      "message": "Profitability dokter memakai alokasi biaya estimasi."
    }
  ]
}
```

---

### 7. `get_poli_profitability`

#### Purpose

Menampilkan profitabilitas per poli. Ditunda sampai allocation rule cukup matang.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "limit": 10,
  "sort": "net_profit_desc"
}
```

#### Outputs

```json
{
  "period": "2026-06",
  "allocation_method": "direct_or_estimated",
  "items": [
    {
      "poli_id": "poli_001",
      "poli_name": "Poli Umum",
      "visit_count": 500,
      "revenue": 75000000,
      "direct_cost": 30000000,
      "allocated_cost": 15000000,
      "net_profit": 30000000,
      "profit_margin": 0.4,
      "data_status": "estimated"
    }
  ]
}
```

---

## Inputs

Common input fields:

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "current_period": "2026-06",
  "comparison_period": "2026-05",
  "period_grain": "month",
  "period_count": 6,
  "metrics": ["total_revenue", "net_profit"],
  "breakdown_type": "all",
  "limit": 10,
  "sort": "net_profit_desc"
}
```

Backend-resolved fields:

```json
{
  "tenant_id": "resolved_from_context",
  "actor_id": "resolved_from_auth",
  "role": "owner",
  "clinic_scope": ["clinic_001"],
  "timezone": "Asia/Jakarta",
  "currency": "IDR"
}
```

Input validation:

- `clinic_id` must be within actor clinic scope.
- `period` and comparison period must use valid `YYYY-MM` format.
- `period_count` must be bounded to avoid heavy reads.
- `metrics`, `breakdown_type`, and `sort` must use allowlists.
- `tenant_id` from user input must be ignored or validated against backend context.

---

## Outputs

Common output metadata:

```json
{
  "meta": {
    "tenant_id": "klinik_001",
    "clinic_id": "clinic_001",
    "period": "2026-06",
    "generated_at": "2026-06-30T17:00:00+07:00",
    "data_status": "complete",
    "trace_status": "traceable",
    "data_quality_warnings": []
  }
}
```

Finance-specific output requirements:

- Always include `period`.
- Always include `basis` for finance calculation if available.
- Always include `data_status`.
- Always include `trace_status` for financial metrics.
- Include `data_quality_warnings` when status is not fully reliable.
- Do not return raw source rows or patient-sensitive data.

---

## Prompt Template

### System Prompt Template

```text
Kamu adalah AI Clinic CFO Copilot untuk owner klinik.

Jawab hanya berdasarkan data dari approved MCP Finance tools.
Jangan mengarang angka.
Jangan membaca atau meminta raw spreadsheet unrestricted.
Jangan menyebut angka finance sebagai final jika data_status bukan complete atau trace_status bukan traceable.

Setiap jawaban finance wajib menyebut:
- period
- clinic scope
- basis perhitungan
- data_status
- trace_status
- caveat jika estimated/incomplete
- next action yang praktis untuk owner

Gunakan Bahasa Indonesia santai-profesional.
Istilah dashboard boleh pakai English familiar: Revenue, Gross Profit, Net Profit, Margin, Cost, Finance Breakdown, Data Quality.
```

### User Prompt Handling Template

```text
User question: {{user_question}}
Resolved context:
- tenant_id: {{tenant_id_from_context}}
- clinic_id: {{clinic_id}}
- role: {{role}}
- period: {{period}}

Tool plan:
1. Jika user tanya laba/ringkasan finance, call get_profit_summary.
2. Jika user tanya komponen biaya/revenue, call get_finance_breakdown.
3. Jika user tanya tren, call get_growth_trend.
4. Jika user tanya penyebab perubahan, call explain_profit_change.
5. Jika data_status tidak complete, call get_data_quality_status.

Answer format:
- Jawaban utama singkat.
- Angka penting.
- Alasan/driver.
- Data Quality caveat.
- Saran next action.
```

### Example Answer Template

```text
MasBro, untuk Period {{period}}, Net Profit klinik {{clinic_name}} adalah {{net_profit_formatted}} dengan Margin {{profit_margin_formatted}}.

Ringkasnya:
- Revenue: {{revenue}}
- Direct Cost: {{direct_cost}}
- Operating Expense: {{operating_expense}}
- Gross Profit: {{gross_profit}}
- Net Profit: {{net_profit}}

Status data: {{data_status}} / {{trace_status}}.
{{caveat_if_any}}

Next action: {{recommended_action}}
```

---

## Error Handling

### Common Errors

| Error Code | Condition | AI Behavior |
|---|---|---|
| `UNAUTHORIZED` | user/token not valid | Say access is not allowed. Do not reveal data. |
| `FORBIDDEN` | role/clinic scope denied | Say user does not have access to that clinic/metric. |
| `DATA_NOT_FOUND` | no metric for period | Say data for period belum tersedia; suggest import/refresh. |
| `DATA_INCOMPLETE` | missing required finance component | Explain metric is incomplete; do not present final result. |
| `TRACEABILITY_FAILED` | finance trace missing | Mark number as estimated/incomplete. |
| `INVALID_PERIOD` | bad period | Ask for valid period/month. |
| `TOOL_NOT_ALLOWED` | unapproved tool | Refuse and explain only approved metrics are available. |

### Error Response Shape

```json
{
  "success": false,
  "error": {
    "code": "DATA_INCOMPLETE",
    "message": "Operating Expense belum tersedia untuk period ini."
  },
  "meta": {
    "period": "2026-06",
    "data_status": "incomplete"
  }
}
```

### AI Fallback Behavior

If tool fails:

1. Do not guess numbers.
2. Mention exact missing context/data.
3. Suggest operational next step:
   - import ulang data.
   - cek Data Quality.
   - cek mapping template.
   - recompute metrics.

---

## Security Consideration

### Tenant Isolation

- `tenant_id` resolved by backend from authenticated context.
- Tool input `tenant_id` must be ignored or validated against context.
- Cross-tenant request returns `FORBIDDEN`.
- Every tool call logged in `log_audit`.

### Role Access

Recommended access:

| Role | Access |
|---|---|
| Owner | Full finance tools. |
| Manager | Configurable finance access. |
| Staff | No finance tools by default. |
| System | Internal scheduled calls only. |

### Data Protection

- Do not expose raw patient data.
- Do not expose diagnosis/medical notes.
- Do not expose raw spreadsheet payloads.
- Use aggregate metrics only.

### Accounting Guardrail

- `complete + traceable` = may answer as reliable management finance metric.
- `estimated` = answer as estimate, not final accounting report.
- `incomplete` = warn that decision-making should wait until data is completed.
- `not_traceable` = do not present as final.

### Audit Fields

Every MCP Finance call should log:

```json
{
  "tenant_id": "klinik_001",
  "actor_id": "user_001",
  "tool_name": "get_profit_summary",
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "created_at": "2026-06-09T10:00:00+07:00",
  "result_status": "success"
}
```
