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
- Manifest web app access is set to `ANYONE` (Google sign-in required) and `executeAs` is `USER_ACCESSING` so the active Google account can be verified against `USER_ACCESS`. Keep it non-anonymous for pilot data and set Script Property `PILOT_OWNER_EMAIL` before running setup.

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


## Pilot readiness check

- Read-only API route: `GET ?action=readiness` returns `READY_FOR_PILOT_SMOKE` or `NOT_READY` with non-secret checks.
- Required before real use:
  1. `PILOT_MUTATION_TOKEN` Script Property set.
  2. `PILOT_OWNER_EMAIL` Script Property set.
  3. Run setup once so `USER_ACCESS` contains the pilot owner.
  4. Warehouse schema exists and KPI data is available via fixture or import+compute.
- `WAREHOUSE_SPREADSHEET_ID` Script Property is required for pilot deployment. No fallback spreadsheet ID is approved while migrating away from old `ccc19depok@gmail.com` resources.

## Current pilot deployment

A versioned deployment was updated from the `hadi4us@gmail.com`-authorized clasp user on 2026-06-17.

- Apps Script ID: `1-2IlwXdJ6jih3KRgO5cOHQon2zDnYGEq06gyXAa37wPGk4KE99Tgoaoy`
- Version: `55` — `Import job status slice 2026-06-17`
- Deployment ID: `AKfycbyCYig7Fxz7eKyXYQL7UeAcZQJ4171fcPYL6ur-ixVdpHQ_S3w8OiHtqzaS1QqK7Oi9ag`
- Web app URL: `https://script.google.com/macros/s/AKfycbyCYig7Fxz7eKyXYQL7UeAcZQJ4171fcPYL6ur-ixVdpHQ_S3w8OiHtqzaS1QqK7Oi9ag/exec`
- Readiness status: authenticated smoke test passed as `hadi4us@gmail.com`; `authState` role `owner`, `importJobs` readable, and readiness status `READY_FOR_PILOT_SMOKE`.

The previous versioned deployment under `ccc19depok@gmail.com` was undeployed and must not be used.

Before any Google-side action for ai-clinic, run:

```bash
scripts/check-google-account.sh
```

It must report `hadi4us@gmail.com` before `clasp push`, version creation, deployment, Script Properties work, or pilot spreadsheet mutation.

## Google account policy for ai-clinic

All Google-side resources for this project must use `hadi4us@gmail.com`:

- Apps Script project ownership/deployments
- clasp/OAuth credentials
- Script Properties
- Pilot spreadsheet ownership/access
- Web app authorization/testing

Do **not** use `ccc19depok@gmail.com` for ai-clinic deployments or pilot data.

### Migration from old deployment

The current historical Apps Script project/deployment was created with `ccc19depok@gmail.com` and may show Google Drive "Anda memerlukan akses" for `hadi4us@gmail.com`.

Preferred fix: create or clone a fresh Apps Script project while logged in with `hadi4us@gmail.com`, then update `gas/.clasp.json` and `gas/verify/.clasp.json` to the new script ID.

Minimum temporary fix, if the old deployment must be inspected first:

1. From `ccc19depok@gmail.com`, open:
   `https://script.google.com/d/1-2IlwXdJ6jih3KRgO5cOHQon2zDnYGEq06gyXAa37wPGk4KE99Tgoaoy/edit`
2. Share it with `hadi4us@gmail.com` as Editor.
3. From `hadi4us@gmail.com`, make/copy/own the production Apps Script project and redeploy.
4. Set Script Properties on the `hadi4us@gmail.com`-owned project:
   - `PILOT_OWNER_EMAIL=hadi4us@gmail.com`
   - `PILOT_MUTATION_TOKEN=<random strong token>`
   - optional: `WAREHOUSE_SPREADSHEET_ID=<pilot spreadsheet id owned/shared to hadi4us>`
5. Run setup once, then open the new `hadi4us@gmail.com` deployment URL with `?action=readiness`.

Automation note: attempting to grant Drive permission to `hadi4us@gmail.com` via the old clasp token returned `appNotAuthorizedToFile`, so ownership/sharing must be done once through Google UI or by re-authorizing clasp as `hadi4us@gmail.com`.

## Hadi4us migration checklist

1. Authenticate clasp with the required account:
   ```bash
   cd gas
   npx clasp logout
   npx clasp login
   # choose hadi4us@gmail.com
   ../scripts/check-google-account.sh
   ```
2. Create a new Apps Script project from `hadi4us@gmail.com` or clone/copy ownership into a `hadi4us@gmail.com`-owned project.
3. Update `gas/.clasp.json` and `gas/verify/.clasp.json` with the new script ID. Tracked `.clasp.json` files are intentionally neutralized with `REPLACE_WITH_HADI4US_OWNED_SCRIPT_ID` until then.
4. Ensure the pilot spreadsheet is owned by or shared to `hadi4us@gmail.com`; set `WAREHOUSE_SPREADSHEET_ID` because no old ccc19depok spreadsheet fallback is approved.
5. Set Script Properties on the new Apps Script project:
   - `PILOT_OWNER_EMAIL=hadi4us@gmail.com`
   - `PILOT_MUTATION_TOKEN=<strong random token>`
   - `WAREHOUSE_SPREADSHEET_ID=<pilot spreadsheet id>` if not using the fallback ID.
6. Run local/static checks.
7. Run `clasp push`, create a new version, and deploy from the `hadi4us@gmail.com` account.
8. Open the new web app URL with `?action=readiness`; status must be `READY_FOR_PILOT_SMOKE` before pilot use.

## Deprecated ccc19depok deployments

On 2026-06-12, all versioned Apps Script deployments under the old `ccc19depok@gmail.com` project were undeployed/deleted, including the previous pilot readiness deployment `AKfycbxtZ6oiag4LoZWgUOss4G8VWdol8W_i88gJKQN-abz4RJgmEXRQKBetXlnA-IoL24U`.

Only the unversioned `@HEAD`/dev deployment ID `AKfycbyUCmgLcXylpATMskojI1rsWhKjsU37kpHSkpfvuFvg` remains because Apps Script reports: `Read-only deployments may not be deleted.` Treat it as deprecated and do not use it for ai-clinic pilot/production.

Next production deployment must be created from a `hadi4us@gmail.com`-owned Apps Script project.
