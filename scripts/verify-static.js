#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function assertIncludes(file, snippets) {
  const text = read(file);
  for (const snippet of snippets) assert(text.includes(snippet), `${file} missing ${snippet}`);
  return text;
}

function checkManifest(file) {
  const manifest = JSON.parse(read(file));
  assert(manifest.webapp && manifest.webapp.access === 'ANYONE', `${file} webapp.access must be ANYONE`);
  assert(manifest.webapp && manifest.webapp.executeAs === 'USER_DEPLOYING', `${file} webapp.executeAs must be USER_DEPLOYING`);
  assert(!JSON.stringify(manifest.oauthScopes || []).includes('script.external_request'), `${file} must not include script.external_request scope`);
}

checkManifest('gas/src/appsscript.json');
checkManifest('appsscript.json');

const api = assertIncludes('gas/src/Api.js', [
  "action === 'health'",
  "action === 'readiness'",
  'MUTATING_GET_DISABLED',
  'assertPilotMutationAllowed_',
  'resolveRequestContext_',
]);
for (const action of ['setup', 'compute', 'resetFixture', 'upload']) {
  assert(api.includes(`['setup', 'compute', 'resetFixture', 'upload']`) || api.includes(action), `Api.js must mention mutating action ${action}`);
}

assertIncludes('gas/src/AuthService.js', [
  'Session.getActiveUser().getEmail()',
  'never fall back to effectiveEmail as actor',
  'FORBIDDEN: actor tidak boleh mengakses tenant ini',
  'clinicScopeAllows_',
]);

assertIncludes('gas/src/SpreadsheetService.js', [
  'LockService.getDocumentLock()',
  'tryLock(APP_CONFIG.lockWaitMs || 30000)',
  'getConfiguredSpreadsheetId_()',
  'replaceObjectsWhere_',
  'updateObjectsWhere_',
]);

assertIncludes('gas/src/ImportService.js', [
  'updateObjectsWhere_',
  'validateUploadBlob_',
  'maxImportRows',
  'maxImportSheets',
  'computeBlobChecksum_',
  'duplicate_source_row',
  'sensitive_field_blocked',
  'invalidateDashboardCache_',
]);

assertIncludes('gas/src/KpiEngine.js', [
  'replaceObjectsWhere_',
  'hasRequiredFinanceTrace_',
  'getOpenCriticalValidationIssues_',
  'Data quality blocking',
  'invalidateDashboardCache_',
]);

const dashboardHtml = read('gas/src/Dashboard.html');
assert(!dashboardHtml.includes('rows.map(r=>`<div class="row"'), 'Dashboard breakdown must not render dynamic rows through template innerHTML');
assert(!dashboardHtml.includes('rows.map(a=>`<div class="alert'), 'Dashboard alerts must not render dynamic alerts through template innerHTML');
assert(dashboardHtml.includes('textContent=a.message'), 'Dashboard alerts must assign message through textContent');
assert(dashboardHtml.includes('renderDataQuality'), 'Dashboard must render data quality warnings');

assertIncludes('gas/src/DashboardService.js', [
  'getDashboardPayloadCacheKey_',
  'CacheService.getScriptCache()',
  'cache.removeAll',
  'dataQualityWarnings',
]);

assertIncludes('gas/src/ReadinessService.js', [
  'readinessCheck',
  'mutation_token_configured',
  'owner_access_seeded',
  'maskId_',
  'READY_FOR_PILOT_SMOKE',
]);

assertIncludes('scripts/check-google-account.sh', [
  'hadi4us@gmail.com',
  'ai-clinic Google-side actions must use',
]);

const docs = read('docs/SOURCE_OF_TRUTH_AND_DEPLOYMENT.md');
assert(docs.includes('No active production/pilot deployment is currently approved'), 'Docs must not claim old ccc19depok deployment is current');
assert(docs.includes('All Google-side resources for this project must use `hadi4us@gmail.com`'), 'Docs must state hadi4us Google account policy');
assert(docs.includes('Deprecated ccc19depok deployments'), 'Docs must record old deployment deprecation');

console.log('OK: static safety checks passed');
