# API Specification

## Purpose

Dokumen ini mendesain spesifikasi API untuk **AI Clinic CFO Copilot / AI Clinic Owner Copilot** pada MVP Google Apps Script.

Scope dokumen ini adalah desain sistem, bukan implementasi kode.

API digunakan untuk:

1. Mobile Finance Dashboard.
2. Internal HTML Service calls.
3. Import/sync orchestration.
4. KPI and data quality access.
5. Future MCP/OpenClaw AI tool calls.
6. Future Telegram/WhatsApp notifications.

API tidak boleh digunakan untuk:

- writeback ke SIM Klinik.
- expose raw unrestricted spreadsheet data.
- expose patient-sensitive data.
- bypass tenant isolation.
- menghasilkan angka finance tanpa traceability/data status.

---

## 1. API Design Principles

1. API exposes **business metrics**, not raw spreadsheet internals.
2. Every protected API call must be tenant-scoped.
3. `tenant_id` must be resolved from verified context, not trusted from arbitrary query.
4. Dashboard APIs are read-only except future user preferences.
5. MCP/AI APIs use stricter authorization, token validation, and audit logging.
6. Responses must include period, clinic, generated time, and data quality status.
7. Finance responses must include traceability status.
8. If source data is incomplete, response must say `estimated` or `incomplete`.
9. API labels may use Indonesian + familiar English terms for UI, while technical keys remain English `snake_case`.

---

## 2. Apps Script API Surfaces

Apps Script supports multiple API surfaces.

### 2.1 HTML Service Web App

Entry point:

```text
doGet(e)
```

Purpose:

- Render dashboard HTML.
- Serve health check route.
- Optionally return lightweight JSON for GET routes.

### 2.2 HTML Service Internal Calls

Mechanism:

```text
google.script.run
```

Purpose:

- Dashboard fetches payload from backend functions.
- Most secure and simple for MVP dashboard.

### 2.3 `doGet(e)` JSON Routes

Purpose:

- Health check.
- Read-only API for simple dashboard payload if needed.
- Sync status.

### 2.4 `doPost(e)` Routes

Purpose:

- Import trigger.
- MCP tool endpoint.
- Future webhook/notification endpoint.

---

## 3. Common Tenant Context

Every protected call must resolve this context internally:

```json
{
  "tenant_id": "klinik_001",
  "actor_id": "user_001",
  "actor_email": "owner@example.com",
  "role": "owner",
  "clinic_scope": ["clinic_001"],
  "timezone": "Asia/Jakarta",
  "currency": "IDR"
}
```

### 3.1 Context Rules

- `tenant_id` must not be trusted from query/body alone.
- User-supplied `clinic_id` must be checked against `clinic_scope`.
- Role must be checked before returning finance metrics.
- System jobs use `actor_id = system` and must still specify tenant.

### 3.2 Role Matrix

| Role | Dashboard Finance | Import | MCP Finance Tool | Admin Setup | Notes |
|---|---:|---:|---:|---:|---|
| Owner | yes | optional | yes | no | full owner insight. |
| Manager | configurable | yes | limited | no | finance visibility depends tenant policy. |
| Staff | no by default | yes | no | no | import/status only. |
| System | no UI | scheduled | internal | yes | service jobs. |

---

## 4. Common Response Shape

### 4.1 Success Response

```json
{
  "success": true,
  "data": {},
  "meta": {
    "tenant_id": "klinik_001",
    "clinic_id": "clinic_001",
    "period": "2026-06",
    "generated_at": "2026-06-09T10:00:00+07:00",
    "data_status": "complete",
    "trace_status": "traceable",
    "data_quality_warnings": []
  }
}
```

