# Accounting Traceability

## Purpose

Dokumen ini menjelaskan desain MVP V1 untuk memastikan seluruh angka Finance Dashboard dapat ditelusuri ke sumber transaksi dan jurnal akuntansi yang valid.

Dokumen ini mengikuti aturan `CLAW.md`:

> Seluruh laporan keuangan harus dapat diturunkan dari jurnal akuntansi yang valid.
>
> Dashboard tidak boleh menghasilkan angka yang tidak dapat ditelusuri ke jurnal sumber.

---

## MVP V1 Scope

MVP V1 hanya menguatkan modul inti:

- Finance Dashboard.
- KPI Engine.
- Spreadsheet Data Warehouse.
- Data Quality.
- Accounting Traceability.

MVP V1 belum mencakup:

- BPJS Dashboard.
- Pharmacy Dashboard.
- Telegram/WhatsApp bot.
- Full AI chat.
- Tax filing.
- SaaS billing.

---

## Traceability Chain

Setiap angka Finance harus mengikuti chain:

```text
source row
→ staging row
→ fact row
→ journal_entry + journal_line
→ finance_trace_map
→ metric row
→ Dashboard/API/AI answer
```

Jika salah satu link kritis hilang, angka tidak boleh disebut final.

---

## Required Trace Fields

Minimal setiap finance fact row harus memiliki:

- `tenant_id`
- `clinic_id`
- `source_row_id`
- `sync_id`
- `journal_entry_id`
- `trace_status`

Metric row harus memiliki:

- `data_status`
- `trace_status`
- `trace_summary_json`

---

## Trace Status

| Status | Meaning | Dashboard Behavior |
|---|---|---|
| `traceable` | Semua finance fact row punya source dan journal trace. | Boleh tampil sebagai management metric reliable. |
| `partially_traceable` | Sebagian row traceable, sebagian belum. | Tampil sebagai estimasi, wajib caveat. |
| `not_traceable` | Tidak ada trace valid. | Tidak boleh dianggap final. |
| `not_applicable` | Tidak ada row untuk scope tertentu. | Digunakan untuk komponen kosong/non-finance. |

---

## Data Status

| Status | Meaning |
|---|---|
| `complete` | Revenue, Direct Cost, Operating Expense tersedia dan traceable. |
| `estimated` | Data utama tersedia tapi trace belum penuh. |
| `incomplete` | Komponen utama kosong atau trace gagal. |

Rule MVP V1:

```text
complete = revenue exists + direct cost exists + operating expense exists + trace_status traceable
estimated = component exists but trace_status partially_traceable
incomplete = missing finance component or trace_status not_traceable
```

---

## Spreadsheet Tables

### `cfg_coa`

Chart of Accounts minimal untuk MVP.

Required columns:

- `tenant_id`
- `coa_id`
- `coa_code`
- `coa_name`
- `coa_type`
- `normal_balance`
- `category`
- `active`

### `journal_entry`

Journal header.

Required columns:

- `tenant_id`
- `clinic_id`
- `journal_entry_id`
- `period`
- `entry_date`
- `source_type`
- `source_id`
- `source_row_id`
- `sync_id`
- `description`
- `entry_status`
- `created_at`

### `journal_line`

Balanced debit/credit lines.

Required columns:

- `tenant_id`
- `clinic_id`
- `journal_line_id`
- `journal_entry_id`
- `coa_id`
- `debit`
- `credit`
- `line_memo`
- `created_at`

### `finance_trace_map`

Mapping dari metric ke fact/source/journal.

Required columns:

- `tenant_id`
- `clinic_id`
- `metric_scope`
- `metric_key`
- `period`
- `fact_sheet`
- `fact_id`
- `journal_entry_id`
- `source_row_id`
- `sync_id`
- `trace_status`
- `created_at`

---

## Data Quality Rules

MVP V1 rules:

| Rule ID | Severity | Condition |
|---|---|---|
| `missing_revenue` | critical | Revenue kosong untuk period. |
| `missing_direct_cost` | high | Direct Cost kosong untuk period. |
| `missing_operating_expense` | high | Operating Expense kosong untuk period. |
| `missing_finance_trace` | critical | Revenue tidak lengkap trace-nya. |
| `missing_journal_entry` | critical | Cost/Expense tidak punya journal trace. |
| `unbalanced_journal_entry` | critical | Debit dan credit journal tidak balance. Future hardening. |
| `missing_coa_mapping` | high | COA mapping tidak tersedia. Future hardening. |
| `missing_source_row_id` | critical | Fact row tidak punya source row. Future hardening. |
| `missing_sync_id` | critical | Fact row tidak punya sync id. Future hardening. |

---

## Dashboard Behavior

Dashboard wajib menampilkan:

- `Data status`
- `Trace status`
- Data Quality warning jika ada.

Jika `data_status != complete` atau `trace_status != traceable`:

- label profit harus menunjukkan estimasi/incomplete.
- AI tidak boleh menyebut angka sebagai final.
- owner harus diarahkan untuk memperbaiki import/mapping/journal trace.

---

## Current MVP Implementation Notes

MVP V1 fixture creates balanced synthetic journals for:

- 5 Revenue rows.
- 5 Direct Cost rows.
- 3 Operating Expense rows.

Expected fixture trace:

- `finance_trace_map`: 13 rows.
- `journal_entry`: 13 rows.
- `journal_line`: 26 rows.
- total debit = total credit.
- `metric_monthly_summary.trace_status = traceable`.
- `metric_monthly_summary.data_status = complete`.

---

## Non-Goals

MVP V1 traceability does not yet provide:

- official accounting close.
- tax filing support.
- bank reconciliation.
- full accrual accounting.
- automated COA mapping for every SIM Klinik vendor.
- external audit certification.

This is management accounting traceability foundation for owner BI.
