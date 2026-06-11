# MULTI_TENANT_DESIGN

Status: **Final Technical Architecture Review**  
Scope: Multi-tenant design for **AI Clinic Owner Copilot** on Google Apps Script and Google Spreadsheet.  
Constraint: No code.

---

## 1. Executive Verdict

Multi-tenancy is the biggest architectural risk in this project.

Google Spreadsheet can support multi-tenant MVP only if isolation is handled structurally, not only by filtering rows. The recommended MVP model is:

```text
One production Apps Script deployment per environment
+ one spreadsheet warehouse per tenant
+ tenant_id and clinic_id still present in every business row
+ strict TenantContext on every API/dashboard/import operation
```

Do **not** put all production tenants into one spreadsheet for MVP. A shared spreadsheet can be used only for synthetic development fixtures.

---

## 2. Definitions

| Term | Meaning |
|---|---|
| Tenant | Customer organization / clinic owner group |
| Clinic | Branch/unit under a tenant |
| User | Person or bot accessing dashboard/API/AI |
| Role | Authorization profile, e.g. owner/manager/finance/staff/support |
| TenantContext | Trusted runtime context containing tenant, clinic, role, and feature scope |

---

## 3. Tenant ID Strategy

### Recommended Format

Use non-sequential, non-PII IDs:

- `tenant_` + short random ID
- `clinic_` + short random ID or stable branch slug under tenant
- `user_` + short random ID

Avoid:

- clinic names inside IDs
- numeric sequence like `tenant_001` in production
- email/phone as primary key

### Rules

| Rule | Requirement |
|---|---|
| Immutable | `tenant_id` never changes |
| Non-reusable | Deleted/archived tenant ID is never reused |
| System-generated | User cannot submit arbitrary `tenant_id` |
| Present in all tenant-owned rows | Required for portability and audit |

---

## 4. Isolation Strategy

### 4.1 MVP Recommended Model: Spreadsheet Per Tenant

| Layer | Isolation |
|---|---|
| Spreadsheet | One spreadsheet warehouse per tenant |
| Apps Script | Environment-level project can serve multiple tenants if TenantRegistry is safe |
| Data rows | Every row still has `tenant_id` and `clinic_id` |
| Dashboard | TenantContext resolves spreadsheet + filters clinic |
| Import | Source folders/files are tenant-scoped |

Benefits:

- Stronger practical isolation.
- Lower spreadsheet row count per tenant.
- Easier backup/restore per tenant.
- Easier offboarding and migration.
- Lower blast radius if a formula/import breaks.

Tradeoff:

- More provisioning and configuration work.
- Cross-tenant analytics requires separate admin process.

### 4.2 Avoid for MVP: Single Shared Spreadsheet

A single shared spreadsheet for all tenants is risky because:

- Google Sheets has no row-level security.
- One leaked spreadsheet link exposes all tenants.
- Query mistakes can leak cross-tenant data.
- Apps Script scans get slower as tenants grow.

Allowed only for:

- Local development fixture.
- Synthetic demo.
- Admin analytics with anonymized data.

---

## 5. Tenant Registry

Use a central registry per environment. It may be a protected spreadsheet or Apps Script Properties + admin sheet.

### `TENANT_REGISTRY`

| Column | Type | Required | Notes |
|---|---|---:|---|
| `tenant_id` | string | Yes | Primary key |
| `tenant_name` | string | Yes | Display only |
| `tenant_type` | enum | No | `single_clinic`, `multi_clinic`, `corporate`, `pilot` |
| `warehouse_spreadsheet_id_alias` | string | Yes | Alias/reference; avoid public exposure |
| `owner_user_id` | string | Yes | Primary owner |
| `timezone` | string | Yes | Default `Asia/Jakarta` |
| `currency` | string | Yes | Default `IDR` |
| `billing_status` | enum | No | `trial`, `active`, `past_due`, `suspended`, `cancelled` |
| `status` | enum | Yes | `active`, `suspended`, `archived` |
| `created_at` | datetime | Yes | - |
| `updated_at` | datetime | No | - |

Security note: avoid exposing actual spreadsheet IDs to client-side HTML unless needed. Prefer server-side resolution.

