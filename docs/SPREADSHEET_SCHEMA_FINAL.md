# SPREADSHEET_SCHEMA_FINAL

Status: **Final Technical Architecture Review**  
Scope: Google Spreadsheet warehouse untuk MVP/Pilot **AI Clinic Owner Copilot**.  
Constraint: Tidak membuat SIM Klinik, tidak membuat double entry, tidak membuat kode.

Dokumen ini menetapkan schema spreadsheet final yang aman untuk Google Apps Script, multi-tenant-aware, traceable, dan cukup ringan untuk MVP.

---

## 1. Executive Verdict

Spreadsheet dapat dipakai sebagai warehouse MVP/Pilot **dengan batas tegas**:

- Cocok untuk 1-20 tenant pilot jika memakai **spreadsheet per tenant**.
- Cocok untuk dashboard owner yang membaca **KPI precomputed**, bukan raw scan.
- Tidak cocok untuk query SaaS 1000+ klinik dalam satu spreadsheet.
- Semua sheet transaksi wajib punya `tenant_id`, `clinic_id`, `sync_id`, `source_row_id`, `data_status`, dan `trace_status`.
- Angka finance tidak boleh dianggap final jika tidak traceable ke source row dan jurnal/finance trace.

Rekomendasi final: **gunakan spreadsheet per tenant untuk MVP**, dengan schema row tetap multi-tenant agar siap migrasi ke database di fase SaaS.

---

## 2. Design Principles

1. **SIM Klinik remains source of truth**  
   Spreadsheet hanya menerima export/API/sync. Tidak ada input ulang operasional.

2. **RAW-first import**  
   Semua data masuk ke RAW dulu sebelum masuk DW/KPI.

3. **Precomputed KPI**  
   Dashboard tidak melakukan scan raw besar saat dibuka.

4. **Tenant isolation by architecture**  
   MVP memakai spreadsheet per tenant, bukan satu spreadsheet gabungan.

5. **Traceability-first finance**  
   Revenue, cost, expense, profit, BPJS receivable, dan inventory risk wajib punya lineage.

6. **Privacy-minimal**  
   Jangan simpan NIK, alamat lengkap, diagnosis detail, catatan medis, atau nomor HP pasien kecuali benar-benar wajib dan sudah dipseudonymize.

7. **Spreadsheet performance guardrail**  
   Sheet besar dibaca/tulis secara batch, tidak row-by-row.

---

## 3. Naming Convention

Gunakan nama sheet stabil dan uppercase untuk warehouse final:

| Layer | Prefix | Fungsi |
|---|---|---|
| Config/Master | `CFG_`, `MASTER_` | Tenant, user, clinic, mapping, COA |
| Raw | `RAW_` | Data source setelah import privacy allowlist |
| Data warehouse | `DW_` | Data normalized/clean untuk analitik |
| Journal | `JOURNAL_` | Accounting journal dan journal line |
| KPI | `KPI_` | Metric precomputed untuk dashboard/AI |
| AI | `AI_` | Alert/summary yang sudah difilter |
| Log | `LOG_` | Audit, error, import, security |

Semua kolom menggunakan `snake_case`.

---

## 4. Standard Columns

### 4.1 Tenant Scope Columns

Wajib untuk semua sheet tenant-owned:

| Column | Type | Required | Notes |
|---|---|---:|---|
| `tenant_id` | string | Yes | ID tenant internal, immutable |
| `clinic_id` | string | Yes | ID cabang/klinik; boleh `ALL` hanya untuk KPI konsolidasi |

### 4.2 Import Trace Columns

Wajib untuk `RAW_*`, `DW_*`, `JOURNAL_*`, dan KPI finance bila applicable:

| Column | Type | Required | Notes |
|---|---|---:|---|
| `sync_id` | string | Yes | Batch import ID |
| `source_system` | string | Yes | SIM/vendor/source export |
| `source_file` | string | Conditional | Wajib untuk upload/drive sync |
| `source_row_id` | string | Yes | Row/key asal; jangan kosong |
| `source_hash` | string | Yes | Hash untuk idempotency batch/row |
| `import_pattern` | enum | Yes | `upload`, `drive_sync`, `api` |
| `imported_at` | datetime | Yes | Waktu masuk warehouse |

