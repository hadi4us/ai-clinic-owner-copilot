# MCP Executive

## Purpose

MCP Executive mendesain tool contract untuk AI layer yang menghasilkan ringkasan owner-level lintas domain: Finance, BPJS, Pharmacy, Growth, Data Quality, dan business risks.

MCP Executive berperan sebagai **Virtual Business Analyst / Executive Briefing Assistant**.

Contoh pertanyaan atau use case:

- “Kasih ringkasan bisnis klinik hari ini.”
- “Apa hal paling penting minggu ini?”
- “Bulan ini klinik sehat nggak?”
- “Apa 3 risiko terbesar yang harus saya cek?”
- “Buat executive briefing untuk owner.”
- “Apa next action paling penting?”

Status roadmap:

- Executive Briefing adalah Phase 3.
- MCP Executive sebaiknya aktif setelah Finance foundation stabil, lalu bisa menambahkan BPJS/Pharmacy jika modulnya aktif.
- Untuk Phase 1, dokumen ini adalah desain sistem, bukan implementasi.

---

## Source of Truth

MCP Executive hanya boleh membaca approved summary metrics/API dari module lain:

Finance:

- `metric_monthly_summary`
- `metric_growth_trend`
- `metric_finance_breakdown`
- `metric_profit_change_driver`

BPJS future:

- `metric_bpjs_receivable_summary`
- `metric_bpjs_aging`

Pharmacy future:

- `metric_inventory_risk_summary`
- `metric_pharmacy_margin`

Data Quality:

- `metric_data_quality`

Executive future:

- `metric_executive_summary`
- `metric_business_risk`
- `metric_owner_action_item`

MCP Executive must not access raw unrestricted sheets.

---

## Tools

### 1. `get_daily_executive_summary_data`

#### Purpose

Menghasilkan data ringkasan harian untuk owner.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "date": "2026-06-09",
  "include_modules": ["finance", "bpjs", "pharmacy", "data_quality"]
}
```

#### Outputs

```json
{
  "date": "2026-06-09",
  "clinic_id": "clinic_001",
  "summary_cards": [
    {
      "module": "finance",
      "title": "Revenue Hari Ini",
      "value": 12500000,
      "change_label": "+8% vs kemarin",
      "severity": "normal"
    },
    {
      "module": "data_quality",
      "title": "Data Quality",
      "value": "estimated",
      "severity": "warning"
    }
  ],
  "top_insights": [
    {
      "priority": 1,
      "module": "finance",
      "severity": "high",
      "message": "Operating Expense naik lebih cepat dari Revenue."
    }
  ],
  "recommended_actions": [
    "Cek komponen Operating Expense terbesar minggu ini."
  ],
  "data_status": "estimated",
  "data_quality_warnings": []
}
```

---

### 2. `get_weekly_owner_summary_data`

#### Purpose

Menghasilkan ringkasan mingguan owner.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "week_start": "2026-06-01",
  "week_end": "2026-06-07",
  "include_modules": ["finance", "bpjs", "pharmacy", "growth"]
}
```

#### Outputs

```json
{
  "period_start": "2026-06-01",
  "period_end": "2026-06-07",
  "headline": "Revenue naik, tapi Net Profit masih tertekan oleh Cost.",
  "highlights": [
    {
      "module": "finance",
      "label": "Revenue",
      "value": 78000000,
      "change_pct": 0.08,
      "interpretation": "Revenue naik dibanding minggu sebelumnya."
    },
    {
      "module": "finance",
      "label": "Net Profit",
      "value": 12000000,
      "change_pct": -0.15,
      "interpretation": "Net Profit turun karena Cost naik."
    }
  ],
  "risks": [
    {
      "module": "bpjs",
      "risk_level": "high",
      "message": "Piutang BPJS >60 hari meningkat."
    }
  ],
  "recommended_actions": [
    "Review 3 kategori Cost terbesar.",
    "Follow-up klaim BPJS approved_unpaid >60 hari."
  ],
  "data_status": "estimated"
}
```

---

### 3. `get_monthly_business_review_data`

#### Purpose

