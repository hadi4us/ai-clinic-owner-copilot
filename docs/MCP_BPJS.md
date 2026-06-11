# MCP BPJS

## Purpose

MCP BPJS mendesain tool contract untuk AI layer yang menjawab pertanyaan owner tentang piutang BPJS, claim aging, status pembayaran, dan risiko cashflow dari klaim BPJS.

MCP BPJS berperan sebagai **Virtual BPJS Receivables Analyst**.

Contoh pertanyaan yang harus bisa dijawab:

- “Berapa piutang BPJS yang belum cair?”
- “Klaim BPJS bulan mana yang paling besar belum dibayar?”
- “Berapa aging piutang BPJS > 60 hari?”
- “Apakah BPJS bikin cashflow klinik berat?”
- “Claim mana yang perlu dikejar dulu?”

Status roadmap:

- BPJS Dashboard adalah Phase 2.
- MCP BPJS sebaiknya aktif setelah data BPJS/fact claim stabil.
- Untuk Phase 1, dokumen ini adalah desain sistem, bukan implementasi.

---

## Source of Truth

MCP BPJS hanya boleh membaca dari approved metrics/API:

- `metric_bpjs_receivable_summary` future.
- `metric_bpjs_aging` future.
- `metric_bpjs_claim_status` future.
- `metric_data_quality`.
- approved Apps Script BPJS endpoints.

Recommended future source/fact sheets:

- `raw_bpjs_claim`
- `stg_bpjs_claim`
- `fact_bpjs_claim`
- `fact_bpjs_payment`
- `dim_payer`

MCP BPJS tidak boleh membaca:

- diagnosis/medical records.
- patient-level sensitive details.
- unrestricted raw BPJS export.
- SIM Klinik source directly.

---

## Tools

### 1. `get_bpjs_receivables`

#### Purpose

Menjawab total piutang BPJS outstanding per tanggal tertentu.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "as_of_date": "2026-06-30",
  "group_by": "service_month"
}
```

Allowed `group_by`:

- `service_month`
- `claim_month`
- `status`
- `clinic`
- `none`

#### Outputs

```json
{
  "clinic_id": "clinic_001",
  "as_of_date": "2026-06-30",
  "basis": "approved_amount_minus_paid_amount",
  "total_claimed": 150000000,
  "total_approved": 130000000,
  "total_paid": 42000000,
  "total_outstanding": 88000000,
  "data_status": "complete",
  "trace_status": "traceable",
  "data_quality_warnings": []
}
```

---

### 2. `get_bpjs_aging`

#### Purpose

Menampilkan aging piutang BPJS.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "as_of_date": "2026-06-30",
  "bucket_scheme": "standard"
}
```

#### Outputs

```json
{
  "as_of_date": "2026-06-30",
  "basis": "days_since_claim_submitted_or_approved",
  "aging": [
    {
      "bucket": "0-30",
      "amount": 35000000,
      "claim_count": 120
    },
    {
      "bucket": "31-60",
      "amount": 28000000,
      "claim_count": 95
    },
    {
      "bucket": "61-90",
      "amount": 15000000,
      "claim_count": 40
    },
    {
      "bucket": ">90",
      "amount": 10000000,
      "claim_count": 22
    }
  ],
  "total_outstanding": 88000000,
  "data_status": "complete"
}
```

---

### 3. `get_bpjs_claim_status_summary`

#### Purpose

Menjawab breakdown klaim BPJS berdasarkan status.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "basis_date": "claim_submitted_date"
}
```

#### Outputs

```json
{
  "period": "2026-06",
  "status_summary": [
    {
      "status": "submitted",
      "claim_count": 80,
      "amount": 30000000
    },
    {
      "status": "approved",
      "claim_count": 60,
      "amount": 25000000
    },
    {
      "status": "paid",
      "claim_count": 45,
      "amount": 18000000
    },
    {
      "status": "rejected",
      "claim_count": 5,
      "amount": 2000000
    }
  ],
  "data_status": "estimated",
  "data_quality_warnings": []
}
```

---

### 4. `get_bpjs_top_overdue_claims`

#### Purpose

Menampilkan daftar klaim/piutang prioritas yang perlu ditindaklanjuti.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "as_of_date": "2026-06-30",
  "min_days_overdue": 60,
  "limit": 20
}
```

#### Outputs

```json
{
  "as_of_date": "2026-06-30",
  "items": [
    {
      "claim_ref": "claim_hash_001",
      "service_month": "2026-03",
      "claim_submitted_date": "2026-04-05",
      "approved_amount": 5000000,
      "paid_amount": 0,
      "outstanding_amount": 5000000,
      "days_outstanding": 86,
      "status": "approved_unpaid",
      "risk_level": "high"
    }
  ],
  "data_status": "complete"
}
```

Patient identity must not be exposed. Use `claim_ref` or pseudonymous identifier only.

---

### 5. `explain_bpjs_cashflow_risk`

#### Purpose

