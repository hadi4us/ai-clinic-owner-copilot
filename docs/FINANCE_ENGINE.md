# Finance Engine

## Purpose

Finance Engine adalah service layer Google Apps Script untuk menghasilkan laporan akuntansi dari Google Spreadsheet warehouse.

Engine ini mengikuti aturan `CLAW.md`:

> Seluruh laporan keuangan harus dapat diturunkan dari jurnal akuntansi yang valid.
>
> Dashboard tidak boleh menghasilkan angka yang tidak dapat ditelusuri ke jurnal sumber.

Artinya: laporan finance harus dibangun dari `journal_entry`, `journal_line`, dan `cfg_coa`, bukan dari angka dashboard yang tidak punya jejak jurnal.

---

## Scope

Finance Engine menghasilkan enam output utama:

1. **Jurnal Umum**
2. **Buku Besar**
3. **Neraca Saldo**
4. **Laporan Laba Rugi**
5. **Neraca**
6. **Arus Kas**

Implemented service files:

```text
src/Finance/FinanceEngineCommon.gs
src/Finance/JournalService.gs
src/Finance/LedgerService.gs
src/Finance/ProfitLossService.gs
src/Finance/BalanceSheetService.gs
src/Finance/CashflowService.gs
```

Requested service files:

```text
src/Finance/JournalService.gs
src/Finance/LedgerService.gs
src/Finance/ProfitLossService.gs
src/Finance/BalanceSheetService.gs
src/Finance/CashflowService.gs
```

`FinanceEngineCommon.gs` ditambahkan sebagai helper internal supaya logic shared tidak duplikatif.

---

## Spreadsheet Source Tables

Finance Engine menggunakan Google Spreadsheet sebagai sumber data.

Primary source:

### `cfg_coa`

Chart of Accounts.

Columns:

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

Columns:

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

Journal debit/credit lines.

Columns:

- `tenant_id`
- `clinic_id`
- `journal_line_id`
- `journal_entry_id`
- `coa_id`
- `debit`
- `credit`
- `line_memo`
- `created_at`

Supporting trace source:

### `finance_trace_map`

Used by KPI/traceability chain to connect metrics to facts/source rows/journals.

---

## Architecture

```text
Google Spreadsheet
  ├─ cfg_coa
  ├─ journal_entry
  └─ journal_line
        ↓
JournalService
        ↓
LedgerService
        ├─ Buku Besar
        └─ Neraca Saldo
        ↓
ProfitLossService
BalanceSheetService
CashflowService
```

All functions are tenant-scoped:

```javascript
assertTenantScope_(tenantId, clinicId);
requireClinicAccess_(session, clinicId);
```

No finance report should be generated without `tenant_id` and `clinic_id`.

---

## Service Responsibilities

## 1. JournalService.gs

Builds **Jurnal Umum** from `journal_entry` + `journal_line` + `cfg_coa`.

Main function:

```javascript
getGeneralJournal(tenantId, clinicId, period)
```

Output structure:

```javascript
{
  ok: true,
  report_name: 'Jurnal Umum',
  tenant_id: '...',
  clinic_id: '...',
  period: '2026-06',
  data_status: 'complete',
  trace_status: 'traceable',
  summary: {
    entry_count: 13,
    total_debit: 4360000,
    total_credit: 4360000,
    is_balanced: true
  },
  data: [
    {
      journal_entry_id: 'je_rev_001',
      entry_date: '2026-06-01',
      source_type: 'fact_revenue',
      source_id: 'rev_001',
      source_row_id: '...',
      sync_id: '...',
      description: 'Revenue konsultasi',
      total_debit: 150000,
      total_credit: 150000,
      is_balanced: true,
      lines: [ ... ]
    }
  ]
}
```

Validation:

- Debit and credit per journal entry should balance.
- Total debit and total credit should balance.
- If empty/unbalanced, `data_status` becomes `incomplete`.

---

## 2. LedgerService.gs

Builds:

- **Buku Besar**
- **Neraca Saldo**

Main functions:

```javascript
getGeneralLedger(tenantId, clinicId, period)
getTrialBalance(tenantId, clinicId, period)
```

### Buku Besar

Grouped by account/COA.

Output per account:

```javascript
{
  coa_id: 'coa_revenue',
  coa_code: '4000',
  coa_name: 'Revenue',
  coa_type: 'revenue',
  normal_balance: 'credit',
  total_debit: 0,
  total_credit: 1950000,
  ending_balance: 1950000,
  entries: [ ... ]
}
```

### Neraca Saldo

Derived from Buku Besar.

Output per account:

```javascript
{
  coa_id: 'coa_revenue',
  coa_code: '4000',
  coa_name: 'Revenue',
  coa_type: 'revenue',
  normal_balance: 'credit',
  debit_balance: 0,
  credit_balance: 1950000,
  total_debit: 0,
  total_credit: 1950000
}
```

Rule:

```text
Neraca Saldo balanced when total debit balance = total credit balance.
```

