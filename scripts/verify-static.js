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

function assertNotIncludes(file, snippets) {
  const text = read(file);
  for (const snippet of snippets) assert(!text.includes(snippet), `${file} must not include ${snippet}`);
  return text;
}

function checkManifest(file) {
  const manifest = JSON.parse(read(file));
  assert(manifest.webapp && manifest.webapp.access === 'ANYONE', `${file} webapp.access must be ANYONE`);
  assert(manifest.webapp && manifest.webapp.executeAs === 'USER_ACCESSING', `${file} webapp.executeAs must be USER_ACCESSING`);
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


assertIncludes('gas/src/ManualInputService.js', [
  'normalizeTransactionListPeriod_',
  'getAvailableTransactionPeriodsForContext_',
  'availablePeriods',
  "generatedAt: Utilities.formatDate",
]);

assertNotIncludes('gas/src/ManualInputService.js', [
  'generatedAt: new Date()',
]);

assertIncludes('gas/src/Dashboard.html', [
  'Payload transaksi kosong dari server',
  'Periode tersedia:',
]);

assertIncludes('gas/src/COAAssistant.js', [
  'COA_REVIEW_THRESHOLD',
  'suggestCoaForContext_',
  'buildCoaSuggestion_',
  'AI_COA_SUGGESTION',
  'getDefaultCoaMappingRules_',
  'testCoaSuggestionClassifierStatic',
]);

assertIncludes('gas/src/Schema.js', [
  'COA_MAPPING_RULE',
  'AI_COA_SUGGESTION',
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


const hadi4usScriptId = '1-2IlwXdJ6jih3KRgO5cOHQon2zDnYGEq06gyXAa37wPGk4KE99Tgoaoy';
const oldCccSpreadsheetId = '1XujOwLJprl1LjdEWoSAuhDEABsul3__zXQicfFy5bB4';
for (const file of ['gas/.clasp.json', 'gas/verify/.clasp.json']) {
  const config = JSON.parse(read(file));
  assert(config.scriptId === hadi4usScriptId, `${file} must point to the verified hadi4us Apps Script project`);
}
for (const file of ['gas/src/Config.js', 'src/Core/Config.gs']) {
  assert(!read(file).includes(oldCccSpreadsheetId), `${file} must not use old ccc19depok spreadsheet fallback`);
}

const docs = read('docs/SOURCE_OF_TRUTH_AND_DEPLOYMENT.md');
assert(docs.includes('A versioned deployment was updated from the `hadi4us@gmail.com`-authorized clasp user'), 'Docs must record the current hadi4us pilot deployment');
assert(docs.includes('Version: `41`'), 'Docs must record the current versioned Apps Script version');
assert(docs.includes('AKfycbyCYig7Fxz7eKyXYQL7UeAcZQJ4171fcPYL6ur-ixVdpHQ_S3w8OiHtqzaS1QqK7Oi9ag'), 'Docs must record the current versioned deployment ID');
assert(docs.includes('All Google-side resources for this project must use `hadi4us@gmail.com`'), 'Docs must state hadi4us Google account policy');
assert(docs.includes('Deprecated ccc19depok deployments'), 'Docs must record old deployment deprecation');

console.log('OK: static safety checks passed');
