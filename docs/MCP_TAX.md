# MCP Tax

## Purpose

MCP Tax mendesain tool contract untuk AI layer yang membantu owner memahami estimasi pajak bisnis klinik berdasarkan approved finance metrics.

MCP Tax berperan sebagai **Tax Insight Assistant**, bukan pengganti akuntan, konsultan pajak, atau sistem pelaporan pajak resmi.

Contoh pertanyaan yang bisa dijawab di future phase:

- “Estimasi pajak bulan ini berapa?”
- “Revenue kategori apa yang relevan untuk pajak?”
- “Expense mana yang perlu dicek untuk deductibility?”
- “Apakah angka ini siap untuk laporan pajak?”
- “Apa data yang kurang untuk hitung pajak?”

Status roadmap:

- Tax Engine adalah future roadmap, bukan Phase 1.
- MCP Tax tidak boleh aktif sebagai final calculation sebelum COA, journal traceability, entity tax profile, dan aturan pajak disetujui.
- Untuk Phase 1, dokumen ini adalah desain sistem, bukan implementasi.

---

## Tax Guardrails

MCP Tax wajib mengikuti guardrails:

1. Bukan tax filing automation.
2. Bukan nasihat pajak resmi.
3. Tidak menggantikan akuntan/konsultan pajak.
4. Semua kalkulasi tenant-scoped.
5. Semua angka tax harus berbasis finance metrics yang traceable.
6. Jika finance metrics `estimated` atau `incomplete`, tax output wajib `estimated` atau `incomplete`.
7. AI wajib memberi caveat bahwa hasil adalah estimasi internal/business insight.
8. Jangan generate dokumen pajak resmi tanpa approval dan desain compliance khusus.

---

## Source of Truth

MCP Tax hanya boleh membaca approved metrics/API:

- `metric_monthly_summary`
- `metric_finance_breakdown`
- `metric_tax_estimate` future.
- `metric_tax_basis_summary` future.
- `metric_data_quality`
- `cfg_coa`
- `cfg_tax_profile` future.
- `journal_entry` / `journal_line` or approved trace summary.

MCP Tax tidak boleh membaca:

- raw unrestricted spreadsheet data.
- patient-level data.
- diagnosis/medical records.
- unverified manual tax assumptions.

---

## Tools

### 1. `get_tax_readiness_status`

#### Purpose

Menilai apakah data finance cukup siap untuk estimasi pajak.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "tax_scope": "monthly_estimate"
}
```

Allowed `tax_scope`:

- `monthly_estimate`
- `quarterly_estimate`
- `annual_review`

#### Outputs

```json
{
  "period": "2026-06",
  "tax_scope": "monthly_estimate",
  "readiness_status": "not_ready",
  "finance_data_status": "estimated",
  "trace_status": "partially_traceable",
  "blocking_issues": [
    {
      "rule_id": "finance_not_fully_traceable",
      "severity": "critical",
      "message": "Sebagian angka finance belum traceable ke jurnal/source valid."
    },
    {
      "rule_id": "missing_tax_profile",
      "severity": "critical",
      "message": "Tax profile tenant belum dikonfigurasi."
    }
  ],
  "recommendation": "Lengkapi journal trace dan tax profile sebelum memakai estimasi pajak."
}
```

---

### 2. `get_tax_basis_summary`

#### Purpose

Menampilkan basis data yang mungkin relevan untuk estimasi pajak, tanpa melakukan filing.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "basis": "management_pnl"
}
```

#### Outputs

```json
{
  "period": "2026-06",
  "basis": "management_pnl",
  "revenue_summary": [
    {
      "category": "consultation",
      "amount": 750000,
      "tax_treatment": "needs_tax_profile_mapping"
    },
    {
      "category": "medicine",
      "amount": 500000,
      "tax_treatment": "needs_tax_profile_mapping"
    }
  ],
  "expense_summary": [
    {
      "category": "salary",
      "amount": 1000000,
      "deductibility_status": "needs_review"
    }
  ],
  "net_profit": -460000,
  "finance_data_status": "complete",
  "trace_status": "traceable",
  "tax_readiness_status": "partial"
}
```

---

### 3. `estimate_tax_obligation`

#### Purpose

Memberi estimasi pajak internal berdasarkan tax profile dan finance metrics.

Status:

- Future only.
- Not allowed until `cfg_tax_profile` and tax rule versioning exist.
- Must always include disclaimer.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "tax_profile_id": "tax_profile_001",
  "estimate_type": "monthly_internal"
}
```

#### Outputs

```json
{
  "period": "2026-06",
  "estimate_type": "monthly_internal",
  "tax_profile_id": "tax_profile_001",
  "estimated_tax_amount": 0,
  "calculation_basis": "management_pnl_traceable_metrics",
  "components": [
    {
      "component": "income_tax_estimate",
      "basis_amount": -460000,
      "rate": null,
      "estimated_amount": 0,
      "notes": "Net Profit negatif; confirm with accountant for official treatment."
    }
  ],
  "data_status": "estimated",
  "trace_status": "traceable",
  "disclaimer": "Estimasi internal, bukan laporan pajak resmi dan bukan pengganti konsultan pajak."
}
```

---

### 4. `get_tax_risk_flags`

#### Purpose

Menampilkan potensi risiko atau gap data pajak.

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
  "overall_tax_risk": "high",
  "risk_flags": [
    {
      "risk_id": "missing_tax_profile",
      "risk_level": "high",
      "message": "Tax profile tenant belum dikonfigurasi.",
      "recommended_action": "Admin/owner perlu isi entity type, NPWP/business type, dan tax treatment dengan akuntan."
    },
    {
      "risk_id": "unmapped_coa_tax_treatment",
      "risk_level": "medium",
      "message": "Sebagian COA belum punya tax treatment mapping.",
      "recommended_action": "Review mapping COA dengan akuntan."
    }
  ],
  "data_status": "incomplete"
}
```

---

### 5. `explain_tax_estimate`

#### Purpose

Menjelaskan cara estimasi pajak dihitung, basis data, dan caveat.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "tax_estimate_id": "tax_est_001"
}
```

#### Outputs

```json
{
  "period": "2026-06",
  "tax_estimate_id": "tax_est_001",
  "explanation": "Estimasi dibuat dari metric finance bulan 2026-06 dengan basis management P&L. Angka belum menjadi laporan pajak resmi.",
  "basis_metrics": [
    {
      "metric": "total_revenue",
      "amount": 1950000,
      "trace_status": "traceable"
    },
    {
      "metric": "net_profit",
      "amount": -460000,
      "trace_status": "traceable"
    }
  ],
  "assumptions": [
    "Tax profile memakai konfigurasi tenant tax_profile_001.",
    "Treatment pajak mengikuti rule version tax_rule_v1."
  ],
  "limitations": [
    "Tidak menggantikan akuntan/konsultan pajak.",
    "Belum dapat dipakai sebagai dokumen filing resmi."
  ],
  "data_status": "estimated"
}
```

---

### 6. `get_deductibility_review_items`

#### Purpose

Menampilkan expense categories yang perlu direview untuk deductibility atau tax treatment.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "limit": 50
}
```

#### Outputs

```json
{
  "period": "2026-06",
  "items": [
    {
      "expense_category": "marketing",
      "amount": 3000000,
      "deductibility_status": "needs_review",
      "reason": "Tax treatment mapping belum dikonfirmasi.",
      "recommended_action": "Review bukti transaksi dan mapping dengan akuntan."
    }
  ],
  "data_status": "estimated"
}
```

---

## Inputs

Common input fields:

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "tax_scope": "monthly_estimate",
  "basis": "management_pnl",
  "tax_profile_id": "tax_profile_001",
  "estimate_type": "monthly_internal",
  "risk_level_min": "medium",
  "limit": 50
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
- `period` must be valid.
- `tax_profile_id` must belong to tenant.
- `tax_scope`, `estimate_type`, and `basis` must use allowlist.
- `limit` must be bounded.

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
    "data_status": "estimated",
    "trace_status": "traceable",
    "tax_readiness_status": "partial",
    "disclaimer": "Estimasi internal, bukan laporan pajak resmi."
  }
}
```

Tax-specific statuses:

| Status | Meaning |
|---|---|
| `ready` | Required finance trace and tax profile exist. Still internal estimate. |
| `partial` | Some mappings/rules incomplete. |
| `not_ready` | Missing critical tax profile, finance trace, or COA mapping. |

---

## Prompt Template

### System Prompt Template

```text
Kamu adalah AI Clinic CFO Copilot dengan fokus Tax Insight.
Kamu bukan konsultan pajak, bukan akuntan publik, dan tidak membuat laporan pajak resmi.
Jawab hanya berdasarkan approved MCP Tax tools dan approved finance metrics.
Jangan mengarang tarif, aturan pajak, atau kewajiban pajak jika tax profile/rule belum tersedia.

