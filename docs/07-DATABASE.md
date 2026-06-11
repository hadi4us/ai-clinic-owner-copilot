# 07. Database / Spreadsheet Warehouse

## Storage

Phase 1 uses Google Spreadsheet as the warehouse.

## Technical Naming Convention

Spreadsheet tabs and columns use stable English `snake_case` keys because Apps Script reads them as machine-readable identifiers.

Examples:

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
- `computed_at`

User-facing labels are translated in dashboard/API layer, not by renaming warehouse columns.

## Schema

See [`../sheets/schema.md`](../sheets/schema.md).