### 4.2 Error Response

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Actor is not allowed to access this clinic or tenant.",
    "details": {}
  },
  "meta": {
    "generated_at": "2026-06-09T10:00:00+07:00"
  }
}
```

### 4.3 Data Status Values

| Value | Meaning |
|---|---|
| `complete` | Data required for the metric is complete and traceable. |
| `estimated` | Usable as management estimate, but some source/allocation/journal component is estimated. |
| `incomplete` | Required data is missing; metric should not be treated as reliable. |

### 4.4 Trace Status Values

| Value | Meaning |
|---|---|
| `traceable` | Finance number can be traced to valid source/journal rows. |
| `partially_traceable` | Some components have trace, some do not. |
| `not_traceable` | Required source/journal trace is missing. |
| `not_applicable` | Non-financial metric or trace not required. |

---

## 5. Error Codes

| Code | Meaning |
|---|---|
| `UNAUTHORIZED` | Actor/token not authenticated. |
| `FORBIDDEN` | Actor authenticated but not allowed. |
| `TENANT_SCOPE_REQUIRED` | Tenant context could not be resolved. |
| `CLINIC_SCOPE_DENIED` | Clinic is outside actor scope. |
| `INVALID_REQUEST` | Missing/invalid input. |
| `INVALID_PERIOD` | Period/date filter invalid. |
| `SCHEMA_ERROR` | Required sheet/header missing. |
| `DATA_NOT_FOUND` | No metric/source data found for requested filter. |
| `DATA_INCOMPLETE` | Required data incomplete. |
| `TRACEABILITY_FAILED` | Finance number lacks required trace. |
| `TOOL_NOT_ALLOWED` | MCP tool not approved. |
| `IMPORT_FAILED` | Import failed. |
| `RATE_LIMITED` | Optional future protection. |
| `INTERNAL_ERROR` | Unhandled system error. |

---

## 6. Route Overview

Apps Script does not provide native Express-style routing, but `doGet(e)` and `doPost(e)` can route based on an `action` parameter.

Recommended route/action design:

| Surface | Method | Action | Purpose |
|---|---|---|---|
| Web App | GET | none | Render dashboard. |
| Health | GET | `health` | Health check. |
| Dashboard | GET/internal | `dashboard_payload` | Finance dashboard payload. |
| Dashboard | GET/internal | `finance_summary` | Finance summary only. |
| Dashboard | GET/internal | `finance_breakdown` | Finance breakdown only. |
| Dashboard | GET/internal | `growth_trend` | Chart payload. |
| Data Quality | GET/internal | `data_quality` | Active data warnings. |
| Import | POST | `import_trigger` | Trigger import from Drive file. |
| Import | GET | `sync_status` | Read sync status. |
| Admin/System | POST/internal | `compute_metrics` | Recompute KPI metrics. |
| MCP | POST | `mcp_tool` | Approved AI tool call. |
| Test | internal | `smoke_test` | Test-only function, not public production route. |

---

## 7. Health API

### 7.1 `GET?action=health`

Purpose:

- Verify Web App deployment is alive.
- Verify basic configuration.
- Optionally verify spreadsheet access.

Request:

```text
GET /exec?action=health
```

Response:

```json
{
  "success": true,
  "data": {
    "service": "AI Clinic CFO Copilot",
    "environment": "production",
    "version": "phase1",
    "spreadsheet_access": "ok"
  },
  "meta": {
    "generated_at": "2026-06-09T10:00:00+07:00"
  }
}
```

Security:

- Can be public if it exposes no sensitive data.
- Must not return spreadsheet ID, secrets, or tenant data in production.

---

## 8. Dashboard APIs

Dashboard API may be called through `google.script.run` or routed GET. For MVP, `google.script.run` is recommended.

### 8.1 `get_dashboard_payload`

Purpose:

- Return complete mobile dashboard payload.

Input:

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06"
}
```

Context:

- `tenant_id` resolved from session.
- `clinic_id` checked against actor scope.

Response:

```json
{
  "success": true,
  "data": {
    "header": {
      "title": "Dashboard Keuangan",
      "tenant_name": "Klinik Sehat Sentosa",
      "clinic_name": "Klinik Sehat Sentosa",
      "period_label": "Juni 2026"
    },
    "summary": {
      "total_revenue": 1950000,
      "direct_cost": 660000,
      "operating_expense": 1750000,
      "gross_profit": 1290000,
      "net_profit": -460000,
      "profit_margin": -0.2359,
      "total_visits": 5
    },
    "cards": [
      {
        "key": "net_profit",
        "label": "Net Profit",
        "value": -460000,
        "formatted_value": "-Rp460.000",
        "severity": "warning",
        "data_status": "complete"
      }
    ],
    "finance_breakdown": [],
    "growth_trend": [],
    "data_quality": []
  },
  "meta": {
    "tenant_id": "klinik_001",
    "clinic_id": "clinic_001",
    "period": "2026-06",
    "data_status": "complete",
    "trace_status": "traceable",
    "generated_at": "2026-06-09T10:00:00+07:00"
  }
}
```

