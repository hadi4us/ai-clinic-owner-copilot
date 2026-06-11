# KPI Validation

Status: **Validation Spec / Traceability Checklist**  
Scope: Revenue, Profit, Margin, and BPJS Receivable for AI Clinic Owner Copilot.  
Primary rule: every KPI shown to owner/dashboard/AI must be traceable to source transaction rows. If lineage is incomplete, the KPI must be labelled `estimated`, `partial`, `incomplete`, or `not_traceable` and must not be presented as final.

---

## 1. Validation Goal

KPI validation proves four things:

1. **Formula correctness** — KPI value follows the approved formula.
2. **Scope correctness** — KPI is filtered by `tenant_id`, `clinic_id`, and period.
3. **Source traceability** — KPI can be drilled down to transaction/fact rows and their original import rows.
4. **Status honesty** — KPI output carries `data_status` and `trace_status` that match source completeness and trace quality.

Required KPI set:

| KPI | Must trace to source transaction? | Must be final only if traceable? |
|---|---:|---:|
| Revenue | Yes | Yes |
| Profit / Net Profit | Yes | Yes |
| Margin | Yes, through Revenue + Profit | Yes |
| BPJS Receivable | Yes | Yes |

---

## 2. Canonical Traceability Chain

Every KPI must be explainable through this chain:

```text
KPI row
→ finance/BPJS metric component
→ normalized warehouse/fact row
→ import batch
→ source_row_id / source transaction row
→ source file/API/export
```

For accounting-backed finance outputs, the stronger chain is required:

```text
KPI row
→ finance_trace_map
→ journal_entry + journal_line
→ normalized finance fact row
→ import batch
→ source_row_id / source transaction row
→ source file/API/export
```

If a KPI cannot provide the source rows behind the number, `trace_status` must not be `traceable`.

---

## 3. Minimum Trace Fields

### 3.1 Fact / Transaction Rows

Each source-derived row used by these KPI must include:

| Field | Required | Applies to | Purpose |
|---|---:|---|---|
| `tenant_id` | Yes | all | Tenant isolation |
| `clinic_id` | Yes | all | Clinic scope |
| `import_id` / `sync_id` | Yes | all | Import batch lineage |
| `source_row_id` | Yes | all | Original source transaction row |
| business date | Yes | all | Period filter |
| amount field | Yes | all | KPI calculation |
| `trace_status` | Yes for finance, recommended for BPJS | all | Row-level trace quality |
| `journal_entry_id` | Yes where journal layer exists | finance | Accounting trace |

Current MVP sheet names use `import_id`; final architecture may use `sync_id`. Treat both as batch lineage fields, but production validation should standardize on one canonical key or map them explicitly.

### 3.2 KPI Rows

KPI rows must include:

| Field | Required | Purpose |
|---|---:|---|
| `tenant_id` | Yes | Tenant isolation |
| `clinic_id` | Yes | Clinic scope |
| `period` / `kpi_date` | Yes | Time scope |
| KPI value fields | Yes | Display/API values |
| `data_status` | Yes | Completeness status |
| `trace_status` | Yes | Lineage status |
| `computed_at` | Yes | Recompute audit |
| `source_sync_ids` or trace summary | Recommended | Batch-level drilldown |

---

## 4. KPI Formula Validation

## 4.1 Revenue

### Approved Formula

```text
total_revenue = sum(PENDAPATAN.net_amount)
```

Fallback only for legacy/diagnostic mode:

```text
total_revenue = sum(TINDAKAN.net_amount) + sum(RESEP.net_amount)
```

### Required Filters

```text
PENDAPATAN.tenant_id = tenant_id
PENDAPATAN.clinic_id = clinic_id
PENDAPATAN.transaction_date within period
PENDAPATAN.status not in cancelled/refund/cancel
```

### Required Source Trace

Each revenue row contributing to `total_revenue` must have:

- `revenue_id`
- `transaction_id`
- `import_id` or `sync_id`
- `source_row_id`
- `transaction_date`
- `net_amount`
- `trace_status = traceable`

For stronger accounting validation, each revenue row must also be traceable to balanced `journal_entry` and `journal_line` records through `finance_trace_map`.

### Validation Query / Reconciliation

```text
revenue_kpi.total_revenue
= sum(all scoped PENDAPATAN.net_amount rows used by KPI)
= sum(revenue-linked journal credit/debit impact, according to COA normal balance)
```

### Failure Conditions

| Condition | Expected Status |
|---|---|
| No revenue rows in period | `data_status = incomplete` |
| Some revenue rows missing source lineage | `trace_status = partially_traceable` |
| All revenue rows missing source lineage | `trace_status = not_traceable` |
| Journal required but missing/unbalanced | `data_status = incomplete`, `trace_status != traceable` |

