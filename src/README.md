# src

Canonical modular source layout for `AI-Clinic-CFO-Copilot`.

Important: the active Google Apps Script deployment still uses `gas/src` because `gas/.clasp.json` has `rootDir: ./src`. This `src/` tree is the target/canonical structure requested for the repository and mirrors the current implementation by module.

## Module Map

| Canonical module | Current purpose | Active source mirror |
|---|---|---|
| `Core/Config.gs` | App config | `gas/src/Config.js` |
| `Core/Constants.gs` | Sheet schemas/constants | `gas/src/Schema.js` |
| `Core/Helpers.gs` | Shared helpers | `gas/src/Utils.js` |
| `Core/Logger.gs` | Logging helpers | new canonical helper |
| `Core/Security.gs` | Tenant/role guard helpers | canonical wrapper over tenant assertions |
| `Auth/AuthService.gs` | Google Login/RBAC placeholder | future implementation |
| `Auth/SessionManager.gs` | Tenant session placeholder | future implementation |
| `DataWarehouse/SheetRepository.gs` | Spreadsheet repository helpers | `gas/src/SpreadsheetService.js` |
| `DataWarehouse/ImportService.gs` | Read-only import placeholder | future implementation |
| `DataWarehouse/MappingService.gs` | Raw-to-staging mapping placeholder | future implementation |
| `DataWarehouse/ValidationService.gs` | Data validation placeholder | future implementation |
| `Finance/KpiEngine.gs` | KPI engine + MVP traceability | `gas/src/KpiEngine.js` |
| `Finance/AccountingTraceability.gs` | Future extraction target | currently inside `KpiEngine.gs` |
| `Finance/DataQualityService.gs` | Future extraction target | currently inside `KpiEngine.gs` |
| `Finance/COAService.gs` | COA service placeholder | fixture currently seeds `cfg_coa` |
| `Dashboard/DashboardService.gs` | Dashboard payload service | `gas/src/DashboardService.js` |
| `Dashboard/Dashboard.html` | Mobile-first dashboard UI | `gas/src/Dashboard.html` |
| `API/Api.gs` | Web/API entrypoints | `gas/src/Api.js` |
| `API/Kode.gs` | Legacy Apps Script entry file | `gas/src/Kode.js` |
| `MCP/*.gs` | MCP tool implementation placeholders | contracts in docs/MCP_*.md |
| `Setup/*.gs` | Setup and fixture services | `gas/src/Setup.js`, `gas/src/Fixture.js` |
| `Tests/SmokeTest.gs` | Smoke tests | `gas/src/Tests.js` |

## Deployment Rule

Do not point clasp at this root `src/` until the modular files are tested as a complete Apps Script bundle. For now:

- canonical structure lives here.
- production/deployable GAS source remains in `gas/src`.
- changes should be mirrored intentionally between both locations until migration is complete.
