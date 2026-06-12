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
- Dashboard internal `google.script.run.uploadPocFile` remains available to users who can access the web app UI; do not expose the pilot web app anonymously for real clinic data.
- For real pilot data, change web app access away from `ANYONE_ANONYMOUS` before deployment.

## Hot write-path policy

Spreadsheet write paths that setup/import/compute/reset data must hold a document lock via `LockService`.
If the lock is busy, return a clear retry message instead of running concurrent import/compute jobs.

## Non-canonical tree rule

If a file has both `gas/src/...` and `src/...` equivalents, `gas/src` wins until a deliberate clasp migration is tested and documented.