Menghasilkan data Monthly Business Review untuk owner.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "comparison_period": "2026-05",
  "include_modules": ["finance", "bpjs", "pharmacy", "growth", "data_quality"]
}
```

#### Outputs

```json
{
  "period": "2026-06",
  "comparison_period": "2026-05",
  "executive_headline": "Bulan ini Revenue naik, tetapi Net Profit turun karena Operating Expense meningkat.",
  "finance": {
    "total_revenue": 1950000,
    "net_profit": -460000,
    "profit_margin": -0.2359,
    "data_status": "complete",
    "trace_status": "traceable"
  },
  "growth": {
    "revenue_growth_pct": 0.12,
    "net_profit_growth_pct": -0.3,
    "visit_growth_pct": 0.1
  },
  "top_drivers": [
    {
      "module": "finance",
      "driver": "operating_expense_increase",
      "impact_amount": -300000,
      "explanation": "Operating Expense naik lebih besar dibanding Revenue."
    }
  ],
  "top_risks": [
    {
      "module": "data_quality",
      "risk_level": "medium",
      "message": "Sebagian biaya masih estimated."
    }
  ],
  "recommended_actions": [
    "Cek detail Operating Expense terbesar.",
    "Pastikan direct cost sudah lengkap supaya Net Profit akurat."
  ],
  "data_status": "complete"
}
```

---

### 4. `get_owner_action_items`

#### Purpose

Memberikan daftar prioritas tindakan owner berdasarkan risiko lintas modul.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "max_items": 5,
  "include_modules": ["finance", "bpjs", "pharmacy", "data_quality"]
}
```

#### Outputs

```json
{
  "period": "2026-06",
  "items": [
    {
      "priority": 1,
      "module": "finance",
      "severity": "high",
      "title": "Review Operating Expense",
      "reason": "Operating Expense naik dan menekan Net Profit.",
      "suggested_owner_action": "Minta manager kirim breakdown expense kategori salary/rent/marketing minggu ini."
    },
    {
      "priority": 2,
      "module": "data_quality",
      "severity": "medium",
      "title": "Lengkapi direct cost",
      "reason": "Net Profit bisa estimated jika direct cost belum lengkap.",
      "suggested_owner_action": "Pastikan file cost/HPP sudah diimport."
    }
  ],
  "data_status": "estimated"
}
```

---

### 5. `get_business_risk_summary`

#### Purpose

Memberikan ringkasan risiko bisnis lintas Finance, BPJS, Pharmacy, dan Data Quality.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "risk_level_min": "medium"
}
```

#### Outputs

```json
{
  "period": "2026-06",
  "overall_risk_level": "high",
  "risks": [
    {
      "module": "finance",
      "risk_level": "high",
      "risk_type": "profit_pressure",
      "message": "Net Profit negatif karena Operating Expense tinggi.",
      "impact": "Owner perlu review Cost agar Margin membaik."
    },
    {
      "module": "pharmacy",
      "risk_level": "medium",
      "risk_type": "inventory_expiry",
      "message": "Ada stok mendekati expiry.",
      "impact": "Potensi write-off stok."
    }
  ],
  "data_status": "estimated"
}
```

---

### 6. `send_owner_alert`

#### Purpose

Future notification tool untuk mengirim alert penting ke owner.

Status:

- Future only.
- Requires stricter authorization.
- Requires verified recipient.
- Should not be active in Phase 1 unless explicitly approved.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "alert_type": "profit_drop",
  "severity": "high",
  "message_template_id": "owner_profit_drop_v1",
  "recipient_id": "verified_owner_recipient"
}
```

#### Outputs

```json
{
  "sent": true,
  "channel": "telegram",
  "recipient_id": "verified_owner_recipient",
  "audit_id": "audit_001"
}
```

---

## Inputs

Common input fields:

```json
{
  "clinic_id": "clinic_001",
  "date": "2026-06-09",
  "period": "2026-06",
  "comparison_period": "2026-05",
  "include_modules": ["finance", "bpjs", "pharmacy", "data_quality"],
  "max_items": 5,
  "risk_level_min": "medium"
}
```

Backend-resolved fields:

```json
{
  "tenant_id": "resolved_from_context",
  "actor_id": "resolved_from_auth",
  "role": "owner",
  "clinic_scope": ["clinic_001"]
}
```

Input validation:

- `clinic_id` must be within actor scope.
- `period` and dates must be valid.
- `include_modules` must use allowlist.
- inactive modules must be omitted or marked unavailable.
- notification recipient must be verified for send tools.

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
    "included_modules": ["finance", "data_quality"],
    "excluded_modules": ["bpjs", "pharmacy"],
    "data_status": "estimated",
    "data_quality_warnings": []
  }
}
```

Executive-specific requirements:

- distinguish active vs unavailable modules.
- avoid pretending BPJS/Pharmacy data exists if modules are inactive.
- include caveats for estimated/incomplete data.
- prioritize only actionable owner-level insights.

---

## Prompt Template

### System Prompt Template

```text
Kamu adalah AI Clinic CFO Copilot untuk Executive Briefing owner klinik.
Jawab hanya berdasarkan approved MCP Executive tools dan approved summary metrics.
Jangan mengarang angka atau insight.
Jangan expose raw data, patient data, diagnosis, atau data medis sensitif.