### 4.3 Status Columns

| Column | Type | Values |
|---|---|---|
| `validation_status` | enum | `valid`, `warning`, `invalid`, `duplicate`, `quarantined` |
| `data_status` | enum | `complete`, `partial`, `estimated`, `incomplete`, `invalid` |
| `trace_status` | enum | `traceable`, `partially_traceable`, `not_traceable`, `not_applicable` |

---

## 5. Final Sheet List

### 5.1 Configuration and Master

| Sheet | Purpose | MVP Required |
|---|---|---:|
| `CFG_TENANT` | Tenant registry per spreadsheet/environment | Yes |
| `CFG_CLINIC` | Clinic/cabang registry | Yes |
| `CFG_USER_ACCESS` | User-to-tenant/clinic/role mapping | Yes |
| `CFG_INTEGRATION_SOURCE` | Source SIM/export/API config | Yes |
| `CFG_MAPPING_TEMPLATE` | Mapping template version per source | Yes |
| `CFG_COA` | Chart of accounts | Yes |
| `MASTER_DOKTER` | Doctor/provider master | Yes |
| `MASTER_POLI` | Poli/unit layanan master | Yes |
| `MASTER_OBAT` | Medicine/item master | Yes for pharmacy KPI |

### 5.2 Import and Raw

| Sheet | Purpose | MVP Required |
|---|---|---:|
| `IMPORT_BATCHES` | Control table untuk import/sync | Yes |
| `RAW_KUNJUNGAN` | Raw visit/episode | Yes |
| `RAW_TRANSAKSI` | Raw billing/payment/revenue rows | Yes |
| `RAW_BIAYA` | Raw expense/direct cost rows | Yes |
| `RAW_RESEP` | Raw medicine prescription/sales rows | Yes if pharmacy KPI |
| `RAW_BPJS` | Raw BPJS claim/payment rows | Yes if BPJS KPI |
| `RAW_INVENTORY` | Raw stock movement/batch/expiry | Yes if pharmacy KPI |

### 5.3 Data Warehouse

| Sheet | Purpose | MVP Required |
|---|---|---:|
| `DW_KUNJUNGAN` | Normalized visits | Yes |
| `DW_FINANCE` | Normalized revenue/cost/expense | Yes |
| `DW_BPJS` | Normalized BPJS receivables | Yes if BPJS KPI |
| `DW_INVENTORY` | Normalized stock/expiry movement | Yes if pharmacy KPI |
| `DW_DOCTOR_PROFIT` | Pre-allocated doctor profitability detail | Yes |
| `DW_POLI_PROFIT` | Pre-allocated poli profitability detail | Yes |

### 5.4 Accounting Traceability

| Sheet | Purpose | MVP Required |
|---|---|---:|
| `JOURNAL_ENTRY` | Accounting journal header | Yes |
| `JOURNAL_LINE` | Debit/credit lines | Yes |
| `FINANCE_TRACE_MAP` | Source-to-journal-to-KPI lineage | Yes |

### 5.5 KPI, AI, and Logs

| Sheet | Purpose | MVP Required |
|---|---|---:|
| `KPI_DAILY` | Daily precomputed KPI | Optional MVP |
| `KPI_MONTHLY` | Monthly owner KPI | Yes |
| `KPI_DOCTOR` | Doctor profitability KPI | Yes |
| `KPI_POLI` | Poli profitability KPI | Yes |
| `KPI_BPJS` | BPJS receivable/aging KPI | Yes if BPJS scope |
| `KPI_INVENTORY` | Expiry/dead stock risk KPI | Yes if pharmacy scope |
| `AI_ALERTS` | Filtered alert for owner/AI | Yes |
| `AI_SUMMARIES` | Precomputed executive summary | Optional MVP |
| `LOG_AUDIT` | Security/action audit | Yes |
| `LOG_ERROR` | Error logs | Yes |
| `LOG_DATA_QUALITY` | DQ warnings/errors | Yes |

---

## 6. Sheet Specifications

### 6.1 `CFG_TENANT`

