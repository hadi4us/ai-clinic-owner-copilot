# Spreadsheet Schema

## Purpose

Dokumen ini mendefinisikan desain spreadsheet untuk **Data Warehouse Layer** AI Clinic CFO Copilot / AI Clinic Owner Copilot.

Data Warehouse ini bukan SIM Klinik baru. Ia hanya menyimpan data bisnis hasil import/read-only dari SIM Klinik/export/API untuk kebutuhan BI, KPI, dashboard, dan AI insight.

Prinsip dari `CLAW.md`:

- Tidak ada double entry.
- SIM Klinik tetap source of truth.
- Connector/import bersifat read-only.
- Semua sheet wajib memiliki `tenant_id`.
- Hindari data pasien/medis sensitif.
- Finance metrics harus punya status kelengkapan dan traceability.

---

## Sheet List

Required Data Warehouse sheets:

1. `MASTER_KLINIK`
2. `MASTER_DOKTER`
3. `MASTER_POLI`
4. `MASTER_OBAT`
5. `PASIEN`
6. `KUNJUNGAN`
7. `TINDAKAN`
8. `RESEP`
9. `BPJS_KLAIM`
10. `PENGELUARAN`
11. `KPI_HARIAN`
12. `KPI_BULANAN`

All sheets have `tenant_id` as the first column.

---

## Privacy Rules

The warehouse must not store:

- patient full name
- NIK / identity number
- phone number
- full address
- diagnosis
- clinical notes
- medical record details

Allowed patient representation:

- `patient_ref`
- `source_patient_id_hash`
- `gender`
- `age_bucket`

This is enough for aggregate business analytics without exposing sensitive medical data.

---

## MASTER_KLINIK

Clinic master data.

| Column | Type | Required | Description |
|---|---|---:|---|
| `tenant_id` | string | yes | Tenant scope. |
| `clinic_id` | string | yes | Clinic identifier. |
| `clinic_name` | string | yes | Clinic name. |
| `clinic_type` | string | no | Clinic type/category. |
| `city` | string | no | City/location summary. |
| `timezone` | string | no | Example: `Asia/Jakarta`. |
| `currency` | string | no | Example: `IDR`. |
| `status` | string | no | active/inactive. |
| `created_at` | datetime | no | Created timestamp. |
| `updated_at` | datetime | no | Updated timestamp. |

---

## MASTER_DOKTER

Doctor master data.

| Column | Type | Required | Description |
|---|---|---:|---|
| `tenant_id` | string | yes | Tenant scope. |
| `clinic_id` | string | yes | Clinic scope. |
| `doctor_id` | string | yes | Canonical doctor id. |
| `source_doctor_id` | string | no | SIM Klinik doctor id. |
| `doctor_name` | string | no | Doctor display name. |
| `specialty` | string | no | Specialty. |
| `status` | string | no | active/inactive. |
| `created_at` | datetime | no | Created timestamp. |
| `updated_at` | datetime | no | Updated timestamp. |

---

## MASTER_POLI

Poli/department master data.

| Column | Type | Required | Description |
|---|---|---:|---|
| `tenant_id` | string | yes | Tenant scope. |
| `clinic_id` | string | yes | Clinic scope. |
| `poli_id` | string | yes | Canonical poli id. |
| `source_poli_id` | string | no | SIM Klinik poli id. |
| `poli_name` | string | no | Poli name. |
| `status` | string | no | active/inactive. |
| `created_at` | datetime | no | Created timestamp. |
| `updated_at` | datetime | no | Updated timestamp. |

---

## MASTER_OBAT

Medicine master data for business inventory/margin analysis. This is not clinical recommendation data.

| Column | Type | Required | Description |
|---|---|---:|---|
| `tenant_id` | string | yes | Tenant scope. |
| `clinic_id` | string | yes | Clinic scope. |
| `medicine_id` | string | yes | Canonical medicine id. |
| `source_medicine_id` | string | no | SIM Klinik/pharmacy source id. |
| `medicine_name` | string | no | Medicine display name. |
| `medicine_category` | string | no | Business category. |
| `unit` | string | no | Unit. |
| `status` | string | no | active/inactive. |
| `created_at` | datetime | no | Created timestamp. |
| `updated_at` | datetime | no | Updated timestamp. |

---

## PASIEN

Pseudonymous patient reference table for aggregate analytics only.

