# 02. Folder Structure

## Target Repository Structure

Repository canonical yang diminta untuk `AI-Clinic-CFO-Copilot`:

```text
AI-Clinic-CFO-Copilot/
│
├── CLAW.md
├── README.md
├── appsscript.json
│
├── docs/
│   ├── 00-VISION.md
│   ├── 01-BLUEPRINT.md
│   ├── 02-BUSINESS-REQUIREMENTS.md
│   ├── 03-SYSTEM-DESIGN.md
│   ├── 04-DATA-ARCHITECTURE.md
│   ├── 05-MCP.md
│   ├── 06-AGENTS.md
│   ├── 07-DATABASE.md
│   ├── 08-DASHBOARD.md
│   ├── 09-AI-INSIGHTS.md
│   ├── 10-ROADMAP.md
│   ├── 11-SECURITY.md
│   ├── 12-MULTITENANCY.md
│   ├── 13-COA.md
│   ├── 14-TAX-ENGINE.md
│   ├── 17-DATA-QUALITY-RULES.md
│   └── 18-ACCOUNTING-TRACEABILITY.md
│
├── src/
│   ├── README.md
│   │
│   ├── Core/
│   │   ├── Config.gs
│   │   ├── Constants.gs
│   │   ├── Logger.gs
│   │   ├── Helpers.gs
│   │   └── Security.gs
│   │
│   ├── Auth/
│   │   ├── AuthService.gs
│   │   └── SessionManager.gs
│   │
│   ├── DataWarehouse/
│   │   ├── SheetRepository.gs
│   │   ├── ImportService.gs
│   │   ├── MappingService.gs
│   │   └── ValidationService.gs
│   │
│   ├── Finance/
│   │   ├── KpiEngine.gs
│   │   ├── AccountingTraceability.gs
│   │   ├── DataQualityService.gs
│   │   └── COAService.gs
│   │
│   ├── Dashboard/
│   │   ├── DashboardService.gs
│   │   └── Dashboard.html
│   │
│   ├── API/
│   │   ├── Api.gs
│   │   └── Kode.gs
│   │
│   ├── MCP/
│   │   ├── FinanceTools.gs
│   │   ├── ExecutiveTools.gs
│   │   ├── BPJSTools.gs
│   │   ├── PharmacyTools.gs
│   │   └── TaxTools.gs
│   │
│   ├── Setup/
│   │   ├── SetupService.gs
│   │   └── FixtureService.gs
│   │
│   └── Tests/
│       └── SmokeTest.gs
│
├── gas/
│   ├── .clasp.json
│   └── src/
│       └── active deployable Apps Script files
│
├── sheets/
└── tests/
```

## Current Implementation Layout

The current working folder is named `AI Clinic Owner Copilot/`, but it now includes the requested canonical structure.

```text
AI Clinic Owner Copilot/
├── CLAW.md
├── README.md
├── appsscript.json
├── docs/
├── src/
│   ├── Core/
│   ├── Auth/
│   ├── DataWarehouse/
│   ├── Finance/
│   ├── Dashboard/
│   ├── API/
│   ├── MCP/
│   ├── Setup/
│   └── Tests/
├── gas/
│   ├── .clasp.json
│   └── src/
├── sheets/
└── tests/
```

## Important Deployment Decision

`src/` is now the canonical modular source layout.

`gas/src/` remains the active deployable Apps Script source because `gas/.clasp.json` is already configured as:

```json
{
  "scriptId": "1-2IlwXdJ6jih3KRgO5cOHQon2zDnYGEq06gyXAa37wPGk4KE99Tgoaoy",
  "rootDir": "./src"
}
```

That means `clasp push` from `gas/` uploads `gas/src`, not root `src`.

This is intentional for now:

- The live Apps Script deployment already works from `gas/src`.
- Root `src/` provides the requested clean architecture/module map.
- Moving the active deployment root immediately would be risky without a full Apps Script migration test.

## Module Mapping

| Requested module | Canonical file/folder | Active implementation source |
|---|---|---|
| Core config | `src/Core/Config.gs` | `gas/src/Config.js` |
| Constants/schema | `src/Core/Constants.gs` | `gas/src/Schema.js` |
| Helpers | `src/Core/Helpers.gs` | `gas/src/Utils.js` |
| Logger | `src/Core/Logger.gs` | Canonical helper |
| Security | `src/Core/Security.gs` | Canonical wrapper over tenant guard |
| Auth | `src/Auth/` | Placeholder for Google Login/RBAC |
| Data warehouse repository | `src/DataWarehouse/SheetRepository.gs` | `gas/src/SpreadsheetService.js` |
| Import/mapping/validation | `src/DataWarehouse/*Service.gs` | Placeholder/future extraction |
| KPI engine | `src/Finance/KpiEngine.gs` | `gas/src/KpiEngine.js` |
| Accounting traceability | `src/Finance/AccountingTraceability.gs` | Currently inside `KpiEngine.js` |
| Data quality | `src/Finance/DataQualityService.gs` | Currently inside `KpiEngine.js` |
| Dashboard service | `src/Dashboard/DashboardService.gs` | `gas/src/DashboardService.js` |
| Dashboard UI | `src/Dashboard/Dashboard.html` | `gas/src/Dashboard.html` |
| API entrypoints | `src/API/Api.gs` | `gas/src/Api.js` |
| MCP tools | `src/MCP/` | Contract docs exist; implementation future |
| Setup/fixture | `src/Setup/` | `gas/src/Setup.js`, `gas/src/Fixture.js` |
| Smoke test | `src/Tests/SmokeTest.gs` | `gas/src/Tests.js` |

## Naming Conventions

### Dashboard / UI

Use Indonesian sentences with familiar English business/tech terms where clearer:

- Dashboard
- Revenue
- Gross Profit
- Net Profit
- Margin
- Cost
- Finance Breakdown
- Data Quality
- Period
- Refresh
- Loading

### Spreadsheet Columns

Use stable English `snake_case` technical keys:

- `tenant_id`
- `clinic_id`
- `period`
- `total_visits`
- `total_revenue`
- `direct_cost`
- `operating_expense`
- `gross_profit`
- `net_profit`
- `profit_margin`
- `data_status`
- `trace_status`
- `computed_at`

Reason: Apps Script uses spreadsheet headers as object keys. User-facing labels should be handled in dashboard/API layer, not by renaming warehouse headers.

## Future Migration Option

After MVP V1 smoke test passes, we can migrate active clasp root to canonical `src/` if needed:

1. Confirm Apps Script/clasp supports the chosen modular folder upload pattern.
2. Update `.clasp.json` rootDir intentionally.
3. Push to a test deployment first.
4. Run `setupPhase1Warehouse()`.
5. Run `smokeTestPhase1()`.
6. Redeploy Web App only after smoke test passes.
