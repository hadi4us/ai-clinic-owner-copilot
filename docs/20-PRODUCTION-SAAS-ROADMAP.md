# Production SaaS Roadmap

Status: active execution plan, started 2026-06-17.

This roadmap moves AI Clinic Owner Copilot from pilot Apps Script dashboard into a serious production SaaS posture while keeping the product principle intact: companion to existing SIM Klinik, no double entry, owner-first BI, and traceable finance.

## Production Definition

Production SaaS means the system can safely serve multiple real clinics with:

- Strong tenant isolation.
- Verified user identity and role-based access.
- Repeatable tenant provisioning.
- Reliable import jobs and KPI recomputation.
- Auditability for finance-impacting actions.
- Backup, rollback, and operational visibility.
- Privacy posture appropriate for clinic business data.

## Priority Order

### P0.1 - Production Auth and User Access

Goal: every user has a verified identity, role, tenant, and clinic scope before any data loads.

Tasks:

- Add an Account/Akses dashboard area.
- Let owner/admin manage `USER_ACCESS` rows from the app.
- Keep Google sign-in as identity boundary.
- Keep browser binding only as pilot fallback when Apps Script does not expose email.
- Audit user access changes.
- Block data loading when auth state is not valid.

Done when:

- Owner/admin can list, add, update, and deactivate users.
- Roles and clinic scope are visible in the UI.
- Unknown users see a clear access gate.
- User changes are written to `AUDIT_LOG`.

### P0.2 - Tenant Registry and Per-Tenant Warehouse

Goal: each tenant has isolated warehouse config instead of relying on one shared spreadsheet.

Initial implementation uses Script Property `TENANT_REGISTRY_JSON` as the master registry so the Apps Script project can resolve tenant warehouse spreadsheets before opening a tenant spreadsheet. The existing pilot `WAREHOUSE_SPREADSHEET_ID` remains a fallback for `APP_CONFIG.defaultTenantId`.

Registry shape:

```json
{
  "tenants": {
    "klinik_001": {
      "tenantId": "klinik_001",
      "tenantName": "Klinik Sehat Sentosa",
      "status": "active",
      "plan": "pilot",
      "ownerEmail": "owner@example.com",
      "warehouseSpreadsheetId": "spreadsheet_id",
      "defaultClinicId": "clinic_001"
    }
  }
}
```

Rules:

- `status` must be `active` or `trial` for normal access.
- Unknown tenants are rejected.
- Every production tenant must have a `warehouseSpreadsheetId`.
- Switching active tenant invalidates execution-scope sheet caches.
- Pilot fallback is allowed only for the default tenant while P0.3 provisioning is not finished.

Tasks:

- Define `TENANT_REGISTRY` contract.
- Add tenant metadata: tenant status, plan, warehouse spreadsheet id, owner email, created_at, updated_at.
- Resolve warehouse spreadsheet by tenant context.
- Keep default pilot tenant compatible while registry is introduced.
- Add readiness checks for tenant registry and warehouse access.

Done when:

- The app can resolve the correct spreadsheet per tenant.
- Tenant A cannot access tenant B data even if query params are changed.
- Production docs explain provisioning and rollback.

### P0.3 - Tenant Provisioning

Goal: onboarding a clinic becomes a repeatable operation, not a manual scramble.

Tasks:

- Add provisioning service to create/prepare tenant warehouse.
- Seed schema and default owner `USER_ACCESS`.
- Seed tenant config and default clinic.
- Run readiness check after provisioning.
- Return a tenant provisioning report.

Done when:

- Admin can provision a tenant with owner email and clinic name.
- The new tenant passes readiness checks.
- Provisioning is idempotent.

### P0.4 - Job-Based Import Pipeline

Goal: imports are reliable, retryable, and observable.

Tasks:

- Introduce import job states: queued, validating, importing, computing, completed, failed.
- Separate upload validation, final sheet write, and KPI compute phases.
- Store job duration, row counts, error summary, and retry count.
- Keep checksum idempotency.
- Show import job status in dashboard/admin console.

Done when:

- A failed import leaves a clear job state and error summary.
- KPI compute can be retried without double-counting.
- Large uploads can be split into safer phases.

### P0.5 - Audit, Backup, and Recovery

Goal: data-impacting actions can be traced and recovered.

Tasks:

- Expand audit coverage for auth, user management, provisioning, import, compute, edit/delete, COA approval.
- Add backup workflow for tenant spreadsheets.
- Document restore and rollback steps.
- Add release version to readiness output.

Done when:

- Production actions have audit rows.
- Backup and restore are documented.
- Previous Apps Script version and tenant backup can be identified quickly.

### P0.6 - Materialized Analytics and Indexes

Goal: dashboard stays fast when raw sheets grow.

Tasks:

- Add materialized breakdown tables per tenant/clinic/period.
- Add transaction index for lookup/edit by id.
- Stop dashboard from reading raw fact sheets where a materialized table exists.
- Add row count guardrails.

Done when:

- Dashboard hot paths read KPI/materialized sheets.
- Raw sheets are primarily used by import and recompute jobs.

## P1 Scale-Up

### P1.1 - Internal Admin Console

- Tenant list.
- Tenant health.
- Last import status.
- Row count.
- Deployment version.
- Last error.

### P1.2 - Subscription State

- Add tenant plan/status: trial, active, suspended, cancelled.
- Gate access based on tenant status.
- Payment gateway can come later; status model comes first.

### P1.3 - Environment Separation

- Separate dev/staging/prod config.
- Versioned releases only.
- Smoke test before production deploy.
- Release notes per deployment.

### P1.4 - Privacy and Compliance Posture

- Document data minimization.
- Keep patient identifiers anonymized.
- Add retention policy.
- Add privacy policy/DPA draft.
- Avoid diagnosis, medical record number, NIK, address, phone number, and clinical notes unless explicitly approved in a future scope.

## Current Execution Slice

First implementation slice:

1. Document this roadmap and task backlog.
2. Implement Account/Akses UI.
3. Implement owner/admin `USER_ACCESS` management.
4. Add static/local checks.
5. Deploy as next Apps Script version.

Second implementation slice:

1. Add tenant registry contract and Script Property resolver.
2. Resolve warehouse spreadsheet by active tenant context.
3. Validate requested tenants before data access.
4. Keep default pilot spreadsheet fallback.
5. Add readiness/static checks for tenant registry.