---

## 6. User Access Model

### 6.1 Authentication Surfaces

| Surface | Identity Source | Risk | Required Guardrail |
|---|---|---|---|
| Google Web App | Google account/session | Wrong deployment access mode | Check user identity server-side |
| Telegram/WhatsApp | Provider user ID/phone | Spoofing or wrong chat mapping | Map provider ID to internal user_id |
| MCP/API | Signed token or internal secret | Token leakage | Scoped token + expiry + audit |
| Support/Admin | Internal account | Overbroad access | Time-boxed support access |

### 6.2 User Registry

| Column | Type | Required | Notes |
|---|---|---:|---|
| `user_id` | string | Yes | Primary key |
| `primary_email` | string | Conditional | For Google login |
| `google_subject_id` | string | Conditional | Prefer over email if available |
| `telegram_user_id` | string | Conditional | For Telegram mapping |
| `whatsapp_number_hash` | string | Conditional | Hash unless plaintext required |
| `display_name` | string | Yes | - |
| `user_status` | enum | Yes | `active`, `invited`, `disabled`, `removed` |
| `created_at` | datetime | Yes | - |
| `updated_at` | datetime | No | - |

### 6.3 User Tenant Access

| Column | Type | Required | Notes |
|---|---|---:|---|
| `access_id` | string | Yes | Primary key |
| `user_id` | string | Yes | FK |
| `tenant_id` | string | Yes | FK |
| `clinic_id` | string | Yes | Specific clinic or `ALL` |
| `role` | enum | Yes | `owner`, `manager`, `finance`, `staff`, `support_admin`, `system` |
| `feature_scope` | string/json | No | e.g. finance, bpjs, pharmacy |
| `access_status` | enum | Yes | `active`, `invited`, `revoked`, `expired` |
| `granted_by_user_id` | string | No | Audit |
| `granted_at` | datetime | Yes | Audit |
| `revoked_at` | datetime | No | Audit |
| `expires_at` | datetime | No | Required for support/admin temporary access |

---

## 7. Role Matrix

| Role | Dashboard | Finance | BPJS | Pharmacy | Import | Admin Config | Support |
|---|---|---|---|---|---|---|---|
| `owner` | Yes | Yes | Yes | Yes | Optional | Yes | No |
| `manager` | Yes | Limited/Yes | Yes | Yes | Optional | No | No |
| `finance` | Finance only | Yes | Yes | No by default | Yes | No | No |
| `staff` | Limited | No by default | No by default | Limited | Upload only if allowed | No | No |
| `support_admin` | Time-boxed | As granted | As granted | As granted | As granted | Limited | Yes |
| `system` | No UI | Service operations | Service operations | Service operations | Service operations | No | No |

Rule: role is never trusted from client parameters. It must be resolved from server-side registry.

---

## 8. TenantContext Contract

Every service call must resolve a trusted TenantContext before touching spreadsheet data.

Required fields:

| Field | Required | Notes |
|---|---:|---|
| `tenant_id` | Yes | From access registry/config, not request body |
| `clinic_id` | Yes | Specific clinic or `ALL` if role allows |
| `user_id` | Yes | Internal user ID |
| `role` | Yes | Resolved role |
| `feature_scope` | Yes | Allowed modules |
| `warehouse_spreadsheet_id` | Yes | Server-side resolved |
| `request_id` | Yes | Audit correlation |

Invalid states:

- Missing tenant context.
- Client-supplied `tenant_id` not matching authorized access.
- `clinic_id=ALL` for role that only has one branch.
- Access status not active.
- Tenant billing/status suspended where access should be blocked.

---

## 9. Clinic Access Model

One tenant can own many clinics.

Rules:

1. `clinic_id` must exist in `CFG_CLINIC` for the tenant.
2. `clinic_id=ALL` is only a dashboard/KPI aggregation scope.
3. Raw and DW rows must use actual clinic IDs, never `ALL`.
4. Aggregated KPI rows may use `ALL` only if computed from authorized clinic rows.
5. Users with branch-level access cannot see tenant-wide KPI.

---

## 10. Import Multi-Tenant Guardrails

