# Backup and Restore Workflow

This workflow is mandatory before production releases, schema migrations, tenant registry changes, and large imports.

## Scope

Back up these assets per environment:

- Tenant warehouse spreadsheet.
- Tenant registry configuration / Script Properties snapshot.
- Release metadata: Git commit, Apps Script version, deployment ID, operator, timestamp.
- Any mapping templates or config sheets changed by the release.

Do not put raw backups in the repository. Store them in the approved protected Google Drive folder for the environment and tenant.

## Backup Workflow

1. Confirm environment, tenant ID, clinic ID, and active warehouse spreadsheet ID.
2. Confirm the current release metadata and previous rollback version.
3. Create a Google Sheets copy of the tenant warehouse spreadsheet.
4. Name the copy:
   `backup_<environment>_<tenantId>_<clinicId>_<YYYYMMDD-HHMM>_<releaseLabel>`
5. Restrict sharing to the owner/admin operations group only.
6. Export or record the tenant registry / Script Properties snapshot without exposing secret values in chat or git.
7. Record the backup in the release note with:
   - backup file ID or URL, masked if shared outside admin context
   - source spreadsheet ID, masked
   - release label / Apps Script version
   - operator
   - created timestamp
8. Run readiness check and smoke test after backup, before release promotion.

## Restore Workflow

Use restore only when rollback requires data/config recovery, not for ordinary failed imports that can be retried or marked failed.

1. Stop or disable related triggers for the affected tenant/job type.
2. Identify the last known-good backup and matching app version.
3. Repoint tenant registry / `WAREHOUSE_SPREADSHEET_ID` to the restored spreadsheet copy, or copy restored sheet data into the active warehouse after review.
4. Repoint Web App deployment to the rollback Apps Script version if app rollback is also required.
5. Re-run readiness check.
6. Run smoke checks:
   - authenticated dashboard load
   - tenant/clinic scope shown correctly
   - KPI period loads
   - import history visible
   - unauthorized access still blocked
7. Re-enable triggers only after checks pass.
8. Record an audit/release note containing cause, restore source, operator, timestamp, and follow-up action.

## Guardrails

- Never restore across tenant IDs.
- Never broaden backup sharing to debug an issue.
- Never delete the failed production spreadsheet until the incident is reviewed.
- Prefer app rollback first when data is intact.
- Prefer import retry / recompute when rows were written correctly but KPI compute failed.

## Admin Console Status Fields

The admin console should eventually surface:

- lastBackupAt
- lastBackupReleaseLabel
- lastBackupSpreadsheetIdMasked
- backupRequiredBeforeRelease
- restoreRunbookUrl
- triggerInventoryStatus