Reads from:

- `metric_monthly_summary`
- `metric_finance_breakdown`
- `metric_growth_trend`
- `metric_data_quality`

Must not read:

- `raw_*`.

### 8.2 `get_finance_summary`

Purpose:

- Return summary KPI only.

Input:

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06"
}
```

Response data:

```json
{
  "total_visits": 5,
  "total_revenue": 1950000,
  "direct_cost": 660000,
  "operating_expense": 1750000,
  "gross_profit": 1290000,
  "net_profit": -460000,
  "profit_margin": -0.2359,
  "data_status": "complete",
  "trace_status": "traceable",
  "basis": "management_pnl_accrual_like"
}
```

### 8.3 `get_finance_breakdown`

Purpose:

- Return category breakdown for Revenue, Direct Cost, and Operating Expense.

Input:

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06"
}
```

Response data:

```json
{
  "items": [
    {
      "metric_type": "revenue_category",
      "category": "consultation",
      "label": "Consultation",
      "amount": 750000,
      "pct_of_total": 0.3846
    },
    {
      "metric_type": "expense_category",
      "category": "salary",
      "label": "Salary",
      "amount": 1000000,
      "pct_of_total": 0.5714
    }
  ]
}
```

### 8.4 `get_growth_trend`

Purpose:

- Return chart-friendly trend payload.

Input:

```json
{
  "clinic_id": "clinic_001",
  "period_count": 6,
  "period_grain": "month"
}
```

Response data:

```json
{
  "labels": ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"],
  "datasets": [
    {
      "label": "Revenue",
      "key": "total_revenue",
      "data": [1000000, 1200000, 1400000, 1500000, 1700000, 1950000]
    },
    {
      "label": "Net Profit",
      "key": "net_profit",
      "data": [100000, 200000, 250000, 100000, -200000, -460000]
    }
  ]
}
```

### 8.5 `get_data_quality`

Purpose:

- Return active data quality warnings for dashboard and AI caveat.