| Column | Type | Required | Description |
|---|---|---:|---|
| `tenant_id` | string | yes | Tenant scope. |
| `clinic_id` | string | yes | Clinic scope. |
| `patient_ref` | string | yes | Pseudonymous patient reference. |
| `source_patient_id_hash` | string | no | Hashed source patient id. |
| `gender` | string | no | Optional demographic aggregate field. |
| `age_bucket` | string | no | Example: `18-25`, `26-35`, `60+`. |
| `first_visit_date` | date | no | First known visit date. |
| `last_visit_date` | date | no | Last known visit date. |
| `status` | string | no | active/inactive/unknown. |
| `created_at` | datetime | no | Created timestamp. |
| `updated_at` | datetime | no | Updated timestamp. |

Forbidden fields:

- patient name
- NIK
- phone
- address
- diagnosis
- medical notes

---

## KUNJUNGAN

Visit fact table.

| Column | Type | Required | Description |
|---|---|---:|---|
| `tenant_id` | string | yes | Tenant scope. |
| `clinic_id` | string | yes | Clinic scope. |
| `visit_id` | string | yes | Canonical visit id. |
| `source_visit_id` | string | no | SIM Klinik visit id. |
| `patient_ref` | string | no | Pseudonymous patient reference. |
| `doctor_id` | string | no | Canonical doctor id. |
| `poli_id` | string | no | Canonical poli id. |
| `visit_date` | date | yes | Visit date. |
| `visit_type` | string | no | umum/bpjs/etc. |
| `payer_type` | string | no | cash/bpjs/insurance/etc. |
| `status` | string | no | completed/cancelled/etc. |
| `sync_id` | string | no | Import/sync batch id. |
| `source_row_id` | string | no | Source row trace. |
| `created_at` | datetime | no | Created timestamp. |

---

## TINDAKAN

Procedure/service revenue fact table.

| Column | Type | Required | Description |
|---|---|---:|---|
| `tenant_id` | string | yes | Tenant scope. |
| `clinic_id` | string | yes | Clinic scope. |
| `procedure_id` | string | yes | Canonical procedure id. |
| `source_procedure_id` | string | no | SIM Klinik procedure id. |
| `visit_id` | string | yes | Linked visit id. |
| `doctor_id` | string | no | Doctor id. |
| `poli_id` | string | no | Poli id. |
| `procedure_date` | date | yes | Procedure date. |
| `procedure_category` | string | no | Consultation/lab/procedure/etc. |
| `procedure_name` | string | no | Business display name, not clinical note. |
| `amount` | number | yes | Revenue amount. |
| `sync_id` | string | no | Import/sync batch id. |
| `source_row_id` | string | no | Source row trace. |
| `created_at` | datetime | no | Created timestamp. |

---

## RESEP

Prescription/medicine business fact table. This is for inventory/revenue/cost analytics only, not clinical advice.

| Column | Type | Required | Description |
|---|---|---:|---|
| `tenant_id` | string | yes | Tenant scope. |
| `clinic_id` | string | yes | Clinic scope. |
| `prescription_id` | string | yes | Canonical prescription id. |
| `source_prescription_id` | string | no | Source prescription id. |
| `visit_id` | string | yes | Linked visit id. |
| `medicine_id` | string | yes | Canonical medicine id. |
| `prescription_date` | date | yes | Prescription/sale date. |
| `quantity` | number | no | Quantity. |
| `unit` | string | no | Unit. |
| `gross_amount` | number | no | Sales/revenue amount. |
| `cogs_amount` | number | no | Cost of goods sold. |
| `sync_id` | string | no | Import/sync batch id. |
| `source_row_id` | string | no | Source row trace. |
| `created_at` | datetime | no | Created timestamp. |

---

## BPJS_KLAIM

BPJS receivables/claim summary. No patient-level diagnosis or medical detail.

| Column | Type | Required | Description |
|---|---|---:|---|
| `tenant_id` | string | yes | Tenant scope. |
| `clinic_id` | string | yes | Clinic scope. |
| `claim_id` | string | yes | Canonical claim id. |
| `claim_ref` | string | yes | Pseudonymous claim reference. |
| `visit_period` | period | no | Visit service period. |
| `claim_month` | period | yes | Claim reporting month. |
| `submitted_amount` | number | no | Submitted amount. |
| `approved_amount` | number | no | Approved amount. |
| `paid_amount` | number | no | Paid amount. |
| `outstanding_amount` | number | no | Outstanding amount. |
| `claim_status` | string | no | submitted/approved/paid/rejected/outstanding. |
| `submitted_at` | date | no | Submission date. |
| `paid_at` | date | no | Payment date. |
| `sync_id` | string | no | Import/sync batch id. |
| `source_row_id` | string | no | Source row trace. |
| `created_at` | datetime | no | Created timestamp. |

