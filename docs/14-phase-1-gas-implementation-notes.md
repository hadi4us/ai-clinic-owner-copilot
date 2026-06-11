# 14. Phase 1 GAS Implementation Notes

## Current GAS Project

- Spreadsheet ID: `1XujOwLJprl1LjdEWoSAuhDEABsul3__zXQicfFy5bB4`
- Apps Script ID: `1-2IlwXdJ6jih3KRgO5cOHQon2zDnYGEq06gyXAa37wPGk4KE99Tgoaoy`
- Local clasp root: `gas/src`

## Implemented Files

- `appsscript.json`
- `Config.js`
- `Schema.js`
- `SpreadsheetService.js`
- `Setup.js`
- `Fixture.js`
- `KpiEngine.js`
- `Utils.js`
- `Api.js`
- `Tests.js`
- `Kode.js`

## Implemented Functions

### Setup

- `setupPhase1Warehouse()`
  - creates/updates Phase 1 spreadsheet tabs.
  - writes header rows.
  - seeds `cfg_tenant`, `cfg_clinic`, and `cfg_integration_source` if empty.

- `resetPhase1FixtureData()`
  - resets fixture-related staging/fact/metric tabs.
  - loads synthetic Phase 1 fixture.
  - computes Phase 1 metrics.

### KPI

- `computePhase1Metrics(tenantId, clinicId, period)`
  - computes monthly finance summary.
  - computes finance breakdown.
  - writes data quality warnings.

### API / Utility

- `getFinanceSummary(tenantId, clinicId, period)`
- `healthCheck()`
- `smokeTestPhase1()`

## Verification Status

Done:

- `clasp pull` from the provided Apps Script project succeeded.
- existing project was empty except `myFunction()`.
- Phase 1 skeleton was pushed with `clasp push -f`.
- Pull-back verification confirmed all 11 files are present in the remote Apps Script project.
- Deployments were created for Phase 1 versions.

Blocked:

- `clasp run setupPhase1Warehouse` returns:

```text
Script function not found. Please make sure script is deployed as API executable.
```

- Direct Google Sheets API setup attempt returns:

```text
Google Sheets API has not been used in project 1072944905499 before or it is disabled.
```

- `clasp enable-api sheets.googleapis.com` cannot continue because GCP project ID is not configured for this script in `.clasp.json`.

## Next Manual Authorization Step

Open Apps Script project and run once manually:

1. Open Apps Script project ID: `1-2IlwXdJ6jih3KRgO5cOHQon2zDnYGEq06gyXAa37wPGk4KE99Tgoaoy`
2. Select function: `setupPhase1Warehouse`
3. Click Run.
4. Approve spreadsheet authorization.
5. Then run: `smokeTestPhase1`

Expected smoke test result:

```json
{
  "ok": true,
  "result": {
    "tenantId": "klinik_001",
    "clinicId": "clinic_001",
    "period": "2026-06",
    "totalVisits": 5,
    "totalRevenue": 1950000,
    "directCost": 660000,
    "operatingExpense": 1750000,
    "grossProfit": 1290000,
    "netProfit": -460000,
    "dataStatus": "complete"
  }
}
```

## Important Notes

- No SIM Klinik writeback exists.
- No connector writes to source system.
- All implemented KPI functions require `tenantId` and `clinicId`.
- Current code uses synthetic fixture only.

## Finance Dashboard Update

Added mobile-first HTML Service dashboard files:

- `DashboardService.js`
- `Dashboard.html`

Updated:

- `Api.js` now serves the dashboard from `doGet(e)`.
- `doGet?action=health` returns JSON health check.

Dashboard reads from:

- `metric_monthly_summary`
- `metric_finance_breakdown`
- `metric_data_quality`
- `metric_growth_trend`

Dashboard does not read raw SIM Klinik data directly.

### Manual verification

After running `smokeTestPhase1()`, deploy/open the web app and verify:

- Net profit card shows `-Rp460.000` for fixture.
- Revenue shows `Rp1.95 jt` or equivalent compact display.
- Visits show `5`.
- Cost shows `Rp2.41 jt`.
- Margin shows about `-23.6%`.
- Data quality section shows no active warning for complete fixture.


## Language and Naming Convention

Dashboard copy uses Indonesian with familiar English business/tech terms where they are clearer for clinic owners, for example:

- Dashboard
- Revenue
- Gross Profit
- Net Profit
- Margin
- Cost
- Data Quality
- Breakdown
- Period

Spreadsheet headers remain technical `snake_case` identifiers such as `tenant_id`, `clinic_id`, `total_revenue`, and `net_profit` because the Apps Script code depends on stable machine-readable keys.

For user-facing display, labels should be converted in the dashboard/API layer instead of renaming warehouse columns directly.