Input:

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06"
}
```

Response data:

```json
{
  "status": "open",
  "warnings": [
    {
      "rule_id": "missing_direct_cost",
      "severity": "high",
      "affected_sheet": "fact_cost",
      "affected_count": 25,
      "message": "25 revenue rows do not have direct cost. Net Profit is estimated."
    }
  ]
}
```

---

## 9. Import APIs

Import APIs are for approved staff/manager/system users only.

### 9.1 `POST?action=import_trigger`

Purpose:

- Trigger import from approved Google Drive file.
- Does not mutate SIM Klinik.

Request:

```json
{
  "source_id": "sim_export_main",
  "file_id": "google_drive_file_id",
  "file_type": "csv",
  "data_type": "revenue",
  "period": "2026-06",
  "clinic_id": "clinic_001"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "sync_id": "sync_20260609_001",
    "status": "queued_or_started",
    "message": "Import started. Metrics will refresh after validation."
  },
  "meta": {
    "tenant_id": "klinik_001",
    "clinic_id": "clinic_001",
    "period": "2026-06",
    "generated_at": "2026-06-09T10:00:00+07:00"
  }
}
```

Validation:

- user role must allow import.
- `source_id` must exist in `cfg_integration_source`.
- `file_id` must be accessible.
- `data_type` must be allowed.
- `clinic_id` must be in actor scope.

### 9.2 `GET?action=sync_status&sync_id=...`

Purpose:

- Read import/sync status.

Response:

```json
{
  "success": true,
  "data": {
    "sync_id": "sync_20260609_001",
    "source_id": "sim_export_main",
    "source_type": "revenue",
    "status": "success",
    "rows_imported": 1500,
    "rows_rejected": 3,
    "rows_duplicated": 0,
    "started_at": "2026-06-09T10:00:00+07:00",
    "finished_at": "2026-06-09T10:01:30+07:00",
    "error_message": null
  },
  "meta": {
    "tenant_id": "klinik_001",
    "generated_at": "2026-06-09T10:02:00+07:00"
  }
}
```

---

## 10. Metric Compute APIs

These are internal/system APIs, not public owner endpoints.

### 10.1 `POST?action=compute_metrics`

Purpose:

- Recompute metrics for a tenant/clinic/period.

Request:

```json
{
  "clinic_id": "clinic_001",
  "period": "2026-06",
  "scope": "finance_phase1"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "metric_run_id": "metric_run_20260609_001",
    "period": "2026-06",
    "status": "success",
    "summary_written": true,
    "breakdown_written": true,
    "growth_trend_written": true,
    "data_quality_warnings": 0,
    "data_status": "complete",
    "trace_status": "traceable"
  }
}
```

Rules:

- Must be role/system restricted.
- Must run after validation/fact build.
- Must apply accounting traceability status.

---

## 11. MCP / AI Tool API

MCP API is for OpenClaw/AI layer and must be stricter than dashboard API.

### 11.1 `POST?action=mcp_tool`

Purpose:

- Single endpoint for approved AI tools.

Authentication:

- MCP token or signed request.
- Actor/tenant context must be resolved.
- Tool must be allowlisted.

Request:

```json
{
  "tool_name": "get_profit_summary",
  "arguments": {
    "clinic_id": "clinic_001",
    "period": "2026-06"
  }
}
```

Response:

```json
{
  "success": true,
  "tool_name": "get_profit_summary",
  "data": {
    "answer_basis": "metric_monthly_summary",
    "period": "2026-06",
    "clinic_id": "clinic_001",
    "total_revenue": 1950000,
    "direct_cost": 660000,
    "operating_expense": 1750000,
    "gross_profit": 1290000,
    "net_profit": -460000,
    "profit_margin": -0.2359,
    "data_status": "complete",
    "trace_status": "traceable",
    "caveats": []
  },
  "meta": {
    "tenant_id": "klinik_001",
    "generated_at": "2026-06-09T10:00:00+07:00",
    "audited": true
  }
}
```

### 11.2 Approved MVP MCP Tools

| Tool | Purpose | Reads From | Phase |
|---|---|---|---|
| `get_profit_summary` | Revenue, cost, Gross Profit, Net Profit, Margin | `metric_monthly_summary` | Phase 4 prep / after Phase 1 stable |
| `get_growth_trend` | Revenue/profit/visit trend | `metric_growth_trend` | Phase 4 prep |
| `explain_profit_change` | Top drivers of profit change | `metric_profit_change_driver` | Phase 4 prep |
| `get_data_quality_status` | Caveats and completeness | `metric_data_quality` | Phase 4 prep |

Not allowed:

- `read_raw_sheet`
- `read_patient_data`
- `write_sim_klinik`
- `modify_transaction`

### 11.3 AI Response Requirements

The API must provide enough metadata so AI can answer with:

- answer.
- period.
- clinic scope.
- basis.
- data status.
- caveat if incomplete.
- recommended next action.

---

## 12. Future Notification APIs

Notification is not MVP Phase 1 unless explicitly approved.

### 12.1 `POST?action=send_summary`

Purpose:

- Send daily/weekly executive summary to verified Telegram/WhatsApp recipient.

Request:

```json
{
  "summary_type": "daily",
  "clinic_id": "clinic_001",
  "period_date": "2026-06-09",
  "channel": "telegram",
  "recipient_id": "verified_recipient_id"
}
```

Rules:

- recipient must be verified in tenant config.
- no sensitive patient data.
- finance caveats must be included.
- send event must be audited.

---

## 13. Admin and Setup APIs

Admin/setup functions should be internal only.

### 13.1 `setup_warehouse`

Purpose:

- Create/update spreadsheet tabs and headers.

Rules:

- Must preserve existing data by default.
- Destructive reset must be explicit and limited to dev/test.

### 13.2 `validate_schema`

Purpose:

- Validate required sheets and headers.

Response data:

```json
{
  "ok": true,
  "missing_sheets": [],
  "missing_columns": [],
  "duplicate_headers": []
}
```

### 13.3 `smoke_test`

Purpose:

- Verify fixture and KPI engine.

Rules:

- Dev/staging only.
- Not public production route.

---

## 14. API Security Requirements

### 14.1 Authentication by Surface

| Surface | Auth Requirement |
|---|---|
| Dashboard Web App | Google Login. |
| `google.script.run` | Google session + backend role check. |
| GET JSON route | Google session or public only for health. |
| Import POST | Google session + role check. |
| MCP POST | API token/signature + tenant context. |
| Notification POST | system/admin only. |

### 14.2 Audit Requirements

Audit these events:

- finance dashboard viewed.
- finance summary accessed.
- import started.
- metric computation run.
- MCP tool call.
- failed auth.
- cross-tenant denied.
- notification sent future.

Audit fields:

```json
{
  "tenant_id": "klinik_001",
  "audit_id": "audit_001",
  "actor_id": "user_001",
  "role": "owner",
  "action": "view_finance_dashboard",
  "resource": "metric_monthly_summary",
  "created_at": "2026-06-09T10:00:00+07:00",
  "metadata": {}
}
```

---

## 15. API Data Quality Requirements

Every finance response should include:

```json
{
  "data_status": "complete",
  "trace_status": "traceable",
  "data_quality_warnings": []
}
```

If direct cost is missing:

```json
{
  "data_status": "estimated",
  "trace_status": "partially_traceable",
  "data_quality_warnings": [
    {
      "rule_id": "missing_direct_cost",
      "severity": "high",
      "message": "Direct Cost belum lengkap. Net Profit ditampilkan sebagai estimasi."
    }
  ]
}
```

If operating expense is missing:

```json
{
  "data_status": "incomplete",
  "trace_status": "partially_traceable",
  "data_quality_warnings": [
    {
      "rule_id": "missing_operating_expense",
      "severity": "critical",
      "message": "Operating Expense belum tersedia. Net Profit belum dapat dianggap lengkap."
    }
  ]
}
```

If journal/source trace is missing:

```json
{
  "data_status": "estimated",
  "trace_status": "not_traceable",
  "data_quality_warnings": [
    {
      "rule_id": "missing_finance_trace",
      "severity": "critical",
      "message": "Sebagian angka finance belum dapat ditelusuri ke jurnal/source row."
    }
  ]
}
```

---

## 16. Field Naming Convention

### 16.1 API Technical Keys

Use English `snake_case`:

- `tenant_id`
- `clinic_id`
- `period`
- `total_revenue`
- `gross_profit`
- `net_profit`
- `profit_margin`
- `data_status`
- `trace_status`

### 16.2 UI Labels

Use Indonesian with familiar English business terms:

- Dashboard Keuangan
- Revenue
- Gross Profit
- Net Profit
- Margin
- Cost
- Finance Breakdown
- Data Quality Status
- Period
- Refresh
- Loading

---

## 17. Performance Requirements

| API | Target |
|---|---:|
| Health check | <1 second |
| Dashboard payload | <3 seconds MVP dataset |
| Finance summary | <2 seconds |
| Data quality warnings | <2 seconds |
| MCP profit answer data | <10 seconds including AI layer |
| Import trigger response | <5 seconds to acknowledge |
| Metric computation | within Apps Script execution limits |

Design approach:

- Precompute metrics.
- Avoid raw scans during dashboard calls.
- Batch spreadsheet reads.
- Cache small payloads if safe.
- Use one spreadsheet per tenant for MVP.

---

## 18. API Versioning

Recommended versioning:

```text
v1
```

For Apps Script action route:

```text
action=v1.dashboard_payload
action=v1.mcp_tool
action=v1.import_trigger
```

For internal function naming:

```text
getDashboardPayloadV1
getFinanceSummaryV1
handleMcpToolV1
```

Versioning helps future migration to Cloud Run/API Gateway without breaking dashboard or MCP contracts.

---

## 19. Design Verdict

API design should remain narrow and metric-first for MVP.

Recommended build order:

1. Health check.
2. Dashboard payload.
3. Finance summary.
4. Finance breakdown.
5. Growth trend.
6. Data quality warnings.
7. Import trigger/status.
8. Internal metric compute.
9. MCP tool endpoint after finance foundation is reliable.
10. Notification API later.

The most important API guardrail:

> No finance API response may present numbers as final unless `data_status = complete` and `trace_status = traceable`.
