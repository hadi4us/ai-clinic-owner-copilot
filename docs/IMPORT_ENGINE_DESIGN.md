# IMPORT_ENGINE_DESIGN

Status: **Final Technical Architecture Review**  
Scope: Import Engine design for **AI Clinic Owner Copilot** on Google Apps Script and Google Spreadsheet.  
Constraint: No code.

---

## 1. Executive Verdict

The Import Engine is the highest operational failure point after multi-tenancy.

It must be:

- RAW-first.
- Idempotent.
- Tenant-guarded.
- Batch-controlled.
- Privacy-minimal.
- Recoverable per `sync_id`.
- Designed around Google Apps Script runtime and quota limits.

Do not let dashboard or KPI read directly from newly uploaded raw rows. Only completed, validated, normalized, and approved batches should affect KPI.

---

## 2. Import Goals

1. Accept data from SIM Klinik export/API without double entry.
2. Preserve traceability to source file/request and source row.
3. Prevent duplicate revenue/cost/claim/inventory counts.
4. Enforce tenant and clinic scope.
5. Protect patient-sensitive data.
6. Normalize inconsistent SIM formats into warehouse schema.
7. Compute KPI only from validated completed batches.
8. Allow failed import retry/rollback.

---

## 3. Supported Import Patterns

| Pattern | Name | Phase | Input | Automation |
|---|---|---|---|---|
| A | Upload Data | Pilot initial | CSV/XLSX export uploaded by authorized user | Manual |
| B | Google Drive Sync | Stable pilot | Export files placed in tenant Drive folder | Scheduled/semi-automatic |
| C | API SIM Klinik | Scale-up | Vendor/API connector | Automatic |

All patterns follow the same internal flow:

```text
Resolve TenantContext
→ Create/validate import batch
→ Parse source
→ Privacy allowlist
→ Write RAW
→ Validate RAW
→ Normalize DW
→ Create finance trace/journal where applicable
→ Compute KPI
→ Finalize batch
```

---

## 4. Batch Control

### `IMPORT_BATCHES`

| Column | Type | Required | Purpose |
|---|---|---:|---|
| `sync_id` | string | Yes | Batch primary key |
| `tenant_id` | string | Yes | Trusted tenant scope |
| `clinic_id` | string | Yes | Trusted clinic scope |
| `import_pattern` | enum | Yes | `upload`, `drive_sync`, `api` |
| `source_system` | string | Yes | SIM/vendor/source |
| `source_file` | string | Conditional | Upload/Drive file name |
| `drive_file_id` | string | Conditional | Drive sync source |
| `api_endpoint_alias` | string | Conditional | API source alias, not secret |
| `api_request_id` | string | Conditional | Request/correlation ID |
| `source_hash` | string | Yes | Idempotency |
| `mapping_template_id` | string | Yes | Versioned mapping |
| `period_start` | date | No | Claimed/derived period |
| `period_end` | date | No | Claimed/derived period |
| `row_count_raw` | number | Yes | Rows parsed |
| `row_count_valid` | number | Yes | Valid rows |
| `row_count_invalid` | number | Yes | Invalid rows |
| `batch_status` | enum | Yes | `created`, `processing`, `completed`, `failed`, `rolled_back`, `quarantined` |
| `error_summary` | string | No | Sanitized summary |
| `started_at` | datetime | Yes | Audit |
| `finished_at` | datetime | No | Audit |
| `created_by_user_id` | string | No | Actor |

Batch status rule:

- KPI may include only batches with `batch_status = completed`.
- Failed/quarantined batches remain auditable but invisible to KPI.
- Rollback marks affected derived rows invalid/rolled back and recomputes KPI from remaining completed batches.

---

## 5. Idempotency Strategy

### Batch Idempotency Key

| Pattern | Key |
|---|---|
| Upload | `tenant_id + clinic_id + source_system + source_hash` |
| Drive Sync | `tenant_id + clinic_id + drive_file_id + source_hash` |
| API | `tenant_id + clinic_id + api_endpoint_alias + api_request_id` |

### Row Idempotency Key

Recommended row uniqueness:

```text
tenant_id + clinic_id + source_system + source_row_id + source_hash
```

If source has no stable row ID, derive source row ID from:

- file name
- sheet name
- row number
- normalized row hash

### Duplicate Handling

| Condition | Action |
|---|---|
| Same source hash completed | Skip or reject as duplicate |
| Same file ID, different hash | Quarantine/review unless allowed as new version |
| Duplicate source row within same batch | Mark duplicate invalid |
| Previously failed batch | Retry with new sync ID or resume checkpoint |
| Partial batch | Do not expose to KPI |