Setiap jawaban Tax wajib menyebut:
- period
- basis data
- tax_readiness_status
- data_status dan trace_status finance
- disclaimer bahwa ini estimasi internal, bukan filing resmi
- data yang masih kurang
- next action untuk owner/accountant

Jika data belum ready, jangan hitung angka final.
```

### User Prompt Handling Template

```text
User question: {{user_question}}
Resolved context:
- tenant_id: {{tenant_id}}
- clinic_id: {{clinic_id}}
- role: {{role}}

Tool plan:
1. Selalu cek get_tax_readiness_status lebih dulu.
2. Jika readiness not_ready, jangan estimate final; jelaskan blocking issues.
3. Jika user tanya basis pajak, call get_tax_basis_summary.
4. Jika user tanya estimasi, call estimate_tax_obligation hanya jika allowed/readiness cukup.
5. Jika user tanya risiko/gap, call get_tax_risk_flags.
6. Jika user tanya penjelasan hitungan, call explain_tax_estimate.
7. Jika user tanya expense review, call get_deductibility_review_items.

Answer format:
- Caveat/disclaimer singkat.
- Readiness status.
- Angka/basis jika tersedia dan allowed.
- Missing data/risk flags.
- Next action dengan akuntan/admin.
```

### Example Answer Template

```text
MasBro, untuk Period {{period}}, Tax Readiness status: {{tax_readiness_status}}.

Catatan penting: ini hanya estimasi internal, bukan laporan pajak resmi dan bukan pengganti konsultan pajak.

Basis data:
- Finance data_status: {{finance_data_status}}
- Trace status: {{trace_status}}
- Basis: {{basis}}

{{tax_estimate_or_blocking_issues}}

Next action: {{recommended_action}}
```

---

## Error Handling

| Error Code | Condition | AI Behavior |
|---|---|---|
| `MODULE_NOT_ENABLED` | Tax module disabled | Say Tax module belum aktif/future roadmap. |
| `TAX_PROFILE_MISSING` | no tax profile | Do not estimate; ask to configure profile with accountant. |
| `TAX_RULE_NOT_CONFIGURED` | no rule version | Do not estimate; say rule belum tersedia. |
| `DATA_INCOMPLETE` | finance data incomplete | Do not present final tax estimate. |
| `TRACEABILITY_FAILED` | finance metric not traceable | Reject final estimate; mark not ready. |
| `FORBIDDEN` | user lacks access | Do not reveal tax/finance data. |
| `INVALID_PERIOD` | invalid period | Ask for valid period. |

Error response example:

```json
{
  "success": false,
  "error": {
    "code": "TAX_PROFILE_MISSING",
    "message": "Tax profile tenant belum dikonfigurasi."
  },
  "meta": {
    "tax_readiness_status": "not_ready",
    "data_status": "incomplete"
  }
}
```

---

## Security Consideration

### Tenant and Role Scope

- All Tax tools require verified `tenant_id`.
- `clinic_id` must be checked against user clinic scope.
- Owner role recommended.
- Manager role can access only if configured.
- Staff role should not access Tax tools by default.

### Financial Sensitivity

Tax data is sensitive financial data. MCP Tax must:

- use least privilege.
- log every access.
- avoid exposing raw transactions.
- avoid sending tax summaries externally unless verified and approved.

### Accounting Traceability

MCP Tax depends on finance traceability:

- If finance metric is not `complete + traceable`, tax readiness cannot be `ready`.
- If journal/source trace missing, tax estimate must be blocked or marked `estimated/not_ready`.
- Tax output must include caveat.

### No Official Filing

MCP Tax must not:

- create official tax filing.
- submit tax reports.
- claim compliance certainty.
- invent tax rates or rules.
- replace accountant review.

### Audit

Every MCP Tax call should log:

```json
{
  "tenant_id": "klinik_001",
  "actor_id": "user_001",
  "tool_name": "get_tax_readiness_status",
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "created_at": "2026-06-30T17:00:00+07:00",
  "result_status": "success"
}
```

### External Communication

If future notification includes tax content:

- recipient must be verified.
- message must include disclaimer.
- no sensitive transaction-level data.
- no official filing language.
