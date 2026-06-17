# Production SaaS Task Backlog

Status legend:

- `[ ]` pending
- `[~]` in progress
- `[x]` done

## P0 - Production Foundation

### P0.1 Auth, Account, and User Access

- `[x]` Add Account/Akses menu to dashboard.
- `[x]` Show current auth state, tenant, clinic, role, and permissions.
- `[x]` Add owner/admin user access table.
- `[x]` Add create/update/deactivate `USER_ACCESS` actions.
- `[x]` Audit user access changes.
- `[x]` Add owner/admin guardrail tests for user management.
- `[ ]` Improve unauthenticated access gate copy for production.
- `[ ]` Add support doc for owner/admin user onboarding.

### P0.2 Tenant Registry

- `[x]` Define tenant registry schema.
- `[x]` Add registry-backed spreadsheet resolution.
- `[x]` Keep pilot default tenant fallback.
- `[x]` Add readiness check for registry entry.
- `[x]` Add static guard for cross-tenant spreadsheet resolution.
- `[x]` Add admin UI for tenant registry visibility.
- `[x]` Add provisioning workflow to create registry entries.

### P0.3 Tenant Provisioning

- `[x]` Add provisioning service.
- `[x]` Seed schema.
- `[x]` Seed owner access.
- `[x]` Seed tenant and clinic metadata.
- `[x]` Produce provisioning report.
- `[x]` Add idempotency behavior.

### P0.4 Job-Based Import Pipeline

- `[ ]` Add import job state model.
- `[ ]` Split upload validation/import/compute steps.
- `[ ]` Add retry-safe compute.
- `[ ]` Show job status in UI.
- `[ ]` Add job duration/error summary.

### P0.5 Audit, Backup, Recovery

- `[ ]` Expand audit events.
- `[ ]` Add backup workflow doc.
- `[ ]` Add restore workflow doc.
- `[ ]` Add release version/readiness output.
- `[ ]` Add backup status to admin console.

### P0.6 Materialized Analytics

- `[ ]` Define materialized breakdown sheets.
- `[ ]` Compute period/category breakdowns after import/compute.
- `[ ]` Make dashboard read materialized sheets first.
- `[ ]` Add transaction index lookup.
- `[ ]` Add row count guardrails.

## P1 - SaaS Operations

- `[ ]` Add internal admin console.
- `[ ]` Add tenant subscription state.
- `[ ]` Add environment separation guide.
- `[ ]` Add smoke test release checklist.
- `[ ]` Draft privacy policy and data processing notes.

## Current Slice Checklist

- `[x]` Documentation created.
- `[x]` Account/Akses UI implemented.
- `[x]` Backend user access management implemented.
- `[x]` Static/local checks pass.
- `[x]` Apps Script version deployed.
- `[x]` GitHub commit pushed.

## Current Slice - P0.3 Provisioning + UI Polish

- `[x]` Backend tenant provisioning service added.
- `[x]` Tenant registry admin payload added.
- `[x]` Provisioning creates or reuses tenant warehouse spreadsheet.
- `[x]` Provisioning seeds schema, tenant, clinic, owner access, and default COA.
- `[x]` Provisioning report returns spreadsheet URL and idempotency status.
- `[x]` Account/Akses UI includes tenant provisioning and registry panels.
- `[x]` Dashboard UI radius/copy toned down for a cleaner operational product feel.
- `[x]` Static/local checks pass.
- `[x]` Apps Script version deployed.
- `[x]` GitHub commit pushed.