| Column | Type | Required | Index | Notes |
|---|---|---:|---|---|
| `tenant_id` | string | Yes | PK | Random/non-sequential |
| `tenant_name` | string | Yes | IDX | Display only |
| `tenant_type` | enum | No | IDX | `single_clinic`, `multi_clinic`, `corporate`, `pilot` |
| `timezone` | string | Yes | - | Default `Asia/Jakarta` |
| `currency` | string | Yes | - | Default `IDR` |
| `plan_code` | string | No | IDX | SaaS plan |
| `billing_status` | enum | No | IDX | `trial`, `active`, `past_due`, `suspended` |
| `status` | enum | Yes | IDX | `active`, `suspended`, `archived` |
| `created_at` | datetime | Yes | - | - |
| `updated_at` | datetime | No | - | - |

### 6.2 `CFG_CLINIC`

| Column | Type | Required | Index | Notes |
|---|---|---:|---|---|
| `tenant_id` | string | Yes | FK, IDX | - |
| `clinic_id` | string | Yes | PK, IDX | Unique within tenant |
| `clinic_name` | string | Yes | IDX | Display name |
| `clinic_type` | enum | Yes | IDX | `pratama`, `utama`, `gigi`, `perusahaan`, `lainnya` |
| `city` | string | No | IDX | - |
| `timezone` | string | Yes | - | Usually tenant timezone |
| `currency` | string | Yes | - | Usually IDR |
| `source_system_default` | string | No | IDX | Primary SIM/source |
| `status` | enum | Yes | IDX | `active`, `inactive` |
| `created_at` | datetime | Yes | - | - |
| `updated_at` | datetime | No | - | - |

### 6.3 `CFG_USER_ACCESS`

| Column | Type | Required | Index | Notes |
|---|---|---:|---|---|
| `access_id` | string | Yes | PK | - |
| `user_id` | string | Yes | IDX | Internal user ID |
| `tenant_id` | string | Yes | IDX | Required on every access row |
| `clinic_id` | string | Yes | IDX | Specific clinic or `ALL` |
| `role` | enum | Yes | IDX | `owner`, `manager`, `finance`, `staff`, `support_admin`, `system` |
| `feature_scope` | string/json | No | - | Allowed modules |
| `access_status` | enum | Yes | IDX | `active`, `invited`, `revoked`, `expired` |
| `expires_at` | datetime | No | IDX | Required for support access |
| `created_at` | datetime | Yes | - | - |
| `updated_at` | datetime | No | - | - |

### 6.4 `CFG_INTEGRATION_SOURCE`

| Column | Type | Required | Index | Notes |
|---|---|---:|---|---|
| `source_id` | string | Yes | PK | Internal ID |
| `tenant_id` | string | Yes | IDX | - |
| `clinic_id` | string | Yes | IDX | - |
| `source_system` | string | Yes | IDX | SIM/vendor/source name |
| `source_type` | enum | Yes | IDX | `csv`, `xlsx`, `drive`, `api` |
| `import_pattern` | enum | Yes | IDX | `upload`, `drive_sync`, `api` |
| `mapping_template_id` | string | Yes | FK | Versioned template |
| `drive_folder_id` | string | Conditional | IDX | For Drive Sync |
| `api_base_url_alias` | string | Conditional | - | Alias only, not secret |
| `last_sync_at` | datetime | No | IDX | - |
| `status` | enum | Yes | IDX | `active`, `paused`, `error`, `inactive` |

### 6.5 `CFG_MAPPING_TEMPLATE`

| Column | Type | Required | Index | Notes |
|---|---|---:|---|---|
| `mapping_template_id` | string | Yes | PK | Versioned ID |
| `source_system` | string | Yes | IDX | Vendor/source |
| `template_version` | string | Yes | IDX | Semver/date version |
| `target_raw_sheet` | string | Yes | IDX | `RAW_*` |
| `source_header` | string | Yes | IDX | Header from export |
| `target_column` | string | Yes | IDX | Warehouse column |
| `transform_rule_name` | string | No | - | Named transform only |
| `is_required` | boolean | Yes | - | Validation rule |
| `status` | enum | Yes | IDX | `active`, `deprecated`, `draft` |

### 6.6 `CFG_COA`

