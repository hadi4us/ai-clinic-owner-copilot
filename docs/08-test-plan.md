# 08. Test Plan

## Test Strategy

Testing must prove that the system:

1. does not require double entry.
2. preserves SIM Klinik as source of truth.
3. calculates owner metrics correctly.
4. protects tenant data.
5. serves dashboard and AI answers within acceptable time.
6. supports safe deployment as SaaS MVP.

## Test Levels

### 1. Unit Tests

Target:

- calculation services.
- mapping functions.
- validation utilities.
- authorization guards.

Examples:

- net profit calculation.
- BPJS receivable calculation.
- inventory risk level classification.
- doctor profitability allocation.
- date period parsing.

### 2. Integration Tests

Target:

- CSV/XLSX import to raw sheets.
- raw to staging transformation.
- staging to fact/dimension mapping.
- fact to metrics calculation.
- dashboard API response.
- MCP tool API response.

### 3. End-to-End Tests

Target owner flows:

1. Import SIM Klinik export.
2. Run sync and metric calculation.
3. Open dashboard.
4. See profit summary.
5. Ask AI “Mengapa laba turun?”
6. Receive Telegram daily summary.

### 4. Security Tests

Target:

- cross-tenant access denial.
- role access denial.
- invalid token rejection.
- notification recipient validation.
- AI raw data access restriction.

### 5. Performance Tests

Target success metric:

- common AI answer <10 seconds.
- dashboard summary load <3 seconds for MVP dataset.
- metric calculation completes within Apps Script execution limits.

## Test Data Fixtures

Create sample tenant datasets:

### Tenant A: Normal Clinic

- stable revenue.
- normal medicine stock.
- BPJS paid mostly on time.

### Tenant B: Profit Drop Scenario

- revenue up, profit down.
- HPP obat increased.
- operational expense increased.
- BPJS receivable increased.

### Tenant C: Inventory Risk Scenario

- expiring soon batches.
- slow-moving medicines.
- overstock.

### Tenant D: Data Quality Scenario

- missing doctor mapping.
- missing poli mapping.
- missing expense data.
- BPJS paid greater than claim amount.

## Functional Test Cases

### FT-001 Profit Summary

Given:

- revenue Rp125,000,000.
- direct cost Rp52,000,000.
- operating expense Rp28,000,000.

Expected:

- gross profit Rp73,000,000.
- net profit Rp45,000,000.
- margin 36%.

### FT-002 Profit Drop Explanation

Given:

- May net profit Rp62,000,000.
- June net profit Rp45,000,000.
- medicine COGS up Rp9,000,000.
- BPJS receivable impact Rp5,000,000.

Expected:

- profit drop Rp17,000,000.
- explanation includes medicine COGS and BPJS.

### FT-003 Doctor Profitability Ranking

Expected:

- doctors sorted by net profit descending.
- visits and revenue do not alone determine rank.
- allocated costs included.

### FT-004 Poli Profitability Ranking

Expected:

- poli sorted by net profit descending.
- margin shown.

### FT-005 BPJS Receivable Aging

Expected:

- outstanding = approved amount - paid amount.
- aging buckets correctly calculated.
- if approved unavailable, response basis changes to claim amount minus paid amount.

### FT-006 Inventory Risk

Expected:

- expired stock = critical.
- expiring soon = high/medium based on days to expiry.
- slow-moving stock flagged.
- risk value = stock quantity x unit cost.

### FT-007 Growth Trend

Expected:

- month-over-month revenue/profit/visit growth percentages correct.

## Security Test Cases

### ST-001 Tenant Isolation

Attempt Tenant A actor requesting Tenant B metrics.

Expected:

- request rejected with `FORBIDDEN`.
- audit log created.

### ST-002 Staff Financial Access

Staff user requests owner profit dashboard.

Expected:

- rejected unless explicitly permitted.

### ST-003 MCP Unauthorized Tool

AI requests raw sheet access tool.

Expected:

- rejected with `TOOL_NOT_ALLOWED`.

### ST-004 Invalid MCP Token

Request `/api/ai/tool` with invalid token.

Expected:

- rejected with `UNAUTHORIZED`.

### ST-005 Notification Recipient Protection

Try sending summary to unverified Telegram/WhatsApp recipient.

Expected:

- rejected.
- no message sent.
- audit log created.

## Data Quality Test Cases

### DQ-001 Missing Doctor Mapping

Expected:

- metric still calculated where possible.
- warning shown: `missing_doctor_mapping`.
- AI response includes caveat.

### DQ-002 Missing Expense Data

Expected:

- net profit either blocked or labeled incomplete depending severity.
- gross profit may still show.

### DQ-003 Duplicate Import Rows

Expected:

- duplicate source row IDs not double-counted.
- sync log reports duplicate count.

### DQ-004 Negative Revenue

Expected:

- negative revenue flagged unless transaction type is refund/adjustment.

## Performance Test Cases

### PT-001 Dashboard Summary Load

Dataset:

- 50,000 fact rows.

Expected:

- dashboard summary from metric sheets loads <3 seconds.

### PT-002 AI Profit Answer

Question:

- “Berapa laba bulan ini?”

Expected:

- tool call + answer <10 seconds.

### PT-003 Metric Calculation

Dataset:

- 100,000 rows.

Expected:

- completes within Apps Script execution constraints or batches safely.

## User Acceptance Criteria

Owner should be able to say yes to:

- Saya tahu laba bersih bulan ini.
- Saya tahu penyebab laba naik/turun.
- Saya tahu dokter dan poli paling menguntungkan.
- Saya tahu piutang BPJS yang perlu dikejar.
- Saya tahu obat yang berpotensi menjadi kerugian.
- Saya menerima ringkasan harian tanpa minta staff input ulang.

Staff should be able to say yes to:

- Saya tidak input data dua kali.
- Saya hanya export/connect data dari SIM Klinik.
- Sistem ini tidak mengganggu workflow klinik.

## Manual QA Checklist Before MVP Release

- [ ] Import sample SIM data works.
- [ ] Dashboard opens on mobile.
- [ ] KPI cards show correct values.
- [ ] Charts render correctly.
- [ ] AI answers top owner questions.
- [ ] AI refuses/clarifies when data missing.
- [ ] Telegram summary works in test mode.
- [ ] WhatsApp summary works in test mode if enabled.
- [ ] Tenant isolation tested.
- [ ] Audit logs created.
- [ ] Data quality warnings visible.