| Risk | Required Guardrail |
|---|---|
| User uploads file to wrong clinic | Clinic selection only from authorized access list |
| Drive folder points to wrong tenant | Folder registry must include tenant_id and clinic_id |
| API connector returns mixed tenant data | Reject unless source config is single-tenant scoped or row scope validated |
| Duplicate import across tenant | Idempotency includes tenant_id and clinic_id |
| Failed import writes partial DW | Batch status controls visibility; KPI only from completed batches |

---

## 11. Spreadsheet Sharing Policy

For tenant spreadsheets:

- Do not share broadly with tenant staff.
- Prefer Apps Script service/admin ownership.
- Owner-facing access should go through Web App/dashboard, not direct sheet editing.
- If direct spreadsheet access is needed during pilot, use a separate copy or protected ranges.
- Production warehouse should not be editable by end users.

This is important because Google Sheets does not enforce row-level security.

---

## 12. Audit Requirements

Log all sensitive actions to `LOG_AUDIT`:

| Action | Must Log |
|---|---|
| Dashboard access | user, tenant, clinic, route, timestamp |
| Import start/finish/fail | user/system, source, sync_id, counts |
| Config change | before/after summary, actor |
| Access grant/revoke | actor, target user, tenant, role |
| Support access | justification, expiry, accessed tenant |
| Cross-tenant denied attempt | actor, requested tenant, authorized tenant |

Never log patient-sensitive raw payloads.

---

## 13. Scalability Path

### Phase 1: Pilot

- Spreadsheet per tenant.
- Manual/semi-manual provisioning.
- KPI precomputed monthly/daily.
- Limited tenant count.

### Phase 2: Operational SaaS

- Automated tenant provisioning.
- Drive folder per tenant/source.
- Trigger queue per tenant.
- Admin tenant registry dashboard.

### Phase 3: Database Migration

Migration trigger should be considered when:

- A tenant exceeds spreadsheet performance threshold.
- Cross-tenant analytics becomes required.
- Import volume causes trigger timeouts.
- Access model needs stronger row-level security.
- Regulatory/privacy demands exceed spreadsheet controls.

The row schema keeps `tenant_id` and `clinic_id` so migration remains straightforward.

---

## 14. Technical Risks and Mitigations

| Risk ID | Area | Failure Mode | Impact | Mitigation |
|---|---|---|---|---|
| R-MT-001 | Multi Tenant | Relying only on `tenant_id` filter in shared sheet | Cross-tenant data leak | Spreadsheet per tenant for MVP |
| R-MT-002 | Security | Client submits arbitrary tenant_id | Unauthorized access | Server-side TenantContext only |
| R-MT-003 | Security | Direct sheet sharing bypasses app auth | Data leakage/edit corruption | Restrict sharing; dashboard-only access |
| R-MT-004 | Maintainability | Tenant config split across files/properties/sheets | Wrong spreadsheet selected | Canonical TenantRegistry and deployment checklist |
| R-MT-005 | Scalability | Too many tenants on one Apps Script trigger schedule | Quota/timeouts | Queue/chunk jobs and isolate heavy tenants |
| R-MT-006 | Import | Drive folder misconfigured | Wrong tenant data import | Folder registry validation and source hash audit |
| R-MT-007 | Authorization | Role checks scattered in services | Inconsistent permissions | Central Auth/TenantContext layer |
| R-MT-008 | Support | Support admin over-permissioned | Privacy breach | Time-boxed access with audit and expiry |
| R-MT-009 | Clinic Scope | `ALL` used on raw rows | Bad aggregation and leakage | Allow `ALL` only on KPI output rows |
| R-MT-010 | Future SaaS | Spreadsheet model cannot support 1000+ tenants | Replatform delay | Define migration thresholds early |

---

## 15. Final Recommendation

For coding order:

1. Build `TenantContext` and config constants before any service reads/writes sheets.
2. Make `SheetRepository` require TenantContext for all tenant-owned operations.
3. Reject dashboard/API/import requests with missing or unauthorized tenant/clinic scope.
4. Keep production tenant data in separate spreadsheets during MVP.
5. Log all denied cross-tenant attempts.

Multi-tenant is not a feature to add later; it must be present from Sprint 1 foundation.