| Column | Type | Required | Index | Notes |
|---|---|---:|---|---|
| `tenant_id` | string | Yes | IDX | Tenant-specific COA allowed |
| `clinic_id` | string | Yes | IDX | `ALL` or clinic-specific |
| `account_id` | string | Yes | PK | Internal account ID |
| `account_code` | string | Yes | IDX | Display accounting code |
| `account_name` | string | Yes | IDX | - |
| `account_type` | enum | Yes | IDX | `asset`, `liability`, `equity`, `revenue`, `cogs`, `expense` |
| `normal_balance` | enum | Yes | - | `debit`, `credit` |
| `parent_account_id` | string | No | FK | - |
| `status` | enum | Yes | IDX | `active`, `inactive` |

---

## 7. Master Sheets

### 7.1 `MASTER_DOKTER`

| Column | Type | Required | Index |
|---|---|---:|---|
| `tenant_id` | string | Yes | IDX |
| `clinic_id` | string | Yes | IDX |
| `doctor_id` | string | Yes | PK |
| `source_doctor_id` | string | No | IDX |
| `doctor_name` | string | Yes | IDX |
| `specialty` | string | No | IDX |
| `default_poli_id` | string | No | FK |
| `fee_model` | enum | No | IDX |
| `fee_rate` | number | No | - |
| `status` | enum | Yes | IDX |
| `created_at` | datetime | Yes | - |
| `updated_at` | datetime | No | - |

Unique key: `tenant_id + clinic_id + doctor_id`.

### 7.2 `MASTER_POLI`

| Column | Type | Required | Index |
|---|---|---:|---|
| `tenant_id` | string | Yes | IDX |
| `clinic_id` | string | Yes | IDX |
| `poli_id` | string | Yes | PK |
| `source_poli_id` | string | No | IDX |
| `poli_name` | string | Yes | IDX |
| `poli_category` | enum | No | IDX |
| `status` | enum | Yes | IDX |
| `created_at` | datetime | Yes | - |
| `updated_at` | datetime | No | - |

### 7.3 `MASTER_OBAT`

| Column | Type | Required | Index |
|---|---|---:|---|
| `tenant_id` | string | Yes | IDX |
| `clinic_id` | string | Yes | IDX |
| `medicine_id` | string | Yes | PK |
| `source_medicine_id` | string | No | IDX |
| `medicine_name` | string | Yes | IDX |
| `category` | string | No | IDX |
| `unit` | string | No | - |
| `default_unit_cost` | currency | No | - |
| `default_selling_price` | currency | No | - |
| `min_stock_qty` | number | No | - |
| `expiry_warning_days` | number | No | - |
| `status` | enum | Yes | IDX |

---

## 8. Import Control Sheet

### `IMPORT_BATCHES`

| Column | Type | Required | Index | Notes |
|---|---|---:|---|---|
| `sync_id` | string | Yes | PK | Batch ID |
| `tenant_id` | string | Yes | IDX | From trusted context/config |
| `clinic_id` | string | Yes | IDX | From trusted context/config |
| `import_pattern` | enum | Yes | IDX | `upload`, `drive_sync`, `api` |
| `source_system` | string | Yes | IDX | - |
| `source_file` | string | Conditional | IDX | - |
| `drive_file_id` | string | Conditional | UNQ | - |
| `api_request_id` | string | Conditional | UNQ | - |
| `source_hash` | string | Yes | UNQ | Idempotency key |
| `period_start` | date | No | IDX | - |
| `period_end` | date | No | IDX | - |
| `row_count_raw` | number | Yes | - | - |
| `row_count_valid` | number | Yes | - | - |
| `row_count_invalid` | number | Yes | - | - |
| `batch_status` | enum | Yes | IDX | `created`, `processing`, `completed`, `failed`, `rolled_back`, `quarantined` |
| `error_summary` | string | No | - | No sensitive payload |
| `started_at` | datetime | Yes | IDX | - |
| `finished_at` | datetime | No | IDX | - |
| `created_by_user_id` | string | No | IDX | - |

---

## 9. RAW Sheets

### 9.1 Common RAW Columns

All `RAW_*` sheets must include:

| Column | Type | Required |
|---|---|---:|
| `raw_id` | string | Yes |
| `tenant_id` | string | Yes |
| `clinic_id` | string | Yes |
| `sync_id` | string | Yes |
| `source_system` | string | Yes |
| `source_file` | string | Conditional |
| `source_row_id` | string | Yes |
| `source_hash` | string | Yes |
| `import_pattern` | enum | Yes |
| `raw_payload_hash` | string | Yes |
| `imported_at` | datetime | Yes |
| `validation_status` | enum | Yes |
| `data_status` | enum | Yes |
| `trace_status` | enum | Yes |
| `error_code` | string | No |
| `error_message` | string | No |

Raw payload should be minimized. Do not store full sensitive rows if not needed.

### 9.2 `RAW_KUNJUNGAN`

Business columns:

| Column | Type | Required |
|---|---|---:|
| `visit_date` | date | Yes |
| `source_visit_id` | string | Conditional |
| `source_patient_ref` | string | No, pseudonymous only |
| `source_doctor_id` | string | No |
| `source_poli_id` | string | No |
| `visit_type` | enum | No |
| `visit_status` | enum | No |

### 9.3 `RAW_TRANSAKSI`

| Column | Type | Required |
|---|---|---:|
| `transaction_date` | date | Yes |
| `source_transaction_id` | string | Conditional |
| `source_visit_id` | string | No |
| `source_doctor_id` | string | No |
| `source_poli_id` | string | No |
| `payer_type` | enum | No |
| `transaction_category` | string | Yes |
| `gross_amount` | currency | Yes |
| `discount_amount` | currency | No |
| `net_amount` | currency | Yes |
| `payment_status` | enum | No |

### 9.4 `RAW_BIAYA`

| Column | Type | Required |
|---|---|---:|
| `expense_date` | date | Yes |
| `source_expense_id` | string | Conditional |
| `expense_category` | string | Yes |
| `amount` | currency | Yes |
| `allocation_hint` | string | No |
| `source_doctor_id` | string | No |
| `source_poli_id` | string | No |

### 9.5 `RAW_RESEP`

| Column | Type | Required |
|---|---|---:|
| `prescription_date` | date | Yes |
| `source_prescription_id` | string | Conditional |
| `source_visit_id` | string | No |
| `source_medicine_id` | string | Yes |
| `medicine_name_raw` | string | Yes |
| `quantity` | number | Yes |
| `unit` | string | No |
| `selling_price` | currency | No |
| `unit_cost` | currency | No |
| `batch_no` | string | No |
| `expiry_date` | date | No |

### 9.6 `RAW_BPJS`

| Column | Type | Required |
|---|---|---:|
| `claim_id_source` | string | Conditional |
| `service_month` | period | Yes |
| `claim_date` | date | No |
| `claim_amount` | currency | Yes |
| `approved_amount` | currency | No |
| `paid_amount` | currency | No |
| `outstanding_amount` | currency | No |
| `claim_status` | enum | No |
| `paid_at` | date | No |

### 9.7 `RAW_INVENTORY`

| Column | Type | Required |
|---|---|---:|
| `movement_date` | date | Yes |
| `source_movement_id` | string | Conditional |
| `source_medicine_id` | string | Yes |
| `medicine_name_raw` | string | Yes |
| `batch_no` | string | No |
| `expiry_date` | date | No |
| `movement_type` | enum | Yes |
| `quantity` | number | Yes |
| `unit_cost` | currency | No |

---

## 10. DW Sheets

### 10.1 Common DW Columns

| Column | Type | Required |
|---|---|---:|
| `dw_id` | string | Yes |
| `tenant_id` | string | Yes |
| `clinic_id` | string | Yes |
| `sync_id` | string | Yes |
| `source_row_id` | string | Yes |
| `source_system` | string | Yes |
| `period` | period | Yes |
| `data_status` | enum | Yes |
| `trace_status` | enum | Yes |
| `created_at` | datetime | Yes |
| `updated_at` | datetime | No |

### 10.2 `DW_KUNJUNGAN`

| Column | Type | Required |
|---|---|---:|
| `visit_id` | string | Yes |
| `visit_date` | date | Yes |
| `doctor_id` | string | No |
| `poli_id` | string | No |
| `patient_ref_hash` | string | No |
| `visit_type` | enum | No |
| `visit_status` | enum | Yes |

### 10.3 `DW_FINANCE`