---

## 6. Mapping Design

### Mapping Template Requirements

Each source must use a versioned mapping template:

- Source system/vendor.
- Template version.
- Source header names.
- Target RAW columns.
- Required fields.
- Transform rule names.
- Validation rules.

Mapping templates must be explicit because SIM Klinik exports vary widely.

### Mapping Failure Modes

| Failure | Impact | Mitigation |
|---|---|---|
| Header renamed | Columns shift silently | Header validation before parse |
| Date format inconsistent | Wrong period/KPI | Strict date parsing with validation warnings |
| Amount includes separators/text | Wrong revenue/cost | Locale-aware amount normalization |
| Doctor/poli names inconsistent | Bad profitability | Master mapping and unknown bucket |
| Missing cost data | Profit overstated | Mark KPI `estimated`/`incomplete` |

---

## 7. Privacy Allowlist

Import Engine must not blindly store full export rows.

Allowed categories:

- Transaction dates.
- Visit IDs/source refs.
- Doctor/poli refs.
- Revenue/cost/payment values.
- BPJS claim status/amounts.
- Medicine item/batch/expiry fields needed for KPI.
- Pseudonymous patient reference if needed for dedupe only.

Disallowed by default:

- NIK.
- Full patient name if not required.
- Full address.
- Phone number.
- Diagnosis detail.
- Medical notes.
- Insurance card detail beyond claim reference.

If a sensitive field is required later, it must have explicit justification, minimization, masking/pseudonymization, and access restrictions.

---

## 8. Validation Pipeline

### 8.1 Source Validation

Before writing RAW:

- File type allowed.
- File size under limit.
- Header matches mapping template.
- Tenant/clinic resolved from trusted context.
- Source hash computed.
- Duplicate batch checked.

### 8.2 Row Validation

Before DW normalization:

| Rule | Invalid if |
|---|---|
| Tenant scope | Missing/mismatched tenant/clinic |
| Date | Missing or unparseable required date |
| Amount | Required amount missing/not numeric |
| Source row | Missing source_row_id after derivation |
| Duplicate | Same row id/hash already processed |
| Privacy | Disallowed sensitive field required for storage |
| Master mapping | Required doctor/poli/medicine cannot be mapped and no unknown handling allowed |

### 8.3 Finance Validation

Before KPI final:

- Revenue rows map to revenue account.
- Direct cost rows map to cost account or marked missing.
- Operating expense rows map to expense account or marked missing.
- Journal entries balance if journal layer enabled.
- Trace map exists for each KPI-contributing finance row.

---

## 9. Pattern A — Upload Data

### Flow

1. Authorized user selects tenant/clinic from allowed access list.
2. User uploads CSV/XLSX export.
3. System validates file size/type/header.
4. System computes `source_hash`.
5. System creates `IMPORT_BATCHES` row.
6. System writes allowed fields to `RAW_*`.
7. System validates and normalizes to `DW_*`.
8. System computes KPI.
9. Batch is completed or quarantined.

### Google Apps Script Risks

| Risk | Impact | Mitigation |
|---|---|---|
| XLSX parsing heavy | Timeout/memory error | Prefer CSV for MVP; set file size limit |
| Large upload | Runtime failure | Max rows/file; chunk processing |
| User selects wrong clinic | Data contamination | Dropdown from TenantContext only |
| Duplicate file | Double count | `source_hash` idempotency |
| Header changes | Wrong column mapping | Header validation and template version |

---

## 10. Pattern B — Google Drive Sync

### Flow

1. Tenant/source has registered Drive folder.
2. Scheduled trigger scans folder.
3. Files older than a minimum age are considered stable.
4. Unprocessed file/hash creates import batch.
5. File is processed and archived/marked.
6. KPI recomputed after successful batch.

### Google Apps Script Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Duplicate triggers | Double processing | Trigger inventory + idempotency |
| File still uploading | Parse failure | Minimum file age before processing |
| File edited after processed | Silent data change | Rehash and quarantine changed file |
| Folder wrong tenant | Cross-tenant import | Folder registry validation |
| Many files at once | Timeout | Queue one/few files per trigger run |

---

## 11. Pattern C — API SIM Klinik

### Flow

1. Source config defines API endpoint alias and scope.
2. Scheduled/manual job requests data for tenant/clinic/period.
3. API response is assigned `api_request_id`.
4. Response hash/idempotency checked.
5. Allowed fields are written to RAW.
6. DW/KPI pipeline runs.

