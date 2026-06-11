# DEPLOYMENT

Status: **Final Technical Architecture Review**  
Scope: Deployment architecture for **AI Clinic Owner Copilot** using Google Apps Script, Google Spreadsheet, clasp, and GitHub.  
Constraint: No code.

---

## 1. Executive Verdict

Deployment on Google Apps Script is viable for MVP if environments are separated strictly.

Minimum production-safe model:

```text
GitHub source of truth
→ clasp deployment bridge
→ separate Apps Script project per environment
→ separate spreadsheet warehouse per environment and per production tenant
→ versioned web app deployment
→ manual production gate
```

Do not use Apps Script editor hotfixes as the source of truth. Do not deploy production from HEAD/latest without versioning.

---

## 2. Deployment Principles

1. **GitHub is source of truth**  
   Source files, documentation, schema, and non-secret config templates live in GitHub.

2. **Apps Script is runtime, not source repository**  
   Manual editor changes must be pulled back or reverted.

3. **Environment separation is mandatory**  
   Development, Staging, Production use different Apps Script projects and spreadsheets.

4. **Production release must be versioned**  
   Every production deploy has Git commit/tag, Apps Script version, deployment ID, and release note.

5. **No secrets in repository**  
   Tokens, spreadsheet IDs, API keys, webhook secrets, and service credentials must not be committed.

6. **Tenant isolation remains mandatory**  
   Production tenant data uses tenant spreadsheet isolation.

7. **Read-only SIM integration**  
   Deployment must not grant SIM Klinik writeback unless explicitly approved in a future scope.

---

## 3. Environment Model

| Environment | Apps Script Project | Spreadsheet | Purpose |
|---|---|---|---|
| Development | `AICOC_DEV` | Fixture/dev spreadsheet | Fast iteration and synthetic tests |
| Staging | `AICOC_STAGING` | Staging tenant spreadsheets | UAT and production-like validation |
| Production | `AICOC_PROD` | Production spreadsheet per tenant | Live owner usage |

### Why separate projects?

- Prevent dev triggers from touching production.
- Separate Web App URLs.
- Separate PropertiesService and secrets.
- Safer rollback.
- Easier audit.

---

## 4. Repository Strategy

Recommended repository layout:

| Path | Purpose |
|---|---|
| `src/` | Canonical Apps Script source modules |
| `gas/src/` | Deployable clasp root if current `.clasp.json` points there |
| `docs/` | Architecture and operational docs |
| `tests/` | Fixtures and validation specs |
| `config/*.example` | Non-secret config examples |
| `appsscript.json` | Manifest template/source |

### Do Not Commit

| File/Data | Reason |
|---|---|
| Active `.clasp.json` with production script ID | Environment leakage |
| `.env` and `.env.*` | Secrets |
| service-account JSON | Credential leak |
| API tokens/webhook secrets | Security breach |
| production spreadsheet IDs if considered sensitive | Tenant leakage |
| raw clinic exports | Patient/business privacy |

---

## 5. Development Deployment

Purpose:

- Build features.
- Validate schema.
- Test import using synthetic/anonymized data.
- Run fixture-based KPI checks.

Allowed data:

- Dummy data.
- Synthetic fixtures.
- Anonymized pilot extracts with approval.

Development checklist:

- Manifest valid.
- No secrets in diff.
- Schema matches `SPREADSHEET_SCHEMA_FINAL.md`.
- Fixture import completes.
- KPI smoke test passes.
- Dashboard loads from KPI, not raw.

---

## 6. Staging Deployment

Purpose:

- Validate release candidate.
- Test tenant isolation.
- Test import patterns A/B/C.
- Test triggers and failure handling.
- Run UAT.
- Rehearse rollback.

Staging checks:

1. Tenant registry points only to staging spreadsheets.
2. Web App URL clearly labeled staging.
3. Triggers are staging-only.
4. Notifications use test recipients or approved pilot recipients.
5. Support/admin access is time-boxed.
6. Production data, if cloned, is anonymized unless explicitly approved.

---

## 7. Production Deployment

Production rules:

1. Deploy only from approved release commit/tag.
2. Use Apps Script immutable version for production deployment.
3. Never deploy production as unversioned HEAD/latest.
4. Run smoke tests after deployment.
5. Keep previous production deployment available for rollback.
6. Backup tenant spreadsheets before schema-affecting release.
7. Disable duplicate triggers before/after deployment validation.

Production smoke test must verify:

- Health endpoint works.
- TenantContext resolves correctly.
- Dashboard loads for authorized owner.
- Unauthorized tenant access is denied.
- KPI reads from `KPI_*` only.
- Import disabled or safe if not part of release.
- Logs capture release and access events.

---

## 8. clasp Strategy

`clasp` is the bridge between GitHub/local source and Apps Script runtime.

Rules:

| Rule | Requirement |
|---|---|
| Environment-specific config | Separate dev/staging/prod script IDs |
| Avoid accidental prod push | Use explicit deploy workflow and checklist |
| Pull with caution | Pulling from Apps Script can overwrite local files |
| Active config not committed | Commit only `.example` configs |
| Production deploy versioned | Create Apps Script version before deploy |

Important current repository note:

- If active deployment still uses `gas/src`, production workflow must respect that until a deliberate clasp root migration is tested.
- Root `src/` can remain canonical architecture layout, but deployable source must be unambiguous.

---

## 9. Configuration and Secrets

### Config Storage

| Config Type | Storage |
|---|---|
| Non-secret constants | Source/config templates |
| Environment IDs | Environment-specific secure config |
| Tenant spreadsheet mapping | Protected TenantRegistry / server-side config |
| API secrets | Apps Script PropertiesService or approved secret store |
| Webhook secrets | PropertiesService, never source |
| Mapping template IDs | Spreadsheet config or source docs if non-secret |

### Required Properties

| Key Type | Notes |
|---|---|
| Environment name | `development`, `staging`, `production` |
| Tenant registry location | Server-side only |
| Allowed origin/recipient config | Avoid accidental external send |
| API/MCP secrets | Scoped and rotated |
| Release version | For diagnostics |

---

## 10. Trigger Management

Google Apps Script triggers are a common source of production incidents.

Rules:

1. Maintain trigger inventory per environment.
2. Use one scheduler pattern per job type.
3. Avoid creating duplicate triggers on every deploy.
4. Triggers must log `trigger_id`, environment, tenant, job type, and start/end status.
5. Long jobs must be chunked and resumable.
6. Trigger failures must not silently leave partial KPI visible.

Recommended trigger types:

| Trigger | Environment | Purpose |
|---|---|---|
| Import scan | Staging/Production | Drive/API sync |
| KPI compute | All | Precompute dashboard data |
| Data quality check | All | Mark warnings/errors |
| Backup | Staging/Production | Tenant spreadsheet copy/export |
| Summary generation | Staging/Production | AI/owner summary after KPI complete |

---

## 11. CI/CD Workflow

### Pull Request Checks

- Documentation changed if schema/API behavior changes.
- No secrets in diff.
- Apps Script syntax validation where available.
- Manifest validation.
- Test fixture validation.
- Risk checklist for multi-tenant and spreadsheet performance.

### Staging Release

1. Merge to main or release branch.
2. Push to staging Apps Script project.
3. Create Apps Script version candidate.
4. Deploy staging Web App.
5. Run smoke/regression checks.
6. UAT sign-off.

### Production Release

1. Confirm release notes and rollback plan.
2. Backup affected tenant spreadsheets.
3. Push exact release source to production Apps Script project.
4. Create Apps Script version.
5. Update production deployment to version.
6. Run production smoke test.
7. Monitor logs and dashboard.

Manual gate is required for production.

---

## 12. Versioning

| Version Type | Required Format |
|---|---|
| Git tag | Release identifier, e.g. MVP/Pilot version |
| Apps Script version | Immutable version with release note |
| Schema version | Stored in config/KPI rows |
| Mapping template version | Stored in `CFG_MAPPING_TEMPLATE` |
| Deployment note | Environment, commit, version, operator, timestamp |

KPI rows must include `schema_version` so old metrics can be identified after migration.

---

## 13. Rollback Strategy

### Rollback Types

