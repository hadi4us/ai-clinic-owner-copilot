# 07. Security Design

## Security Goals

1. Protect tenant data from cross-tenant leakage.
2. Protect financial and patient-related data.
3. Prevent AI from accessing unauthorized raw data.
4. Ensure all external notifications are authorized and auditable.
5. Keep MVP simple without ignoring SaaS security fundamentals.
6. Use Google Login and role-based access as the default dashboard authentication model.
7. Ensure SIM Klinik connectors are read-only.

## Threat Model

| Threat | Risk | Mitigation |
|---|---|---|
| Tenant A sees Tenant B data | Critical | TenantGuard on every API/tool call; `tenant_id` on all rows |
| Connector mutates SIM Klinik data | Critical | Read-only connector contract; no writeback credentials; connector tests |
| AI leaks sensitive data | High | MCP tools expose aggregated metrics only by default |
| Unauthorized dashboard access | High | AuthService + role checks + session validation |
| Webhook spoofing | High | Signed webhook tokens and allowlisted endpoints |
| Spreadsheet sharing misconfiguration | High | restricted Drive permissions; service account/owner controls |
| Staff sees owner financials | Medium/High | role-based access control |
| Bad import corrupts metrics | Medium | raw/staging separation, validation, sync logs |
| Prompt injection via imported text | Medium | AI only reads structured metrics; sanitize free-text fields |
| Notification sent to wrong recipient | High | tenant notification config + audit + test mode |

## Tenant Isolation

Every sheet row must have `tenant_id` except global static tables like `dim_date`.

All repository methods must require tenant context:

```text
getMetrics(tenantContext, filters)
```

Never implement generic unrestricted reads like:

```text
getAllRows(sheetName)
```

unless only used internally with explicit guard.

## Role-Based Access Control

| Role | Allowed |
|---|---|
| owner | full business metrics, AI Q&A, financial dashboard, notification config |
| manager | operational dashboard, visit/productivity metrics; financial access configurable |
| staff | import workflow/status only; no strategic financial insight by default |
| system | scheduled sync, metric calculation, scheduled summary |
| support_admin | tenant support with explicit audit; no default data browsing |

## Data Sensitivity Classification

### Public-ish/Product Data

- product configuration.
- UI labels.
- documentation.

### Tenant Business Confidential

- revenue.
- cost.
- profit.
- doctor profitability.
- BPJS receivables.
- inventory risk values.

### Patient-Sensitive

- patient name.
- medical record number.
- diagnosis.
- treatment details.

### Design Rule

AI Clinic Owner Copilot should avoid storing patient-sensitive details unless required for BI. Prefer hashed/pseudonymous `patient_ref` for visit trend analysis.

## Spreadsheet Security

MVP warehouse uses Google Spreadsheet, so security depends heavily on Drive permissions.

Rules:

1. Spreadsheet should not be public.
2. Do not share warehouse sheet directly with clinic staff unless necessary.
3. Use separate spreadsheets per tenant if early isolation is safer.
4. If using one master spreadsheet, enforce `tenant_id` guard strictly and restrict direct access.
5. Keep backups/export logs controlled.

Recommended MVP isolation:

```text
One spreadsheet per tenant
+ tenant_id still present on every row
```

This reduces blast radius while preserving SaaS-oriented data model.

## API Security

### Authentication

Default authentication model:

- Google Login for dashboard.
- signed token for API/MCP calls.
- Telegram/WhatsApp mapped user IDs for chat commands.

### Authorization

All APIs must pass through:

```text
AuthService -> TenantGuard -> RoleGuard -> Handler
```

### API Tokens

For MCP and webhooks:

- use long random tokens.
- store tokens in Apps Script PropertiesService, not code.
- rotate tokens periodically.
- never log full token.

## MCP Security

MCP tools must be least-privilege.

Allowed by default:

- read aggregated metrics.
- read data quality warnings.
- generate summaries from metrics.

Restricted:

- raw data drilldown.
- notification sending.
- tenant configuration.

Forbidden:

- modifying SIM Klinik.
- editing raw source rows.
- exposing patient PII to AI responses.

## Notification Security

Telegram/WhatsApp delivery requires:

- tenant-owned recipient config.
- verified recipient/channel.
- audit log per send.
- test message before activation.
- no patient-sensitive details in notification.

Daily summary should contain aggregated business metrics only.

## Audit Logging

Audit these events:

- user login/access.
- dashboard financial metric access.
- AI tool call.
- notification send.
- import/sync run.
- mapping change.
- tenant config change.
- failed auth attempt.

Audit fields:

```text
tenant_id, audit_id, actor_id, role, action, resource, timestamp, metadata
```

## Data Retention

Initial policy proposal:

- raw imports: keep 12-24 months or tenant-configurable.
- metrics: keep indefinitely while subscription active.
- audit logs: keep 12 months minimum.
- deleted tenant: soft-delete first, purge after contractual retention window.

## Privacy & PII Minimization

- Avoid patient names in analytics.
- Use visit counts and aggregated revenue instead of patient-level drilldown.
- Hash patient identifiers if repeat-visit analysis is needed.
- Do not include patient PII in AI prompt context.
- Do not send patient PII to Telegram/WhatsApp.

## Data Quality as Security

Bad data can cause bad business decisions. Treat critical data quality issues as safety risks.

Examples:

- missing cost data means net profit may be overstated.
- unmapped doctor revenue means doctor profitability ranking is unreliable.
- missing BPJS paid status means receivable may be wrong.

AI and dashboard must clearly label uncertainty.

## MVP Security Checklist

- [ ] All sheets include `tenant_id` where applicable.
- [ ] One spreadsheet per tenant or strict tenant guard implemented.
- [ ] No public spreadsheet sharing.
- [ ] Apps Script properties used for tokens/secrets.
- [ ] MCP endpoint requires signed token.
- [ ] Notification recipients verified.
- [ ] Audit log sheet exists.
- [ ] RoleGuard implemented before financial APIs.
- [ ] AI tools return aggregated metrics only.
- [ ] Data quality warnings shown in dashboard and AI responses.