| Column | Type | Required |
|---|---|---:|
| `finance_id` | string | Yes |
| `transaction_date` | date | Yes |
| `transaction_type` | enum | Yes: `revenue`, `direct_cost`, `operating_expense`, `adjustment` |
| `account_id` | string | Yes |
| `amount` | currency | Yes |
| `doctor_id` | string | No |
| `poli_id` | string | No |
| `visit_id` | string | No |
| `allocation_method` | enum | No |
| `journal_entry_id` | string | Conditional |

### 10.4 `DW_BPJS`

| Column | Type | Required |
|---|---|---:|
| `bpjs_id` | string | Yes |
| `claim_id` | string | Yes |
| `service_month` | period | Yes |
| `claim_amount` | currency | Yes |
| `approved_amount` | currency | No |
| `paid_amount` | currency | No |
| `outstanding_amount` | currency | Yes |
| `claim_status` | enum | Yes |
| `aging_days` | number | Yes |

### 10.5 `DW_INVENTORY`

| Column | Type | Required |
|---|---|---:|
| `inventory_id` | string | Yes |
| `medicine_id` | string | Yes |
| `movement_date` | date | Yes |
| `batch_no` | string | No |
| `expiry_date` | date | No |
| `movement_type` | enum | Yes |
| `quantity` | number | Yes |
| `unit_cost` | currency | No |
| `total_cost` | currency | No |
| `days_to_expiry` | number | No |

---

## 11. Accounting Sheets

### 11.1 `JOURNAL_ENTRY`

| Column | Type | Required | Index |
|---|---|---:|---|
| `journal_entry_id` | string | Yes | PK |
| `tenant_id` | string | Yes | IDX |
| `clinic_id` | string | Yes | IDX |
| `period` | period | Yes | IDX |
| `entry_date` | date | Yes | IDX |
| `entry_type` | enum | Yes | IDX |
| `sync_id` | string | Yes | IDX |
| `source_system` | string | Yes | IDX |
| `source_row_id` | string | Yes | IDX |
| `description` | string | No | - |
| `entry_status` | enum | Yes | IDX |
| `data_status` | enum | Yes | IDX |
| `trace_status` | enum | Yes | IDX |
| `created_at` | datetime | Yes | - |

### 11.2 `JOURNAL_LINE`

| Column | Type | Required | Index |
|---|---|---:|---|
| `journal_line_id` | string | Yes | PK |
| `journal_entry_id` | string | Yes | FK, IDX |
| `tenant_id` | string | Yes | IDX |
| `clinic_id` | string | Yes | IDX |
| `account_id` | string | Yes | FK, IDX |
| `debit` | currency | Yes | - |
| `credit` | currency | Yes | - |
| `line_memo` | string | No | - |

Rule: total debit must equal total credit per `journal_entry_id`.

### 11.3 `FINANCE_TRACE_MAP`

| Column | Type | Required | Index |
|---|---|---:|---|
| `trace_id` | string | Yes | PK |
| `tenant_id` | string | Yes | IDX |
| `clinic_id` | string | Yes | IDX |
| `sync_id` | string | Yes | IDX |
| `raw_sheet` | string | Yes | IDX |
| `raw_id` | string | Yes | IDX |
| `dw_sheet` | string | Yes | IDX |
| `dw_id` | string | Yes | IDX |
| `journal_entry_id` | string | Conditional | IDX |
| `kpi_sheet` | string | No | IDX |
| `kpi_id` | string | No | IDX |
| `trace_status` | enum | Yes | IDX |
| `created_at` | datetime | Yes | - |

---

## 12. KPI Sheets

### 12.1 Common KPI Columns

| Column | Type | Required |
|---|---|---:|
| `kpi_id` | string | Yes |
| `tenant_id` | string | Yes |
| `clinic_id` | string | Yes |
| `period` | period/date | Yes |
| `kpi_name` | string | Yes |
| `kpi_value` | number/currency | Yes |
| `kpi_unit` | enum | Yes |
| `data_status` | enum | Yes |
| `trace_status` | enum | Yes |
| `source_sync_ids` | string/json | No |
| `computed_at` | datetime | Yes |
| `schema_version` | string | Yes |

### 12.2 `KPI_MONTHLY`

