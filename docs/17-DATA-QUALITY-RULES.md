# Data Quality Rules

## Purpose

Dokumen ini mendefinisikan rule Data Quality untuk MVP V1 AI Clinic CFO Copilot.

Data Quality dipakai untuk mencegah Dashboard/API/AI menyajikan angka bisnis yang terlihat final padahal data belum lengkap atau belum traceable.

---

## MVP V1 Scope

Rules difokuskan pada Finance Dashboard:

- Revenue completeness.
- Direct Cost completeness.
- Operating Expense completeness.
- Finance traceability.
- Journal trace readiness.

---

## Status Model

### Rule Status

| Status | Meaning |
|---|---|
| `open` | Masalah masih aktif. |
| `resolved` | Masalah sudah diperbaiki. Future use. |

### Severity

| Severity | Meaning |
|---|---|
| `critical` | Angka tidak boleh dianggap final. |
| `high` | Angka berisiko incomplete/estimated. |
| `medium` | Perlu review tetapi tidak selalu blocking. |
| `low` | Informational. |

---

## MVP Rules

### `missing_revenue`

Revenue tidak ditemukan untuk period.

- Severity: `critical`
- Affected sheet: `fact_revenue`
- Impact: `data_status = incomplete`
- AI behavior: jangan menjawab laba final.

### `missing_direct_cost`

Direct Cost tidak tersedia untuk period.

- Severity: `high`
- Affected sheet: `fact_cost`
- Impact: `data_status = incomplete`
- AI behavior: Net Profit belum final.

### `missing_operating_expense`

Operating Expense tidak tersedia untuk period.

- Severity: `high`
- Affected sheet: `fact_expense`
- Impact: `data_status = incomplete`
- AI behavior: Net Profit belum lengkap.

### `missing_finance_trace`

Revenue atau finance metric tidak lengkap trace-nya.

- Severity: `critical`
- Affected sheet: `fact_revenue` or metric source.
- Impact: `trace_status = partially_traceable` or `not_traceable`
- AI behavior: angka hanya boleh disebut estimasi/incomplete.

### `missing_journal_entry`

Fact Cost/Expense tidak punya `journal_entry_id` atau journal trace.

- Severity: `critical`
- Affected sheet: `fact_cost` / `fact_expense`
- Impact: dashboard tidak boleh menganggap metric final.

---

## Future Rules

### `unbalanced_journal_entry`

Debit dan credit untuk journal entry tidak balance.

- Severity: `critical`
- Future hardening.

### `missing_coa_mapping`

Category belum punya COA mapping.

- Severity: `high`
- Future hardening.

### `missing_source_row_id`

Fact row tidak punya source row.

- Severity: `critical`
- Future hardening.

### `missing_sync_id`

Fact row tidak punya sync id.

- Severity: `critical`
- Future hardening.

### `invalid_period`

Date row tidak sesuai period.

- Severity: `medium`
- Future hardening.

### `duplicate_source_row`

Source row duplicate dalam sync/period.

- Severity: `high`
- Future hardening.

---

## Storage

Rules disimpan di sheet `metric_data_quality`:

| Column | Meaning |
|---|---|
| `tenant_id` | Tenant scope. |
| `clinic_id` | Clinic scope. |
| `period` | Period/month. |
| `rule_id` | Rule identifier. |
| `severity` | critical/high/medium/low. |
| `status` | open/resolved. |
| `affected_sheet` | Sheet yang terkena. |
| `affected_count` | Jumlah row terdampak. |
| `message` | Human-readable message. |
| `created_at` | Timestamp. |

---

## Dashboard Behavior

Dashboard reads `metric_data_quality` and displays active `open` warnings.

If no active warnings:

```text
Tidak ada active warning.
```

If warnings exist:

- `critical`: red/high attention.
- `high`: warning.
- `medium` / `low`: informational.

---

## AI Behavior

AI must follow these rules:

- If critical DQ rule exists, do not present finance as final.
- If direct cost or operating expense missing, say Net Profit belum final.
- If traceability warning exists, say angka masih estimated/incomplete.
- Always explain next operational fix.

Example:

```text
MasBro, angka Net Profit bulan ini belum bisa dianggap final karena Direct Cost belum lengkap dan sebagian journal trace belum tersedia. Next action: cek import biaya langsung dan jalankan recompute metrics setelah data dilengkapi.
```
