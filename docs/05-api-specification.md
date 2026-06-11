# 05. API Specification

## API Design Principles

1. APIs expose business metrics, not raw spreadsheet internals.
2. Every request is tenant-scoped.
3. Dashboard APIs are read-only except user preferences.
4. AI tool APIs use stricter authorization and audit logging.
5. Responses include data quality warnings when relevant.

## Apps Script Entry Points

### Web Dashboard

`doGet(e)` renders HTML Service dashboard.

### API Requests

Apps Script can expose API-like behavior through:

- `doGet(e)` for read endpoints.
- `doPost(e)` for tool/webhook/notification endpoints.
- `google.script.run` for frontend-to-backend calls inside HTML Service.

## Common Request Context

All protected calls must resolve:

```json
{
  "tenant_id": "tenant_001",
  "actor_id": "user_001",
  "role": "owner",
  "clinic_scope": ["clinic_001", "clinic_002"]
}
```

`tenant_id` should come from auth/session/config, not arbitrary user input.

## Common Response Shape

```json
{
  "success": true,
  "data": {},
  "meta": {
    "tenant_id": "tenant_001",
    "period_start": "2026-06-01",
    "period_end": "2026-06-30",
    "generated_at": "2026-06-30T17:00:00+07:00",
    "data_quality_warnings": []
  }
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Actor is not allowed to access this tenant."
  }
}
```

## Dashboard API

### GET /api/dashboard/summary

Purpose: mobile dashboard top summary.

Query:

| Param | Required | Description |
|---|---:|---|
| period_start | yes | Start date |
| period_end | yes | End date |
| clinic_id | no | Clinic branch or ALL |

Response data:

```json
{
  "kpis": {
    "net_profit": 45000000,
    "profit_margin": 0.36,
    "total_revenue": 125000000,
    "total_visits": 2100,
    "bpjs_receivable": 88000000,
    "inventory_risk_value": 17500000
  },
  "changes": {
    "net_profit_pct": -0.274,
    "revenue_pct": 0.08,
    "visit_pct": 0.12
  },
  "top_alerts": [
    {
      "type": "profit_drop",
      "severity": "high",
      "message": "Laba turun 27,4% dibanding periode sebelumnya."
    }
  ]
}
```

### GET /api/dashboard/charts

Purpose: chart payloads for Chart.js.

Query:

| Param | Required | Description |
|---|---:|---|
| period_grain | yes | day/week/month |
| period_count | yes | Number of periods |
| clinic_id | no | Clinic branch or ALL |

Response data:

```json
{
  "revenue_profit_trend": {
    "labels": ["Jan", "Feb", "Mar"],
    "datasets": [
      { "label": "Revenue", "data": [100000000, 110000000, 125000000] },
      { "label": "Net Profit", "data": [35000000, 42000000, 45000000] }
    ]
  },
  "visit_trend": {
    "labels": ["Jan", "Feb", "Mar"],
    "datasets": [
      { "label": "Visits", "data": [1800, 1950, 2100] }
    ]
  }
}
```

### GET /api/metrics/doctor-profitability

Response:

```json
{
  "items": [
    {
      "doctor_id": "doc_001",
      "doctor_name": "dr. A",
      "visit_count": 320,
      "revenue": 52000000,
      "net_profit": 23000000,
      "profit_margin": 0.442,
      "rank": 1
    }
  ]
}
```

### GET /api/metrics/poli-profitability

Same as doctor profitability but grouped by poli.

### GET /api/metrics/bpjs-receivables

Response:

```json
{
  "total_outstanding": 88000000,
  "basis": "approved_amount_minus_paid_amount",
  "aging": [
    { "bucket": "0-30", "amount": 35000000 },
    { "bucket": "31-60", "amount": 28000000 },
    { "bucket": "61-90", "amount": 15000000 },
    { "bucket": ">90", "amount": 10000000 }
  ]
}
```

### GET /api/metrics/inventory-risks

Response:

```json
{
  "total_risk_value": 17500000,
  "items": [
    {
      "medicine_id": "med_001",
      "medicine_name": "Obat A",
      "risk_reason": "expiring_soon",
      "risk_level": "high",
      "risk_value": 3600000
    }
  ]
}
```

## AI Tool API

### POST /api/ai/tool

Purpose: single endpoint for MCP tools.

Request:

```json
{
  "tool_name": "get_profit_summary",
  "arguments": {
    "period_start": "2026-06-01",
    "period_end": "2026-06-30",
    "clinic_id": "ALL"
  }
}
```

Backend resolves:

- tenant_id.
- actor_id.
- role.
- allowed clinic scope.

Response:

```json
{
  "success": true,
  "tool_name": "get_profit_summary",
  "data": {
    "net_profit": 45000000,
    "profit_margin": 0.36
  },
  "meta": {
    "generated_at": "2026-06-30T17:00:00+07:00",
    "data_quality_warnings": []
  }
}
```

## Integration API

### POST /api/integration/import

Purpose: accept uploaded/imported file metadata or trigger parsing.

MVP note: actual file upload in Apps Script may use Drive file ID.

Request:

```json
{
  "source_id": "sim_export_001",
  "file_id": "google_drive_file_id",
  "file_type": "csv",
  "data_type": "billing",
  "period": "2026-06"
}
```

Response:

```json
{
  "sync_id": "sync_001",
  "status": "queued"
}
```

### GET /api/integration/sync-status

Response:

```json
{
  "sync_id": "sync_001",
  "status": "success",
  "rows_imported": 1500,
  "rows_rejected": 3,
  "error_message": null
}
```

## Notification API

### POST /api/notification/send-summary

Purpose: send executive summary to Telegram/WhatsApp.

Request:

```json
{
  "summary_type": "daily",
  "period_date": "2026-06-30",
  "channel": "telegram"
}
```

Response:

```json
{
  "success": true,
  "message_id": "telegram_message_id"
}
```

## Auth & Authorization

Required roles:

| Role | Access |
|---|---|
| owner | all owner metrics, summaries, AI Q&A |
| manager | operational metrics, visits, productivity |
| staff | import status only if needed; no owner financial insight by default |
| system | scheduled sync, scheduled summary |

## Error Codes

| Code | Meaning |
|---|---|
| UNAUTHORIZED | Actor not authenticated |
| FORBIDDEN | Actor lacks role/scope |
| TENANT_REQUIRED | Tenant context missing |
| INVALID_PERIOD | Period input invalid |
| DATA_NOT_READY | Metrics not computed yet |
| DATA_QUALITY_BLOCKER | Data issue prevents reliable answer |
| TOOL_NOT_ALLOWED | AI requested unapproved tool |
| RATE_LIMITED | Too many requests |
| INTERNAL_ERROR | Unexpected backend failure |

## API Versioning

Start with internal version:

```text
/api/v1/...
```

For Apps Script simplicity, version may be passed as parameter or routed internally.

Do not expose sheet names as public API contract. Sheet structure can evolve if API response shape stays stable.