Minimum KPI names:

- `total_revenue`
- `direct_cost`
- `operating_expense`
- `gross_profit`
- `net_profit`
- `profit_margin_pct`
- `total_visits`
- `revenue_growth_pct`
- `profit_growth_pct`

### 12.3 `KPI_DOCTOR`

- `doctor_revenue`
- `doctor_direct_cost`
- `doctor_gross_profit`
- `doctor_profit_margin_pct`
- `doctor_visit_count`

### 12.4 `KPI_POLI`

- `poli_revenue`
- `poli_direct_cost`
- `poli_gross_profit`
- `poli_profit_margin_pct`
- `poli_visit_count`

### 12.5 `KPI_BPJS`

- `bpjs_claim_total`
- `bpjs_approved_total`
- `bpjs_paid_total`
- `bpjs_outstanding_total`
- `bpjs_aging_over_30_days`
- `bpjs_aging_over_60_days`

### 12.6 `KPI_INVENTORY`

- `medicine_expiry_risk_count`
- `medicine_expiry_risk_value`
- `dead_stock_count`
- `stockout_risk_count`

---

## 13. Spreadsheet Performance Rules

1. Dashboard reads only `KPI_*`, `AI_ALERTS`, and small config sheets.
2. Raw and DW processing must be batch-oriented.
3. Avoid formulas across whole columns in production sheets.
4. Avoid volatile formulas for dashboard KPI.
5. Store computed values as rows, not live formulas, for production metrics.
6. Archive or split old RAW rows when a sheet approaches performance limits.
7. Keep per-tenant spreadsheet row count under an operational threshold, recommended under 200k active rows for MVP.
8. Use monthly partitions or archive spreadsheets for high-volume tenants.

---

## 14. Technical Risks and Mitigations

| Risk ID | Area | Failure Mode | Impact | Mitigation |
|---|---|---|---|---|
| R-SCHEMA-001 | Scalability | One spreadsheet stores all tenants | Slow dashboard, cross-tenant risk | Spreadsheet per tenant for MVP; row-level tenant fields retained |
| R-SCHEMA-002 | Performance | Dashboard scans RAW/DW | Timeout > 30s | Precompute KPI and cache dashboard payload |
| R-SCHEMA-003 | Performance | Row-by-row Apps Script writes | Runtime quota exhaustion | Use batch read/write and chunk processing |
| R-SCHEMA-004 | Multi Tenant | Missing `tenant_id`/`clinic_id` on rows | Data leakage/wrong KPI | Schema validation blocks rows missing scope |
| R-SCHEMA-005 | Finance | Profit without cost/expense | Misleading owner decision | `data_status` and `trace_status`; never final if incomplete |
| R-SCHEMA-006 | Finance | Journal imbalance | Invalid accounting | Debit-credit validation before KPI finalization |
| R-SCHEMA-007 | Import | Duplicate source rows | Double revenue/cost | `source_hash`, `sync_id`, duplicate row validation |
| R-SCHEMA-008 | Security | Patient PII stored raw | Privacy breach | Privacy allowlist; pseudonymize patient refs |
| R-SCHEMA-009 | Security | Spreadsheet shared directly | App auth bypassed | Tenant spreadsheet sharing restricted; service/admin only |
| R-SCHEMA-010 | Maintainability | Multiple schema docs drift | Wrong implementation | This doc is final canonical; older docs become references |
| R-SCHEMA-011 | Maintainability | Column rename breaks GAS | Production errors | Schema versioning and migration checklist |
| R-SCHEMA-012 | Apps Script | Cell/row limits reached | Import failure | Archiving, partitioning, migration trigger threshold |

---

## 15. Final Recommendation

For the coding sprints:

- Sprint 1 must define constants from this schema and enforce status enums.
- Sprint 2 `SheetRepository` must be the only spreadsheet read/write gateway.
- Sprint 3 Import Engine must write `IMPORT_BATCHES` and `RAW_*` first.
- Sprint 4 Finance Engine must generate journal/trace before final KPI.
- Sprint 5 Dashboard must only consume KPI and approved alert/summary sheets.

This schema is accepted for MVP/Pilot if the performance, security, and tenant isolation mitigations above are implemented from the first sprint.