### Google Apps Script Risks

| Risk | Impact | Mitigation |
|---|---|---|
| API slow/unavailable | Trigger timeout | Timeout limits, retry window, batch period slices |
| API pagination | Missing rows | Check page counts and completion markers |
| Token expires | Import failure | Secret rotation and clear error status |
| Vendor schema changes | Mapping failure | Versioned API mapping and contract tests |
| Mixed tenant API data | Leakage | Reject if row/source tenant cannot be scoped |

---

## 12. Data Quality Output

All import warnings/errors should produce rows in `LOG_DATA_QUALITY`.

Minimum fields:

| Column | Purpose |
|---|---|
| `dq_id` | Unique issue ID |
| `tenant_id` | Scope |
| `clinic_id` | Scope |
| `sync_id` | Batch |
| `sheet_name` | Source/target sheet |
| `row_ref` | Row reference |
| `rule_code` | Machine-readable issue |
| `severity` | `info`, `warning`, `error`, `critical` |
| `status` | `open`, `acknowledged`, `resolved`, `ignored` |
| `message` | Sanitized explanation |
| `created_at` | Timestamp |

Dashboard behavior:

- `critical` or finance-impacting `error` prevents final KPI status.
- Warning allows display with caution.
- Missing direct/operating cost makes profit estimated/incomplete.

---

## 13. Recovery and Rollback

Rollback by `sync_id` must be supported conceptually:

1. Mark batch `rolled_back`.
2. Exclude its rows from KPI computation.
3. Mark related RAW/DW/JOURNAL/TRACE rows as invalid/rolled back or superseded.
4. Recompute KPI for affected period/tenant/clinic.
5. Log rollback action.

Do not physically delete rows as the default. Preserve audit trail.

---

## 14. Performance Guardrails

1. Batch read/write spreadsheet ranges.
2. Process large files in chunks.
3. Avoid `getDataRange()` on very large raw sheets for every request.
4. Maintain lookup maps for headers/master data per run.
5. Precompute KPI after import; dashboard reads KPI only.
6. Use batch status to avoid repeated scanning of completed raw rows.
7. Partition/archive old RAW rows when row count grows.
8. Keep imports period-scoped when possible.

---

## 15. Technical Risks and Mitigations

| Risk ID | Area | Failure Mode | Impact | Mitigation |
|---|---|---|---|---|
| R-IMP-001 | Scalability | Large CSV/XLSX exceeds GAS limits | Import fails | File size/row limits, chunking, CSV-first |
| R-IMP-002 | Performance | Row-by-row writes | Quota/timeouts | Batch writes via repository layer |
| R-IMP-003 | Multi Tenant | Tenant from user input trusted | Cross-tenant contamination | Resolve TenantContext server-side |
| R-IMP-004 | Idempotency | Duplicate upload/API request | Double-counted KPI | Batch and row idempotency keys |
| R-IMP-005 | Mapping | Header/vendor format drift | Wrong numbers | Versioned mapping and header validation |
| R-IMP-006 | Finance | Missing cost/expense treated as zero | False profit | Status rules: estimated/incomplete |
| R-IMP-007 | Security | Raw PII stored | Privacy breach | Privacy allowlist and pseudonymization |
| R-IMP-008 | Recovery | Failed batch partially visible | Bad dashboard | KPI only from completed batches |
| R-IMP-009 | Trigger | Drive sync processes same file twice | Duplicate data | Trigger inventory + source hash |
| R-IMP-010 | Maintainability | Import logic mixed into dashboard | Fragile system | Separate ImportService/Validation/Mapping/Repository |
| R-IMP-011 | API | Vendor timeout/pagination issue | Missing data | Pagination validation and retries |
| R-IMP-012 | Audit | Error logs include sensitive row data | Data leak | Sanitized error summaries only |

---

## 16. Final Recommendation

For Sprint 3:

1. Implement Import Engine as a pipeline with batch state, not a one-shot script.
2. Make `IMPORT_BATCHES` mandatory before writing RAW.
3. Reject missing tenant/clinic context.
4. Write RAW first and never dashboard directly from RAW.
5. Use mapping templates and validation before DW/KPI.
6. Treat duplicate detection as core logic, not an optional enhancement.
7. Keep failed/quarantined batch rows auditable but invisible to KPI.

Import Engine is approved for MVP only if idempotency, status gating, and tenant guardrails are present from the first implementation.
