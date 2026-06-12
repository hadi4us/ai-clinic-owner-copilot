# Source of Truth and Deployment Flow

## Canonical code tree

For current Phase 1 pilot deployment, the canonical editable source is:

- `gas/src/`

Reason: `gas/.clasp.json` points `rootDir` to `./src` relative to `gas/`, so Apps Script deploys files from `gas/src`.

The root `src/` tree is a clean architecture mirror/reference. Do not edit root `src/` directly for pilot fixes unless the same change is mirrored from `gas/src`.

## Pre-deploy checklist

1. Read `CLAW.md` and confirm the change supports owner-first BI, no double entry, and traceable finance.
2. Edit `gas/src` first.
3. Mirror equivalent files into root `src` when module paths exist.
4. Confirm `gas/src/appsscript.json` has reviewed webapp access and OAuth scopes.
5. Run static/local checks:
   - Check there is no mutating public GET route for setup/compute/reset/upload.
   - Check dashboard dynamic spreadsheet values use `textContent`/DOM nodes, not template `innerHTML`.
6. Run Apps Script `runAllTests()` before pilot deploy when clasp/API access is available.
7. Commit with a concise message describing risk reduction.

## Current pilot security posture

- Public `GET` is read-only except dashboard rendering and health/dashboard payload.
- Mutating actions (`setup`, `compute`, `resetFixture`, `upload`) are POST-only for API calls and require `PILOT_MUTATION_TOKEN` when called through `doPost`.
- Dashboard/API data calls resolve tenant/clinic from `USER_ACCESS`, using the active Google session. Query/body `tenantId` and `clinicId` are only selectors after `requireClinicAccess_` passes.
- Dashboard internal `google.script.run.uploadPocFile` also resolves the same verified session context before import.
- Unknown users and cross-tenant requests are denied. `Session.getEffectiveUser()` is audit metadata only and is never used as actor fallback.
- Bootstrap setup is the only token-only mutating action because it may need to create initial `USER_ACCESS` from Script Property `PILOT_OWNER_EMAIL`. After setup, data/dashboard/import/compute/reset require verified session access.
- Manifest web app access is set to `ANYONE` (Google sign-in required), not `ANYONE_ANONYMOUS`. Keep it non-anonymous for pilot data and set Script Property `PILOT_OWNER_EMAIL` before running setup.

## Hot write-path policy

Spreadsheet write paths that setup/import/compute/reset data must hold a document lock via `LockService`.
If the lock is busy, return a clear retry message instead of running concurrent import/compute jobs.

## Non-canonical tree rule

If a file has both `gas/src/...` and `src/...` equivalents, `gas/src` wins until a deliberate clasp migration is tested and documented.


## Import/data-quality guardrails

- Pilot uploads accept only CSV/XLS/XLSX-like files and reject unsupported MIME/extensions before conversion.
- Default pilot limits: 5 MB, 5,000 data rows, 8 sheets. Prefer CSV for pilot imports.
- File checksum idempotency rejects duplicate completed uploads unless `allowDuplicate` is explicitly set.
- Duplicate rows inside one file are skipped and written to `VALIDATION_LOG` as `duplicate_source_row`.
- Sensitive patient columns are blocked before `RAW_IMPORT` storage; rejected PHI rows are not persisted raw.
- Critical import validation errors (`severity=error`, unresolved) mark KPI `data_status=incomplete` and are shown in dashboard Data Quality.


## Dashboard payload cache

- Dashboard payload is cached per `tenantId:clinicId:period` with `CacheService` for 120 seconds by default.
- Cache is best-effort; cache failures must not break dashboard rendering.
- Import, KPI compute, and fixture reset invalidate affected dashboard cache keys after writes.