| Type | Trigger | Action |
|---|---|---|
| App rollback | Dashboard/API broken | Repoint Web App deployment to previous Apps Script version |
| Config rollback | Wrong env/tenant config | Restore previous PropertiesService/config snapshot |
| Data rollback | Bad import/KPI | Mark sync batch rolled back, recompute KPI from prior completed batches |
| Schema rollback | Migration failed | Restore spreadsheet backup/copy and previous app version |

### Rollback Requirements

- Previous production deployment ID/version known.
- Tenant spreadsheet backup exists before schema migration.
- Import batches are idempotent and status-controlled.
- KPI computation can exclude failed/rolled-back sync IDs.
- Rollback actions logged in `LOG_AUDIT`.

---

## 14. Backup and Retention

Minimum MVP backup policy:

| Asset | Backup Frequency | Retention |
|---|---|---|
| Tenant spreadsheet | Before release + scheduled daily/weekly | 30-90 days pilot |
| Tenant registry | Before config change + scheduled | 90 days |
| Source code | GitHub | Permanent per repo policy |
| Release notes | Every production release | Permanent |
| Audit logs | Append-only sheet/export | 90+ days, longer for production |

Backups must not be shared broadly and must respect tenant isolation.

---

## 15. Monitoring

Apps Script has limited native observability, so logs must be deliberate.

Monitor:

- Trigger success/failure.
- Import batch status.
- KPI computation duration.
- Dashboard load errors.
- Unauthorized access attempts.
- Quota/time limit errors.
- Spreadsheet row count thresholds.
- Duplicate trigger count.

Production alerts should be owner-safe and admin-focused, not exposing patient or sensitive business details unnecessarily.

---

## 16. Production Readiness Checklist

Before first production pilot:

- [ ] Separate production Apps Script project exists.
- [ ] Production tenant spreadsheet created and access restricted.
- [ ] TenantRegistry configured.
- [ ] Web App deployment is versioned.
- [ ] PropertiesService secrets configured manually/securely.
- [ ] Trigger inventory clean.
- [ ] Schema validation passes.
- [ ] Fixture smoke test passes in staging.
- [ ] Tenant isolation test passes.
- [ ] Unauthorized access test passes.
- [ ] Import idempotency test passes.
- [ ] Backup created.
- [ ] Rollback version known.
- [ ] Release note written.

---

## 17. Technical Risks and Mitigations

| Risk ID | Area | Failure Mode | Impact | Mitigation |
|---|---|---|---|---|
| R-DEP-001 | Apps Script | Runtime/quota limit during import/KPI | Job fails or partial metrics | Chunk jobs, precompute, batch writes, queue by tenant |
| R-DEP-002 | Trigger | Duplicate triggers after deploy | Double import/KPI | Trigger inventory and idempotent batch control |
| R-DEP-003 | Environment | Wrong `.clasp.json` target | Dev code pushed to prod or vice versa | Environment-specific workflow and manual gate |
| R-DEP-004 | Config | PropertiesService swapped | Wrong spreadsheet/secret | Config snapshot and environment banner/health check |
| R-DEP-005 | Security | Secret committed | Credential compromise | Secret scanning and `.gitignore` discipline |
| R-DEP-006 | Production | Deploying HEAD/latest | Unreviewed code live | Immutable Apps Script version for prod |
| R-DEP-007 | Maintainability | Manual editor hotfix lost | Drift and regression | GitHub source of truth; pull/reconcile immediately |
| R-DEP-008 | Data | No backup before schema migration | Irrecoverable data loss | Mandatory pre-release backup |
| R-DEP-009 | Multi Tenant | Tenant registry points to wrong sheet | Cross-tenant leak/wrong KPI | Registry validation and smoke tests |
| R-DEP-010 | Observability | Failures silent | Bad dashboard decisions | LOG_ERROR, LOG_AUDIT, import status monitoring |

---

## 18. Final Recommendation

For MVP production:

1. Keep production deploy manual-gated.
2. Use spreadsheet per tenant.
3. Never run production from Apps Script HEAD/latest.
4. Treat triggers as deployable infrastructure that must be inventoried.
5. Require backup before schema or import changes.
6. Make smoke tests mandatory before calling a release successful.

Deployment is acceptable for pilot only if environment separation, versioning, and rollback are treated as first-class architecture, not afterthoughts.
