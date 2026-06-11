# MCP Pharmacy

## Purpose

MCP Pharmacy mendesain tool contract untuk AI layer yang menjawab pertanyaan owner tentang risiko inventory obat, nilai stok berisiko, slow-moving medicine, expiry risk, dan dampak farmasi terhadap profit klinik.

MCP Pharmacy berperan sebagai **Virtual Inventory Manager**.

Contoh pertanyaan yang harus bisa dijawab:

- “Obat apa yang mau expired?”
- “Berapa nilai stok berisiko?”
- “Obat mana yang slow-moving?”
- “Stok apa yang overstock?”
- “Apakah HPP obat bikin Margin turun?”
- “Apa rekomendasi tindakan untuk stok farmasi?”

Status roadmap:

- Pharmacy Dashboard adalah Phase 2.
- MCP Pharmacy sebaiknya aktif setelah data stock movement, expiry, dan cost obat stabil.
- Untuk Phase 1, dokumen ini adalah desain sistem, bukan implementasi.

---

## Source of Truth

MCP Pharmacy hanya boleh membaca approved metrics/API:

- `metric_inventory_risk_summary` future.
- `metric_inventory_risk_item` future.
- `metric_inventory_movement` future.
- `metric_pharmacy_margin` future.
- `metric_data_quality`.
- approved Apps Script Pharmacy endpoints.

Recommended future source/fact sheets:

- `raw_inventory_stock`
- `raw_inventory_movement`
- `raw_medicine_master`
- `stg_inventory_stock`
- `stg_inventory_movement`
- `fact_inventory_stock`
- `fact_inventory_movement`
- `fact_medicine_cost`
- `dim_medicine`

MCP Pharmacy tidak boleh membaca:

- patient medication history at patient level.
- diagnosis/medical notes.
- unrestricted raw inventory export.
- SIM Klinik source directly.

---

## Tools

### 1. `get_inventory_risks`

#### Purpose

Menjawab ringkasan stok obat yang berisiko berdasarkan expiry, overstock, slow-moving, dan stockout risk.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "as_of_date": "2026-06-30",
  "risk_level_min": "medium",
  "limit": 20
}
```

Allowed `risk_level_min`:

- `low`
- `medium`
- `high`
- `critical`

#### Outputs

```json
{
  "as_of_date": "2026-06-30",
  "total_risk_value": 17500000,
  "risk_item_count": 35,
  "items": [
    {
      "medicine_id": "med_001",
      "medicine_name": "Obat A",
      "risk_reason": "expiring_soon",
      "expiry_date": "2026-07-15",
      "stock_qty": 120,
      "unit_cost": 30000,
      "risk_value": 3600000,
      "risk_level": "high"
    }
  ],
  "data_status": "complete",
  "trace_status": "traceable",
  "data_quality_warnings": []
}
```

---

### 2. `get_expiring_medicines`

#### Purpose

Menampilkan obat yang akan expired dalam rentang hari tertentu.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "as_of_date": "2026-06-30",
  "days_until_expiry": 90,
  "limit": 50
}
```

#### Outputs

```json
{
  "as_of_date": "2026-06-30",
  "days_until_expiry": 90,
  "total_expiring_value": 9500000,
  "items": [
    {
      "medicine_id": "med_002",
      "medicine_name": "Obat B",
      "batch_ref": "batch_hash_002",
      "expiry_date": "2026-08-10",
      "days_to_expiry": 41,
      "stock_qty": 80,
      "unit_cost": 50000,
      "risk_value": 4000000,
      "risk_level": "critical"
    }
  ],
  "data_status": "complete"
}
```

---

### 3. `get_slow_moving_medicines`

#### Purpose