---

## PENGELUARAN

Expense fact table.

| Column | Type | Required | Description |
|---|---|---:|---|
| `tenant_id` | string | yes | Tenant scope. |
| `clinic_id` | string | yes | Clinic scope. |
| `expense_id` | string | yes | Canonical expense id. |
| `expense_date` | date | yes | Expense date. |
| `expense_category` | string | no | Salary/rent/utilities/etc. |
| `expense_name` | string | no | Expense label. |
| `amount` | number | yes | Expense amount. |
| `payment_method` | string | no | Cash/bank/etc. |
| `allocation_target` | string | no | clinic/poli/doctor/shared. |
| `journal_entry_id` | string | no | Accounting trace. |
| `trace_status` | string | no | traceable/partial/not_traceable. |
| `sync_id` | string | no | Import/sync batch id. |
| `source_row_id` | string | no | Source row trace. |
| `created_at` | datetime | no | Created timestamp. |

---

## KPI_HARIAN

Daily precomputed KPI table.

| Column | Type | Required | Description |
|---|---|---:|---|
| `tenant_id` | string | yes | Tenant scope. |
| `clinic_id` | string | yes | Clinic scope. |
| `date` | date | yes | KPI date. |
| `total_visits` | number | no | Visit count. |
| `total_revenue` | number | no | Total revenue. |
| `medicine_revenue` | number | no | Medicine revenue. |
| `procedure_revenue` | number | no | Procedure/service revenue. |
| `bpjs_claimed_amount` | number | no | BPJS claimed amount, not cash. |
| `direct_cost` | number | no | Direct cost. |
| `operating_expense` | number | no | Operating expense. |
| `gross_profit` | number | no | Revenue - direct cost. |
| `net_profit` | number | no | Gross profit - operating expense. |
| `profit_margin` | number | no | Net profit / revenue. |
| `data_status` | string | yes | complete/estimated/incomplete. |
| `trace_status` | string | yes | traceable/partial/not_traceable/not_applicable. |
| `computed_at` | datetime | no | Computed timestamp. |

---

## KPI_BULANAN

Monthly precomputed KPI table.

| Column | Type | Required | Description |
|---|---|---:|---|
| `tenant_id` | string | yes | Tenant scope. |
| `clinic_id` | string | yes | Clinic scope. |
| `period` | period | yes | KPI month `yyyy-MM`. |
| `total_visits` | number | no | Visit count. |
| `total_revenue` | number | no | Total revenue. |
| `medicine_revenue` | number | no | Medicine revenue. |
| `procedure_revenue` | number | no | Procedure/service revenue. |
| `bpjs_claimed_amount` | number | no | BPJS claimed amount, not cash. |
| `direct_cost` | number | no | Direct cost. |
| `operating_expense` | number | no | Operating expense. |
| `gross_profit` | number | no | Revenue - direct cost. |
| `net_profit` | number | no | Gross profit - operating expense. |
| `profit_margin` | number | no | Net profit / revenue. |
| `data_status` | string | yes | complete/estimated/incomplete. |
| `trace_status` | string | yes | traceable/partial/not_traceable/not_applicable. |
| `computed_at` | datetime | no | Computed timestamp. |

---

## Data Warehouse Services

Implemented canonical service files:

```text
src/DataWarehouse/SheetRepository.gs
src/DataWarehouse/ImportService.gs
src/DataWarehouse/MappingService.gs
src/DataWarehouse/ValidationService.gs
```

### SheetRepository.gs

Responsible for:

- opening spreadsheet
- creating sheets
- setting headers
- reading tenant-scoped rows
- appending validated rows
- replacing rows for controlled setup/maintenance

### ImportService.gs

Responsible for:

- read-only import from object arrays or CSV text
- assigning `tenant_id`, `clinic_id`, `sync_id`, and `source_row_id`
- delegating mapping and validation before write

### MappingService.gs

Responsible for:

- source export field → canonical warehouse field mapping
- basic date/number/period normalization
- mapping template generation
- sensitive mapping guardrails

### ValidationService.gs

Responsible for:

- required field checks
- tenant/clinic scope checks
- unknown field checks
- blocked patient-sensitive fields
- date/period/number validation

---

## Guardrails

- Every sheet has `tenant_id`.
- Every row write must pass session validation.
- Patient-sensitive raw identifiers are blocked.
- BPJS data is claim/receivable summary, not medical detail.
- KPI tables must include `data_status` and `trace_status`.
- Finance output is final only if traceable and complete.
