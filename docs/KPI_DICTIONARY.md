# KPI_DICTIONARY

Status: **Final Technical Architecture Review**  
Scope: KPI definitions for MVP/Pilot **AI Clinic Owner Copilot**.  
Constraint: No code.

---

## 1. Executive Verdict

KPI must be treated as controlled financial/operational outputs, not ad-hoc dashboard formulas.

For Google Apps Script and Spreadsheet performance, KPI must be:

- Precomputed.
- Tenant-scoped.
- Clinic-scoped.
- Traceable to source batches and finance rows.
- Labeled with `data_status` and `trace_status`.
- Safe for dashboard and AI consumption.

Dashboard and AI should not compute final metrics directly from RAW sheets at request time.

---

## 2. Owner Questions Covered

MVP KPI must answer:

1. Berapa omzet saya?
2. Berapa laba saya?
3. Dokter mana paling menguntungkan?
4. Poli mana paling menguntungkan?
5. Berapa piutang BPJS saya?
6. Obat apa yang berisiko expired?
7. Mengapa laba naik/turun?

---

## 3. KPI Principles

1. KPI must answer owner questions.
2. KPI formula must be explicit.
3. KPI source sheets must be explicit.
4. KPI must never cross tenant unless explicitly an admin anonymized report.
5. KPI finance must carry `data_status` and `trace_status`.
6. KPI cannot be called final if core data is incomplete.
7. KPI should be precomputed and stored in KPI sheets.
8. AI must only use approved KPI/DW data, not unrestricted raw rows.
9. KPI definitions must be versioned.

---

## 4. Standard KPI Output Contract

Every KPI row must include:

| Column | Type | Required | Notes |
|---|---|---:|---|
| `kpi_id` | string | Yes | Unique row ID |
| `tenant_id` | string | Yes | Tenant scope |
| `clinic_id` | string | Yes | Clinic scope or `ALL` for allowed aggregation |
| `period` | period/date | Yes | KPI period |
| `period_type` | enum | Yes | `daily`, `monthly`, `rolling_30d`, etc. |
| `kpi_name` | string | Yes | Stable machine key |
| `kpi_label` | string | Yes | User-facing label |
| `kpi_value` | number/currency | Yes | Numeric value where possible |
| `kpi_unit` | enum | Yes | `IDR`, `count`, `percent`, `days`, `ratio` |
| `data_status` | enum | Yes | `complete`, `partial`, `estimated`, `incomplete`, `invalid` |
| `trace_status` | enum | Yes | `traceable`, `partially_traceable`, `not_traceable`, `not_applicable` |
| `source_sync_ids` | string/json | No | Source batches |
| `computed_at` | datetime | Yes | Compute timestamp |
| `schema_version` | string | Yes | Schema/KPI version |

---

## 5. Status Rules

### 5.1 Data Status

| Status | Meaning | Dashboard/AI Behavior |
|---|---|---|
| `complete` | Required source data available | Display normally |
| `partial` | Some source data missing but metric still useful | Display with warning |
| `estimated` | Uses allocation/assumption/default | Must label as estimate |
| `incomplete` | Key component missing | Do not present as final |
| `invalid` | Failed validation | Do not use as primary KPI |

### 5.2 Trace Status

| Status | Meaning |
|---|---|
| `traceable` | Can trace to sync/source row and journal/finance trace where applicable |
| `partially_traceable` | Some components traceable, some estimated/missing |
| `not_traceable` | No acceptable lineage |
| `not_applicable` | Non-finance metric where journal trace not relevant |

### 5.3 Finance Finality Rule

Net profit may be called final only if:

- revenue is complete,
- direct cost is complete,
- operating expense is complete,
- finance trace exists,
- journal entries balance if journal layer is used,
- `trace_status = traceable`.

Otherwise it must be labeled `estimated`, `partial`, or `incomplete`.

---

## 6. Core Finance KPI

### 6.1 Total Revenue

| Field | Definition |
|---|---|
| KPI Name | `total_revenue` |
| Owner Question | Berapa omzet saya? |
| Source | `DW_FINANCE` |
| Formula | Sum finance amount where transaction type is revenue |
| Unit | `IDR` |
| Required Filters | `tenant_id`, `clinic_id`, period |
| Status Risk | If revenue source incomplete, status is `incomplete` |

Notes:

- Decide whether revenue is accrual/billing or cash/payment.
- If source is payment-based, label as cash revenue.

### 6.2 Direct Cost

| Field | Definition |
|---|---|
| KPI Name | `direct_cost` |
| Owner Question | Kenapa laba turun? |
| Source | `DW_FINANCE` |
| Formula | Sum amount where transaction type is direct cost |
| Unit | `IDR` |
| Status Risk | Missing cost makes profit estimated/incomplete |

Direct cost examples:

- COGS medicine.
- Doctor fee.
- Lab cost.
- Consumables/BMHP directly tied to service.

### 6.3 Operating Expense

| Field | Definition |
|---|---|
| KPI Name | `operating_expense` |
| Owner Question | Berapa laba setelah biaya operasional? |
| Source | `DW_FINANCE` |
| Formula | Sum amount where transaction type is operating expense |
| Unit | `IDR` |
| Status Risk | Missing operating expense means net profit incomplete |

### 6.4 Gross Profit

| Field | Definition |
|---|---|
| KPI Name | `gross_profit` |
| Formula | `total_revenue - direct_cost` |
| Unit | `IDR` |
| Status Rule | Estimated if direct cost estimated |

### 6.5 Net Profit

| Field | Definition |
|---|---|
| KPI Name | `net_profit` |
| Formula | `total_revenue - direct_cost - operating_expense` |
| Unit | `IDR` |
| Status Rule | Final only if all finance components complete and traceable |

### 6.6 Profit Margin Percentage

| Field | Definition |
|---|---|
| KPI Name | `profit_margin_pct` |
| Formula | `net_profit / total_revenue` |
| Unit | `percent` |
| Edge Case | Null if total revenue is zero |

---

## 7. Growth KPI

### 7.1 Revenue Growth Percentage

| Field | Definition |
|---|---|
| KPI Name | `revenue_growth_pct` |
| Formula | `(current_total_revenue - previous_total_revenue) / previous_total_revenue` |
| Unit | `percent` |
| Edge Case | Null if previous revenue is zero or missing |

### 7.2 Profit Growth Percentage

| Field | Definition |
|---|---|
| KPI Name | `profit_growth_pct` |
| Formula | `(current_net_profit - previous_net_profit) / absolute(previous_net_profit)` |
| Unit | `percent` |
| Edge Case | Null if previous profit is zero/missing |

### 7.3 Visit Growth Percentage

| Field | Definition |
|---|---|
| KPI Name | `visit_growth_pct` |
| Source | `DW_KUNJUNGAN` / `KPI_MONTHLY` |
| Formula | `(current_visits - previous_visits) / previous_visits` |
| Unit | `percent` |

---

## 8. Doctor Profitability KPI

### 8.1 Doctor Revenue

| Field | Definition |
|---|---|
| KPI Name | `doctor_revenue` |
| Source | `DW_FINANCE`, `MASTER_DOKTER` |
| Formula | Sum revenue allocated to doctor |
| Unit | `IDR` |

### 8.2 Doctor Direct Cost

| Field | Definition |
|---|---|
| KPI Name | `doctor_direct_cost` |
| Formula | Sum direct cost allocated to doctor |
| Unit | `IDR` |

### 8.3 Doctor Gross Profit

| Field | Definition |
|---|---|
| KPI Name | `doctor_gross_profit` |
| Formula | `doctor_revenue - doctor_direct_cost` |
| Unit | `IDR` |

### 8.4 Doctor Profit Margin

| Field | Definition |
|---|---|
| KPI Name | `doctor_profit_margin_pct` |
| Formula | `doctor_gross_profit / doctor_revenue` |
| Unit | `percent` |

Allocation warning:

- If doctor cost allocation is ratio/default based, mark `estimated`.
- If doctor mapping missing, use unknown bucket and create DQ warning.

---

## 9. Poli Profitability KPI

### 9.1 Poli Revenue

| Field | Definition |
|---|---|
| KPI Name | `poli_revenue` |
| Source | `DW_FINANCE`, `MASTER_POLI` |
| Formula | Sum revenue allocated to poli |
| Unit | `IDR` |

### 9.2 Poli Direct Cost

| Field | Definition |
|---|---|
| KPI Name | `poli_direct_cost` |
| Formula | Sum direct cost allocated to poli |
| Unit | `IDR` |

### 9.3 Poli Gross Profit

| Field | Definition |
|---|---|
| KPI Name | `poli_gross_profit` |
| Formula | `poli_revenue - poli_direct_cost` |
| Unit | `IDR` |

### 9.4 Poli Profit Margin

| Field | Definition |
|---|---|
| KPI Name | `poli_profit_margin_pct` |
| Formula | `poli_gross_profit / poli_revenue` |
| Unit | `percent` |

---

## 10. BPJS KPI

### 10.1 BPJS Outstanding Total

| Field | Definition |
|---|---|
| KPI Name | `bpjs_outstanding_total` |
| Owner Question | Berapa piutang BPJS saya? |
| Source | `DW_BPJS` |
| Formula | Sum outstanding amount for unpaid/partially paid claims |
| Unit | `IDR` |

### 10.2 BPJS Aging Over 30 Days