---

## 4.2 Profit / Net Profit

### Approved Formula

```text
gross_profit = total_revenue - direct_cost
net_profit = total_revenue - direct_cost - operating_expense
```

Current MVP implementation stores combined cost as `total_cost`:

```text
net_profit = total_revenue - total_cost
```

For production validation, `total_cost` must be decomposable into direct cost and operating expense, or Net Profit cannot be called fully final.

### Required Filters

Revenue filters follow section 4.1.

Cost filters:

```text
BIAYA.tenant_id = tenant_id
BIAYA.clinic_id = clinic_id
BIAYA.expense_date within period
BIAYA.status not in cancelled/cancel
```

Cost classification must distinguish:

- Direct cost: medicine COGS, doctor fee, lab cost, consumables/BMHP, other directly tied service cost.
- Operating expense: salary, rent, utilities, admin, marketing, supplies, other overhead.

### Required Source Trace

Every cost/expense row contributing to profit must have:

- `expense_id`
- `import_id` or `sync_id`
- `source_row_id`
- `expense_date`
- `expense_category`
- `cost_type`
- `amount`
- `trace_status = traceable`

For final finance status, revenue and all cost/expense components must be traceable to source rows and accounting trace/journals where the journal layer is enabled.

### Validation Reconciliation

```text
kpi.total_revenue = sum(scoped revenue rows)
kpi.total_cost = sum(scoped BIAYA.amount) + medicine COGS if separately sourced
kpi.gross_profit = kpi.total_revenue - direct_cost
kpi.net_profit = kpi.total_revenue - direct_cost - operating_expense
```

If only `total_cost` is available:

```text
kpi.net_profit = kpi.total_revenue - kpi.total_cost
```

But `data_status` should be no stronger than `estimated` unless direct cost and operating expense completeness is proven.

### Failure Conditions

| Condition | Expected Status |
|---|---|
| Revenue missing | `data_status = incomplete` |
| Direct cost missing | `data_status = incomplete` or `estimated` with explicit warning |
| Operating expense missing | `data_status = incomplete` for Net Profit |
| Any material finance row not traceable | `trace_status = partially_traceable` or `not_traceable` |
| Journal trace required but absent | KPI must not be final |

---

## 4.3 Margin

### Approved Formula

```text
profit_margin = net_profit / total_revenue
```

If `total_revenue = 0`:

```text
profit_margin = null
```

### Required Trace

Margin is a derived KPI. It inherits the weakest status of Revenue and Net Profit.

```text
margin.data_status = weakest(revenue.data_status, profit.data_status)
margin.trace_status = weakest(revenue.trace_status, profit.trace_status)
```

### Validation Reconciliation

```text
kpi.profit_margin = kpi.net_profit / kpi.total_revenue
```

Rounded display values must not be used as source for downstream calculations.

### Failure Conditions

| Condition | Expected Status |
|---|---|
| Revenue is zero | `profit_margin = null` |
| Revenue or Profit incomplete | Margin is not final |
| Revenue or Profit not traceable | `trace_status != traceable` |

---

## 4.4 BPJS Receivable

### Approved Formula

Preferred source: normalized BPJS claim rows.

```text
bpjs_receivable = sum(BPJS_KLAIM.outstanding_amount)
```

If `outstanding_amount` is not explicitly available:

```text
bpjs_receivable = max(sum(approved_amount) - sum(paid_amount), 0)
```

If approval is not available but submitted claim is the only source:

```text
bpjs_receivable_estimate = max(sum(claim_amount or submitted_amount) - sum(paid_amount), 0)
```

This last version must be labelled `estimated`.

### Required Filters

```text
BPJS_KLAIM.tenant_id = tenant_id
BPJS_KLAIM.clinic_id = clinic_id
BPJS_KLAIM.claim_period/service_month/claim_date within period
BPJS_KLAIM.claim_status not in rejected/cancelled where rejected claims are not receivable
```

### Required Source Trace

Each BPJS receivable row must have:

- `claim_id`
- `claim_ref`
- `visit_id` when available
- `import_id` or `sync_id`
- `source_row_id`
- `claim_period` or `service_month`
- `claim_amount`
- `approved_amount` when available
- `paid_amount`
- `outstanding_amount` or enough fields to derive it
- `claim_status`
- `aging_days` or enough dates to derive it

If BPJS receivable is also represented in accounting, it should map to AR journal/account rows through `finance_trace_map` or equivalent.

### Validation Reconciliation

```text
kpi.bpjs_outstanding_amount
= sum(scoped BPJS_KLAIM.outstanding_amount)
```

or, when explicit outstanding is absent:

```text
kpi.bpjs_outstanding_amount
= max(sum(scoped BPJS_KLAIM.approved_amount) - sum(scoped BPJS_KLAIM.paid_amount), 0)
```

Cross-check against revenue rows:

```text
sum(PENDAPATAN.receivable_amount where payer_type/payment_method = bpjs)
≈ sum(BPJS_KLAIM.outstanding_amount)
```

Differences must be explained by timing, rejected claims, deductions, or claim approval adjustments.

### Failure Conditions

| Condition | Expected Status |
|---|---|
| No BPJS rows but BPJS KPI requested | `data_status = incomplete` |
| Claim amount exists but payment/approval data missing | `data_status = partial` or `estimated` |
| Source row lineage missing | `trace_status != traceable` |
| Paid amount greater than claim/approved without adjustment note | Data quality warning |
| Rejected/cancelled claims included as receivable | Validation failure |

---

## 5. Drilldown Requirements

Dashboard/API/AI should be able to answer these drilldown questions for every displayed KPI:

### Revenue Drilldown

```text
Show transaction rows behind total_revenue for tenant/clinic/period.
```

Minimum columns:

- `transaction_id`
- `revenue_id`
- `transaction_date`
- `revenue_type`
- `item_name`
- `net_amount`
- `payer_type`
- `import_id` / `sync_id`
- `source_row_id`
- `trace_status`

### Profit Drilldown

```text
Show revenue rows and cost/expense rows behind net_profit.
```

Minimum cost columns:

- `expense_id`
- `expense_date`
- `expense_category`
- `cost_type`
- `amount`
- `allocation_target`
- `related_visit_id` / `related_item_code` when available
- `import_id` / `sync_id`
- `source_row_id`
- `trace_status`

### Margin Drilldown

```text
Show numerator and denominator trace: net_profit components + total_revenue components.
```

### BPJS Drilldown

```text
Show claim rows behind bpjs_receivable.
```

Minimum columns:

- `claim_id`
- `claim_ref`
- `visit_id`
- `claim_period` / `service_month`
- `claim_status`
- `claim_amount`
- `approved_amount`
- `paid_amount`
- `outstanding_amount`
- `aging_days`
- `import_id` / `sync_id`
- `source_row_id`

---

## 6. Validation Status Matrix

| Data Completeness | Trace Quality | KPI Status | Allowed wording |
|---|---|---|---|
| Complete | Traceable | `complete` + `traceable` | “final management KPI” |
| Complete | Partially traceable | `estimated` + `partially_traceable` | “estimasi, sebagian belum traceable” |
| Partial | Traceable | `partial`/`estimated` + `traceable` | “belum final karena data belum lengkap” |
| Incomplete | Any | `incomplete` | “belum bisa dihitung final” |
| Invalid | Any | `invalid` | “jangan digunakan” |
| Any | Not traceable | not final | “tidak traceable ke sumber transaksi” |

---

## 7. Current Implementation Validation Notes

Based on current GAS/source structure:

### Already aligned

- `KPI_BULANAN` stores Revenue, Gross Profit, Net Profit, Margin, BPJS claim/paid/outstanding, `data_status`, and `trace_status`.
- Revenue is computed from `PENDAPATAN.net_amount` scoped by tenant/clinic/period.
- Profit is computed from Revenue minus cost rows from `BIAYA` plus medicine COGS where present.
- Margin is computed from Net Profit divided by Revenue and returns `null` when Revenue is zero.
- BPJS Receivable is represented by `BPJS_KLAIM.outstanding_amount` and surfaced as `bpjs_outstanding_amount`.
- Revenue/expense rows include `import_id`, `source_row_id`, and `trace_status`.
- Fixture revenue rows include transaction IDs and source row IDs.

### Gaps to close before calling production KPI fully traceable

| Gap | Impact | Required Fix |
|---|---|---|
| `KPI_BULANAN` does not store direct source row list or trace summary | Drilldown depends on recalculating from fact sheets | Add `source_sync_ids` / `trace_summary_json` or persistent `finance_trace_map` linkage |
| Current MVP trace check uses `source_row_id + import_id + trace_status`, not full journal validation | Finance may be traceable to import but not proven to balanced journal | Validate through `finance_trace_map`, `journal_entry`, and `journal_line` for final finance status |
| `BIAYA` currently aggregates all costs into `total_cost`; direct cost vs operating expense is not fully explicit in KPI output | Net Profit can be hard to audit by component | Store `direct_cost` and `operating_expense` separately in KPI/metric output |
| `BPJS_KLAIM` schema has `import_id` and `source_row_id` but no row-level `trace_status` | BPJS receivable trace quality cannot be classified consistently | Add `trace_status` or derive trace status from source lineage completeness |
| BPJS dashboard summary currently may mark BPJS as estimated even when rows exist | Conservative but not final | Promote to complete only when claim, approval/payment, outstanding, and source lineage are complete |
| Revenue fallback to TINDAKAN + RESEP can hide missing `PENDAPATAN` | May bypass finance transaction source | Restrict fallback to diagnostic mode and mark estimated/incomplete |