Menampilkan obat yang perputarannya lambat.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "lookback_days": 90,
  "limit": 50
}
```

#### Outputs

```json
{
  "period": "2026-06",
  "lookback_days": 90,
  "items": [
    {
      "medicine_id": "med_003",
      "medicine_name": "Obat C",
      "stock_qty": 200,
      "sold_qty_lookback": 5,
      "days_of_stock": 360,
      "stock_value": 6000000,
      "risk_level": "high",
      "recommendation": "Review pembelian ulang dan pertimbangkan promo/bundling sesuai aturan klinik."
    }
  ],
  "data_status": "estimated"
}
```

---

### 4. `get_stockout_risks`

#### Purpose

Menampilkan obat yang berisiko habis sebelum restock.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "as_of_date": "2026-06-30",
  "lookback_days": 30,
  "limit": 50
}
```

#### Outputs

```json
{
  "as_of_date": "2026-06-30",
  "items": [
    {
      "medicine_id": "med_004",
      "medicine_name": "Obat D",
      "stock_qty": 10,
      "avg_daily_usage": 3.5,
      "estimated_days_remaining": 2.9,
      "risk_level": "critical",
      "recommendation": "Prioritaskan restock jika obat ini aktif digunakan."
    }
  ],
  "data_status": "estimated"
}
```

---

### 5. `get_pharmacy_margin_summary`

#### Purpose