| Field | Definition |
|---|---|
| KPI Name | `bpjs_aging_over_30_days` |
| Formula | Sum outstanding amount where aging days > 30 |
| Unit | `IDR` |

### 10.3 BPJS Aging Over 60 Days

| Field | Definition |
|---|---|
| KPI Name | `bpjs_aging_over_60_days` |
| Formula | Sum outstanding amount where aging days > 60 |
| Unit | `IDR` |

Status warning:

- If paid amount/status not available, outstanding may be estimated.
- If claim ID not traceable, status must not be complete.

---

## 11. Inventory and Pharmacy KPI

### 11.1 Medicine Expiry Risk Count

| Field | Definition |
|---|---|
| KPI Name | `medicine_expiry_risk_count` |
| Owner Question | Obat apa yang berisiko expired? |
| Source | `DW_INVENTORY`, `MASTER_OBAT` |
| Formula | Count item/batch with days to expiry within warning window and stock > 0 |
| Unit | `count` |

### 11.2 Medicine Expiry Risk Value

| Field | Definition |
|---|---|
| KPI Name | `medicine_expiry_risk_value` |
| Formula | Sum quantity times unit cost for at-risk batches |
| Unit | `IDR` |

### 11.3 Stockout Risk Count

| Field | Definition |
|---|---|
| KPI Name | `stockout_risk_count` |
| Formula | Count medicine where stock <= min_stock_qty |
| Unit | `count` |

Inventory warning:

- If batch/expiry data unavailable, expiry risk is incomplete, not zero.
- If unit cost unavailable, value is estimated/incomplete.

---

## 12. Profit Change Driver KPI

Purpose: answer “mengapa laba naik/turun?”

Minimum driver components:

| Driver | Formula Concept |
|---|---|
| Revenue effect | Current revenue minus previous revenue |
| Direct cost effect | Previous direct cost minus current direct cost |
| Operating expense effect | Previous opex minus current opex |
| Volume effect | Current visits minus previous visits |
| Margin effect | Current margin minus previous margin |

Output should identify top drivers by absolute impact.

Rules:

- If previous period missing, do not fabricate growth explanation.
- If cost data incomplete, say profit driver is limited.
- AI summary must mention data limitations.

---

## 13. Dashboard Display Rules

| KPI Status | Display Behavior |
|---|---|
| `complete + traceable` | Normal display |
| `partial` | Display with warning icon/text |
| `estimated` | Display as estimate, not final |
| `incomplete` | Show missing data state |
| `invalid` | Hide from primary KPI and show issue |

Never show net profit as confident/final when direct cost or operating expense is missing.

---

## 14. KPI Compute Strategy for Google Apps Script

1. Compute KPI after successful import batch.
2. Compute KPI on schedule for daily/monthly refresh.
3. Dashboard reads precomputed rows only.
4. Use period and tenant/clinic filters.
5. Avoid scanning all historical RAW rows per dashboard load.
6. Store source sync IDs for lineage.
7. Recompute affected periods only after import/rollback.

---

## 15. Technical Risks and Mitigations

| Risk ID | Area | Failure Mode | Impact | Mitigation |
|---|---|---|---|---|
| R-KPI-001 | Finance | Missing direct/opex treated as zero | False profit | Status rules and DQ warnings |
| R-KPI-002 | Traceability | KPI cannot trace to source rows | Audit failure | Store sync IDs and finance trace map |
| R-KPI-003 | Performance | Dashboard computes KPI live from RAW | Slow/timeouts | Precompute KPI sheets |
| R-KPI-004 | Multi Tenant | KPI query missing tenant filter | Cross-tenant leakage | TenantContext required on every read |
| R-KPI-005 | Maintainability | Formula definitions scattered | Inconsistent numbers | Canonical KPI dictionary and versioning |
| R-KPI-006 | Mapping | Doctor/poli unknown | Wrong rankings | Unknown bucket + mapping DQ warnings |
| R-KPI-007 | BPJS | Missing paid status | Wrong receivable | Mark estimated/incomplete |
| R-KPI-008 | Inventory | Missing expiry/batch data | False “no risk” | Incomplete status, not zero risk |
| R-KPI-009 | AI | AI overstates estimates | Owner misled | AI guardrail reads status fields |
| R-KPI-010 | Apps Script | Large KPI recomputation exceeds limits | Failed refresh | Period-scoped incremental recompute |

---

## 16. Final Recommendation

For Sprint 4 and Sprint 5:

1. Implement KPI only after DW and finance trace are stable.
2. Store KPI outputs as rows with status and schema version.
3. Keep dashboard and AI read-only against KPI/DW approved data.
4. Treat incomplete source data as a first-class state.
5. Build finance KPI acceptance tests around complete, estimated, incomplete, and invalid scenarios.

KPI design is approved for MVP if every owner-facing number can explain: source, formula, scope, status, and traceability.