---

## 3. ProfitLossService.gs

Builds **Laporan Laba Rugi** from ledger balances.

Main function:

```javascript
getProfitLossStatement(tenantId, clinicId, period)
```

Formula:

```text
total_revenue = sum revenue accounts
direct_cost = sum direct_cost / cogs accounts
gross_profit = total_revenue - direct_cost
operating_expense = sum expense accounts
net_profit = gross_profit - operating_expense
profit_margin = net_profit / total_revenue
```

Output:

```javascript
{
  revenue: { rows: [...], total: 1950000 },
  direct_cost: { rows: [...], total: 660000 },
  gross_profit: 1290000,
  operating_expense: { rows: [...], total: 1750000 },
  net_profit: -460000,
  profit_margin: -0.2358
}
```

Guardrail:

- If revenue is zero/missing, `data_status = incomplete`.
- Trace status follows journal availability.

---

## 4. BalanceSheetService.gs

Builds **Neraca** from trial balance and current period profit.

Main function:

```javascript
getBalanceSheet(tenantId, clinicId, period)
```

Formula:

```text
Assets = sum asset accounts
Liabilities = sum liability accounts
Equity = sum equity accounts + current period net profit
Balance check = Assets == Liabilities + Equity
```

Output:

```javascript
{
  assets: { accounts: [...], total: 10000000 },
  liabilities: { accounts: [...], total: 3000000 },
  equity: {
    accounts: [...],
    total: 7460000,
    current_period_profit: -460000,
    total_with_current_period_profit: 7000000
  },
  total_assets: 10000000,
  total_liabilities_and_equity: 10000000,
  is_balanced: true
}
```

If not balanced:

- `data_status = estimated`
- report caveat says the report is not final.

---

## 5. CashflowService.gs

Builds **Arus Kas** from cash/bank/receivable/payable journal movements.

Main function:

```javascript
getCashflowStatement(tenantId, clinicId, period)
```

Cash account detection uses COA metadata/name/id containing:

- `cash`
- `kas`
- `bank`
- `receivable`
- `payable`

Activity classification:

- `operating`
- `investing`
- `financing`

Default classification is `operating` unless journal/COA text indicates investing or financing.

Output:

```javascript
{
  operating: {
    cash_inflow: 1950000,
    cash_outflow: 2410000,
    net_cashflow: -460000,
    rows: [...]
  },
  investing: { ... },
  financing: { ... },
  net_cashflow: -460000
}
```

---

## Shared Helpers

`FinanceEngineCommon.gs` contains helper functions:

- `readFinanceSheetRows_()`
- `getChartOfAccountsById_()`
- `groupRowsBy_()`
- `sumField_()`
- `calculateAccountBalance_()`
- `inferNormalBalance_()`
- `buildFinanceReportResponse_()`
- `buildFinanceCaveat_()`
- `filterAccountsByType_()`
- `filterAccountsByCategoryOrType_()`
- `sumAccountBalances_()`
- `buildStatementSection_()`
- `buildBalanceSheetSection_()`

---

## Traceability and Data Status

Every report response includes:

- `data_status`
- `trace_status`
- `caveat`

Caveat examples:

```text
Angka berasal dari jurnal dan buku besar yang traceable untuk kebutuhan management reporting.
```

or:

```text
Angka belum boleh dianggap final karena data_status/trace_status belum complete dan traceable.
```

---

## Public API Functions

Finance Engine service functions that can be called internally:

```javascript
getGeneralJournal(tenantId, clinicId, period)
getGeneralLedger(tenantId, clinicId, period)
getTrialBalance(tenantId, clinicId, period)
getProfitLossStatement(tenantId, clinicId, period)
getBalanceSheet(tenantId, clinicId, period)
getCashflowStatement(tenantId, clinicId, period)
```

Recommended future wrapper:

```javascript
getFinanceReport(reportType, tenantId, clinicId, period)
```

Where `reportType` can be:

- `general_journal`
- `general_ledger`
- `trial_balance`
- `profit_loss`
- `balance_sheet`
- `cashflow`

---

## Non-Scope

This implementation does not create:

- Dashboard UI.
- Tax filing engine.
- Official audited financial statements.
- Bank reconciliation.
- Accounts receivable aging.
- Accounts payable aging.
- Depreciation schedules.

Those can be added after journal + ledger reliability is proven.

---

## MVP Limitation

The engine currently assumes journal rows already exist in the spreadsheet.

Earlier MVP V1 code can generate synthetic management-accounting journal rows from traceable finance facts. For production/pilot, journal generation should be hardened with:

- validated COA mapping
- source row trace
- sync id trace
- balanced journal enforcement
- audit log
- data quality warnings

---

## Verification

The Finance Engine source files were checked for Google Apps Script V8-compatible syntax by copying `.gs` files to temporary `.js` files and running `node --check`.

Expected verification output:

```text
finance_engine_syntax_ok=true
```