Menjawab kontribusi obat terhadap Revenue, COGS, dan Margin.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06"
}
```

#### Outputs

```json
{
  "period": "2026-06",
  "medicine_revenue": 50000000,
  "medicine_cogs": 32000000,
  "medicine_gross_profit": 18000000,
  "medicine_margin": 0.36,
  "margin_change_pct": -0.08,
  "data_status": "estimated",
  "trace_status": "partially_traceable",
  "data_quality_warnings": [
    {
      "rule_id": "missing_batch_cost",
      "severity": "high",
      "message": "Sebagian item obat belum punya unit cost/batch cost lengkap."
    }
  ]
}
```

---

### 6. `explain_inventory_risk`

#### Purpose

Menjelaskan penyebab utama risiko inventory dan rekomendasi tindakan.

#### Inputs

```json
{
  "clinic_id": "clinic_001",
  "as_of_date": "2026-06-30",
  "risk_scope": "all"
}
```

Allowed `risk_scope`:

- `expiry`
- `slow_moving`
- `overstock`
- `stockout`
- `all`

#### Outputs

```json
{
  "as_of_date": "2026-06-30",
  "total_risk_value": 17500000,
  "risk_level": "high",
  "drivers": [
    {
      "driver": "expiry_risk",
      "risk_value": 9500000,
      "explanation": "Sebagian stok akan expired dalam 90 hari."
    },
    {
      "driver": "slow_moving_stock",
      "risk_value": 6000000,
      "explanation": "Beberapa item memiliki days_of_stock tinggi dibanding pemakaian."
    }
  ],
  "recommended_actions": [
    "Review item high-risk sebelum pembelian baru.",
    "Prioritaskan penggunaan stok yang mendekati expiry jika sesuai kebutuhan klinis.",
    "Cek reorder rule untuk item stockout risk."
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
  "as_of_date": "2026-06-30",
  "risk_level_min": "medium",
  "days_until_expiry": 90,
  "lookback_days": 90,
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
- `period` and `as_of_date` must be valid.
- `limit` must be bounded.
- `risk_level_min` must use allowlist.
- `lookback_days` must be reasonable to avoid heavy scan.

---

## Outputs

Common output metadata:

```json
{
  "meta": {
    "tenant_id": "klinik_001",
    "clinic_id": "clinic_001",
    "period": "2026-06",
    "as_of_date": "2026-06-30",
    "generated_at": "2026-06-30T17:00:00+07:00",
    "data_status": "estimated",
    "trace_status": "partially_traceable",
    "data_quality_warnings": []
  }
}
```

Pharmacy-specific caveats:

- `unit_cost` may be missing.
- batch/expiry data may be incomplete.
- stock movement may not represent actual usage if manual adjustments are common.
- risk recommendations are operational suggestions, not clinical instructions.

---

## Prompt Template

### System Prompt Template

```text
Kamu adalah AI Clinic CFO Copilot dengan fokus Pharmacy/Inventory Risk.
Jawab hanya berdasarkan approved MCP Pharmacy tools.
Jangan mengarang angka stok, unit cost, expiry date, atau margin obat.
Jangan expose data pasien, diagnosis, resep pasien individual, atau data medis sensitif.

Setiap jawaban Pharmacy wajib menyebut:
- as_of_date atau period
- total risk value jika tersedia
- risk level
- item/category prioritas
- data_status
- caveat jika estimated/incomplete
- next action operasional

Penting: rekomendasi inventory boleh bersifat bisnis/operasional, bukan instruksi medis.
```

### User Prompt Handling Template

```text
User question: {{user_question}}
Resolved context:
- tenant_id: {{tenant_id}}
- clinic_id: {{clinic_id}}
- role: {{role}}

Tool plan:
1. Jika tanya stok berisiko umum, call get_inventory_risks.
2. Jika tanya expired, call get_expiring_medicines.
3. Jika tanya slow-moving, call get_slow_moving_medicines.
4. Jika tanya stok mau habis, call get_stockout_risks.
5. Jika tanya margin obat, call get_pharmacy_margin_summary.
6. Jika tanya penyebab risiko, call explain_inventory_risk.

Answer format:
- Jawaban utama.
- Item/risk terbesar.
- Dampak nilai stok atau margin.
- Caveat data quality.
- Next action.
```

### Example Answer Template

```text
MasBro, per {{as_of_date}}, nilai stok farmasi yang berisiko sekitar {{total_risk_value}}.
Risk level: {{risk_level}}.

Prioritas utama:
{{top_items}}

Status data: {{data_status}}.
{{caveat_if_any}}

Next action: {{recommended_action}}
```

---

## Error Handling

| Error Code | Condition | AI Behavior |
|---|---|---|
| `DATA_NOT_FOUND` | inventory metrics unavailable | Say Pharmacy data belum tersedia; suggest import inventory export. |
| `DATA_INCOMPLETE` | missing expiry/unit cost/movement | Explain risk value is estimated. |
| `INVALID_DATE` | invalid as_of_date | Ask for valid date. |
| `FORBIDDEN` | access denied | Do not reveal inventory data. |
| `TOOL_NOT_ALLOWED` | module not enabled | Say Pharmacy module belum aktif for tenant/phase. |
| `TRACEABILITY_FAILED` | medicine cost trace missing | Do not present pharmacy margin as final. |

Error response example:

```json
{
  "success": false,
  "error": {
    "code": "DATA_INCOMPLETE",
    "message": "Expiry date atau unit cost belum lengkap untuk sebagian stok."
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

- All Pharmacy tools require verified `tenant_id`.
- `clinic_id` must be checked against user clinic scope.
- Cross-tenant request returns `FORBIDDEN` and is audited.

### Privacy

MCP Pharmacy must not expose:

- patient names.
- prescription records tied to patient.
- diagnosis.
- clinical notes.
- individual patient medicine usage.

Allowed:

- aggregate stock.
- medicine-level inventory risk.
- batch-level pseudonymous reference if needed.
- operational recommendations.

### Role Access

| Role | Access |
|---|---|
| Owner | Full aggregate pharmacy risk and margin. |
| Manager | Inventory risk and operational stock follow-up. |
| Staff | Limited stock item follow-up if configured. |
| System | Scheduled refresh only. |

### Audit

Every MCP Pharmacy call should log:

```json
{
  "tenant_id": "klinik_001",
  "actor_id": "user_001",
  "tool_name": "get_inventory_risks",
  "clinic_id": "clinic_001",
  "as_of_date": "2026-06-30",
  "created_at": "2026-06-30T17:00:00+07:00",
  "result_status": "success"
}
```

### Clinical Safety

AI may recommend operational actions like:

- review purchasing.
- check stock before reorder.
- prioritize stock review.
- investigate slow-moving items.

AI must not recommend clinical substitutions, medication changes, or patient treatment actions.