---

## 8. Required Test Cases

### 8.1 Happy Path: Fully Traceable Finance

Given:

- Revenue rows exist with `import_id`, `source_row_id`, `trace_status = traceable`.
- Cost/expense rows exist with `import_id`, `source_row_id`, `trace_status = traceable`.
- Journal trace exists and balances where journal validation is enabled.

Expect:

```text
total_revenue = source revenue sum
net_profit = revenue - direct_cost - operating_expense
profit_margin = net_profit / total_revenue
data_status = complete
trace_status = traceable
```

### 8.2 Missing Revenue

Expect:

```text
total_revenue = 0
data_status = incomplete
warning = missing_revenue
profit and margin not final
```

### 8.3 Missing Cost

Expect:

```text
profit status != complete
warning = missing_direct_cost or missing_operating_expense
AI/dashboard labels profit as estimated/incomplete
```

### 8.4 Missing Trace

Given rows exist but some missing `source_row_id` or `import_id`.

Expect:

```text
trace_status = partially_traceable or not_traceable
KPI not final
```

### 8.5 BPJS Receivable With Explicit Outstanding

Given BPJS rows with source lineage and `outstanding_amount`.

Expect:

```text
bpjs_outstanding_amount = sum(outstanding_amount)
drilldown returns contributing claim rows
```

### 8.6 BPJS Receivable Derived From Approval and Payment

Given no `outstanding_amount`, but approved and paid amounts exist.

Expect:

```text
bpjs_outstanding_amount = max(sum(approved_amount) - sum(paid_amount), 0)
data_status = complete only if source lineage and approval/payment data complete
```

### 8.7 BPJS Receivable Estimated From Claim and Payment

Given only claim/submitted and paid amounts exist.

Expect:

```text
bpjs_outstanding_amount = max(sum(claim_amount) - sum(paid_amount), 0)
data_status = estimated
```

---

## 9. Manual Validation Checklist

Before KPI is approved for a tenant/period:

- [ ] `tenant_id`, `clinic_id`, and period filters are applied consistently.
- [ ] Revenue KPI equals sum of included transaction rows.
- [ ] Revenue drilldown lists all contributing `PENDAPATAN` rows.
- [ ] Revenue rows have `import_id`/`sync_id` and `source_row_id`.
- [ ] Profit equals Revenue minus direct cost and operating expense.
- [ ] Profit drilldown lists all revenue, direct cost, and operating expense components.
- [ ] Cost/expense rows have `import_id`/`sync_id` and `source_row_id`.
- [ ] Margin equals Net Profit divided by Revenue.
- [ ] Margin is `null` if Revenue is zero.
- [ ] BPJS Receivable equals sum of explicit outstanding, or approved minus paid, or estimated claim minus paid with proper status.
- [ ] BPJS drilldown lists all contributing claim rows.
- [ ] BPJS rows have `import_id`/`sync_id` and `source_row_id`.
- [ ] `data_status` matches completeness.
- [ ] `trace_status` matches source/journal trace quality.
- [ ] Any warning in data quality log is reflected in dashboard/AI caveat.
- [ ] AI responses do not call KPI final unless `data_status = complete` and `trace_status = traceable`.

---

## 10. Acceptance Criteria

KPI validation passes only when:

1. Revenue can be traced to every contributing source transaction row.
2. Profit can be traced to every contributing revenue and cost/expense source row.
3. Margin can be traced through its Revenue and Profit components.
4. BPJS Receivable can be traced to every contributing claim/payment source row.
5. The recomputed totals from drilldown rows exactly match KPI rows, allowing only documented rounding for display.
6. `data_status` and `trace_status` are conservative and never overstate reliability.
7. Dashboard/API/AI wording follows status: final only when complete and traceable.

---

## 11. Recommended Next Implementation Tasks

1. Add or finalize a trace map for KPI rows:

```text
metric_key, period, fact_sheet, fact_id, source_row_id, import_id/sync_id, journal_entry_id, trace_status
```

2. Add BPJS row-level trace status or a BPJS trace validator.
3. Split KPI finance output into `direct_cost` and `operating_expense` instead of only `total_cost`.
4. Add API/service drilldown functions for Revenue, Profit, Margin, and BPJS Receivable.
5. Add automated tests that recompute KPI from drilldown rows and fail if totals/status do not match.