Menjelaskan dampak piutang BPJS terhadap cashflow klinik.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "as_of_date": "2026-06-30",
  "comparison_period": "2026-05"
}
```

#### Outputs

```json
{
  "as_of_date": "2026-06-30",
  "total_outstanding": 88000000,
  "outstanding_change_amount": 15000000,
  "outstanding_change_pct": 0.205,
  "high_risk_amount": 25000000,
  "cashflow_risk_level": "high",
  "drivers": [
    {
      "driver": "aging_over_60_days_increase",
      "impact_amount": 12000000,
      "explanation": "Piutang BPJS >60 hari meningkat dibanding periode sebelumnya."
    }
  ],
  "recommended_actions": [
    "Prioritaskan follow-up klaim approved_unpaid >60 hari.",
    "Cek klaim rejected untuk perbaikan administrasi."
  ],
  "data_status": "complete"
}
```

---

## Inputs

Common input fields:

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "as_of_date": "2026-06-30",
  "group_by": "service_month",
  "limit": 20
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
- `period` must be valid `YYYY-MM`.
- `as_of_date` must be valid `YYYY-MM-DD`.
- `limit` must be bounded.
- `group_by` must use allowlist.

---

## Outputs

Common output metadata:

```json
{
  "meta": {
    "tenant_id": "klinik_001",
    "clinic_id": "clinic_001",
    "as_of_date": "2026-06-30",
    "generated_at": "2026-06-30T17:00:00+07:00",
    "data_status": "complete",
    "trace_status": "traceable",
    "data_quality_warnings": []
  }
}
```

BPJS-specific caveats:

- `basis`: whether outstanding is based on submitted, approved, or paid records.
- `aging_basis`: days from service date, claim submitted date, or approval date.
- `data_status`: whether claim/payment exports are complete.

---

## Prompt Template

### System Prompt Template

```text
Kamu adalah AI Clinic CFO Copilot dengan fokus BPJS Receivables.
Jawab hanya berdasarkan approved MCP BPJS tools.
Jangan mengarang angka klaim.
Jangan expose nama pasien, diagnosis, nomor rekam medis, atau data medis sensitif.
Gunakan claim_ref atau aggregate summary saja.

Setiap jawaban BPJS wajib menyebut:
- as_of_date atau period
- basis perhitungan outstanding
- total outstanding jika tersedia
- aging/cashflow risk jika relevan
- data_status
- caveat jika estimated/incomplete
- next action praktis
```

### User Prompt Handling Template

```text
User question: {{user_question}}
Resolved context:
- tenant_id: {{tenant_id}}
- clinic_id: {{clinic_id}}
- role: {{role}}

Tool plan:
1. Jika tanya total piutang BPJS, call get_bpjs_receivables.
2. Jika tanya umur piutang, call get_bpjs_aging.
3. Jika tanya status klaim, call get_bpjs_claim_status_summary.
4. Jika tanya klaim prioritas, call get_bpjs_top_overdue_claims.
5. Jika tanya dampak cashflow, call explain_bpjs_cashflow_risk.

Answer format:
- Jawaban utama.
- Angka/bucket penting.
- Risiko.
- Data Quality caveat.
- Next action.
```

### Example Answer Template

```text
MasBro, per {{as_of_date}}, estimasi piutang BPJS outstanding adalah {{total_outstanding}}.
Basis: {{basis}}.

Aging utama:
- 0–30 hari: {{bucket_0_30}}
- 31–60 hari: {{bucket_31_60}}
- 61–90 hari: {{bucket_61_90}}
- >90 hari: {{bucket_gt_90}}

Risk level: {{cashflow_risk_level}}.
Status data: {{data_status}}.
{{caveat_if_any}}

Next action: {{recommended_action}}
```

---

## Error Handling

| Error Code | Condition | AI Behavior |
|---|---|---|
| `DATA_NOT_FOUND` | BPJS metrics not available | Say BPJS data belum tersedia; suggest import BPJS export. |
| `DATA_INCOMPLETE` | payment/approval export missing | Explain outstanding is estimated. |
| `INVALID_PERIOD` | invalid period/as_of_date | Ask for valid period/date. |
| `FORBIDDEN` | user lacks clinic access | Do not reveal BPJS data. |
| `TOOL_NOT_ALLOWED` | BPJS tool not enabled | Say BPJS module belum aktif for tenant/phase. |
| `TRACEABILITY_FAILED` | claim/payment trace missing | Do not present as final receivable. |

Error response example:

```json
{
  "success": false,
  "error": {
    "code": "DATA_INCOMPLETE",
    "message": "BPJS payment export belum tersedia, outstanding hanya estimasi."
  },
  "meta": {
    "data_status": "estimated",
    "trace_status": "partially_traceable"
  }
}
```

---

## Security Consideration

### Tenant and Clinic Scope

- All BPJS tools require verified `tenant_id`.
- `clinic_id` must be checked against user clinic scope.
- Cross-tenant access must return `FORBIDDEN` and be audited.

### Privacy

BPJS data may contain patient-sensitive information. MCP BPJS must not expose:

- patient name.
- NIK.
- BPJS number.
- medical record number.
- diagnosis.
- procedure details that identify patient.
- doctor notes.

Allowed:

- aggregate amounts.
- aging buckets.
- claim counts.
- pseudonymous `claim_ref` for operational follow-up.

### Role Access

| Role | Access |
|---|---|
| Owner | Full aggregate BPJS receivables. |
| Manager | Aggregate + operational claim follow-up if configured. |
| Staff | Limited claim status only if explicitly allowed. |
| System | Scheduled refresh only. |

### Audit

Every MCP BPJS call should log:

```json
{
  "tenant_id": "klinik_001",
  "actor_id": "user_001",
  "tool_name": "get_bpjs_receivables",
  "clinic_id": "clinic_001",
  "as_of_date": "2026-06-30",
  "created_at": "2026-06-30T17:00:00+07:00",
  "result_status": "success"
}
```

### Financial Caveat

BPJS receivable should not be treated as cash. AI must distinguish:

- claimed amount.
- approved amount.
- paid amount.
- outstanding amount.
- rejected amount.

If payment data is missing, answer must clearly say outstanding is estimated.
