/**
 * Pilot readiness checks: safe, read-only diagnostics for deployment/usability.
 * Does not expose secret values.
 */
function readinessCheck() {
  const checks = [];
  const now = new Date();
  addReadinessCheck_(checks, 'manifest_non_anonymous', getManifestWebAccess_() !== 'ANYONE_ANONYMOUS', 'Web app access must not be ANYONE_ANONYMOUS for pilot data.', { access: getManifestWebAccess_() });
  addReadinessCheck_(checks, 'mutation_token_configured', !!getPilotMutationToken_(), 'Set Script Property PILOT_MUTATION_TOKEN before setup/import/compute/reset via API.');
  addReadinessCheck_(checks, 'owner_email_configured', !!getScriptProperty_('PILOT_OWNER_EMAIL', ''), 'Set Script Property PILOT_OWNER_EMAIL, then run setup once to seed USER_ACCESS.');
  addReadinessCheck_(checks, 'spreadsheet_id_configured', !!getConfiguredSpreadsheetId_(), 'Set Script Property WAREHOUSE_SPREADSHEET_ID or keep APP_CONFIG spreadsheetId valid.', { spreadsheetIdSource: getScriptProperty_('WAREHOUSE_SPREADSHEET_ID', '') ? 'script_property' : 'APP_CONFIG' });
  const tenantRegistry = getTenantRegistrySummary_();
  addReadinessCheck_(checks, 'tenant_registry_configured', tenantRegistry.length > 0 && tenantRegistry.every(t => t.warehouseConfigured), 'Configure TENANT_REGISTRY_JSON for production tenant isolation, or keep pilot WAREHOUSE_SPREADSHEET_ID fallback.', { tenants: tenantRegistry.length });
  addReadinessCheck_(checks, 'default_tenant_registered', !!getTenantRegistryEntry_(APP_CONFIG.defaultTenantId), 'Default tenant must exist in tenant registry or pilot fallback.');

  let spreadsheetOk = false;
  let missingSheets = [];
  try {
    const spreadsheet = getWarehouseSpreadsheet_();
    spreadsheetOk = !!spreadsheet;
    missingSheets = getPhase1SheetNames_().filter(name => !spreadsheet.getSheetByName(name));
  } catch (err) {
    addReadinessCheck_(checks, 'spreadsheet_access', false, 'Cannot open configured warehouse spreadsheet: ' + (err.message || err));
  }
  if (spreadsheetOk) addReadinessCheck_(checks, 'spreadsheet_access', true, 'Warehouse spreadsheet can be opened.');
  addReadinessCheck_(checks, 'warehouse_schema', spreadsheetOk && missingSheets.length === 0, missingSheets.length ? 'Run setup to create missing sheets.' : 'Warehouse schema sheets exist.', { missingSheets });

  let ownerSeeded = false;
  try {
    const ownerEmail = String(getScriptProperty_('PILOT_OWNER_EMAIL', '') || '').toLowerCase();
    ownerSeeded = !!ownerEmail && getRowsAsObjects_('USER_ACCESS').some(row => String(row.email || row.user_id || '').toLowerCase() === ownerEmail && String(row.status || 'active').toLowerCase() === 'active');
  } catch (err) {
    ownerSeeded = false;
  }
  addReadinessCheck_(checks, 'owner_access_seeded', ownerSeeded, 'PILOT_OWNER_EMAIL must exist as active USER_ACCESS row. Run setup after setting property.');

  let latestPeriod = '';
  let kpiRows = 0;
  try {
    latestPeriod = getLatestAvailablePeriodForScope_(APP_CONFIG.defaultTenantId, APP_CONFIG.defaultClinicId) || '';
    kpiRows = getRowsAsObjects_('KPI_BULANAN').filter(row => inScope_(row, APP_CONFIG.defaultTenantId, APP_CONFIG.defaultClinicId)).length;
  } catch (err) {}
  addReadinessCheck_(checks, 'kpi_data_available', kpiRows > 0, 'Run setup fixture or import clinic CSV/XLSX then compute KPI.', { latestPeriod, kpiRows });

  const release = getReleaseReadinessInfo_();
  addReadinessCheck_(checks, 'release_version_documented', !!(release.appsScriptVersion || release.gitCommit || release.releaseLabel), 'Set RELEASE_APPS_SCRIPT_VERSION / RELEASE_GIT_COMMIT / RELEASE_LABEL for production diagnostics.', release);
  const ok = checks.every(check => check.ok);
  return {
    ok,
    status: ok ? 'READY_FOR_PILOT_SMOKE' : 'NOT_READY',
    generatedAt: Utilities.formatDate(now, APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
    appName: APP_CONFIG.appName,
    schemaVersion: APP_CONFIG.schemaVersion,
    release,
    spreadsheetId: maskId_(getConfiguredSpreadsheetId_()),
    tenantRegistry,
    checks,
    nextActions: checks.filter(check => !check.ok).map(check => check.message),
  };
}

function getReleaseReadinessInfo_() {
  return {
    appsScriptVersion: getScriptProperty_('RELEASE_APPS_SCRIPT_VERSION', ''),
    gitCommit: getScriptProperty_('RELEASE_GIT_COMMIT', ''),
    releaseLabel: getScriptProperty_('RELEASE_LABEL', ''),
    deploymentId: maskId_(getScriptProperty_('RELEASE_DEPLOYMENT_ID', '')),
  };
}

function addReadinessCheck_(checks, name, ok, message, meta) {
  checks.push(Object.assign({ name, ok: !!ok, message }, meta || {}));
}

function getManifestWebAccess_() {
  // Keep in sync with appsscript.json. Apps Script cannot read manifest directly at runtime.
  return 'ANYONE';
}

function getManifestWebExecuteAs_() {
  // Keep in sync with appsscript.json. Apps Script cannot read manifest directly at runtime.
  return 'USER_ACCESSING';
}

function maskId_(value) {
  const s = String(value || '');
  if (s.length <= 12) return s ? '***' : '';
  return s.slice(0, 6) + '…' + s.slice(-4);
}