Setiap executive answer wajib:
- ringkas dan owner-friendly
- menyebut period/date dan clinic scope
- menyebut data_status
- menyebut module yang datanya belum tersedia
- membedakan fakta, estimasi, dan rekomendasi
- memberi 1–3 next action paling penting

Gunakan Bahasa Indonesia santai-profesional.
Istilah bisnis boleh pakai English familiar: Revenue, Net Profit, Margin, Cost, Data Quality, Risk.
```

### User Prompt Handling Template

```text
User question: {{user_question}}
Resolved context:
- tenant_id: {{tenant_id}}
- clinic_id: {{clinic_id}}
- role: {{role}}

Tool plan:
1. Jika user minta ringkasan harian, call get_daily_executive_summary_data.
2. Jika user minta ringkasan mingguan, call get_weekly_owner_summary_data.
3. Jika user minta review bulanan, call get_monthly_business_review_data.
4. Jika user minta prioritas tindakan, call get_owner_action_items.
5. Jika user tanya risiko, call get_business_risk_summary.
6. Jika user minta kirim alert, validate permission and recipient before send_owner_alert.

Answer format:
- Headline.
- 3 angka/insight penting.
- Risiko utama.
- Data Quality caveat.
- Next actions.
```

### Example Answer Template

```text
MasBro, executive summary untuk {{period}}:

Headline: {{headline}}

Yang paling penting:
1. {{highlight_1}}
2. {{highlight_2}}
3. {{highlight_3}}

Risiko utama:
{{top_risks}}

Status data: {{data_status}}.
{{module_caveat_if_any}}

Next action:
{{recommended_actions}}
```

---

## Error Handling

| Error Code | Condition | AI Behavior |
|---|---|---|
| `DATA_NOT_FOUND` | summary metrics unavailable | Say summary belum tersedia; suggest compute/import metrics. |
| `MODULE_NOT_ENABLED` | BPJS/Pharmacy not active | Exclude module and mention not active yet. |
| `DATA_INCOMPLETE` | critical metric incomplete | Include caveat; avoid firm conclusion. |
| `FORBIDDEN` | user not allowed | Do not reveal executive data. |
| `TOOL_NOT_ALLOWED` | send/summary tool disabled | Explain tool belum aktif. |
| `NOTIFICATION_NOT_VERIFIED` | recipient invalid | Do not send; ask admin verification. |

Error response example:

```json
{
  "success": false,
  "error": {
    "code": "MODULE_NOT_ENABLED",
    "message": "Pharmacy module belum aktif untuk tenant ini."
  },
  "meta": {
    "included_modules": ["finance"],
    "excluded_modules": ["pharmacy"]
  }
}
```

---

## Security Consideration

### Tenant and Role Scope

- Executive tools require verified `tenant_id`.
- Owner role recommended for full executive summaries.
- Manager role may access limited operational executive summaries if configured.
- Staff role should not access full executive finance summaries.

### Module Availability

MCP Executive must respect module flags:

- `finance_enabled`
- `bpjs_enabled`
- `pharmacy_enabled`
- `tax_enabled`
- `notifications_enabled`

If a module is disabled, tool must not fabricate insight.

### Privacy

MCP Executive should use aggregates only.

Must not expose:

- patient identity.
- diagnosis.
- medical notes.
- patient-level claim or prescription detail.

### Notification Security

For `send_owner_alert` and future send tools:

- recipient must be verified.
- outbound message must be audited.
- no sensitive patient data.
- no external send without explicit configuration.
- severity rules must avoid spam.

### Audit

Every MCP Executive call should log:

```json
{
  "tenant_id": "klinik_001",
  "actor_id": "user_001",
  "tool_name": "get_monthly_business_review_data",
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "included_modules": ["finance", "data_quality"],
  "created_at": "2026-06-30T17:00:00+07:00",
  "result_status": "success"
}
```

### Decision Safety

Executive insights should be phrased as decision support, not absolute instruction.

AI should say:

- “prioritaskan review”
- “cek ulang mapping/source data”
- “minta manager validasi”

AI should avoid:

- “pecat dokter X”
- “hentikan layanan Y”
- “laporkan pajak dengan angka ini”
- “ubah terapi/prescription.”
