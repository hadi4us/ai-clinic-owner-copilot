var WAREHOUSE_SPREADSHEET_CACHE_ = {};
var SHEET_ROWS_CACHE_ = {};
var SHEET_SCOPE_ROWS_CACHE_ = {};
var ACTIVE_TENANT_ID_ = '';

function setActiveTenantContext_(tenantId) {
  const nextTenantId = String(tenantId || APP_CONFIG.defaultTenantId).trim();
  ACTIVE_TENANT_ID_ = nextTenantId || APP_CONFIG.defaultTenantId;
  return ACTIVE_TENANT_ID_;
}

function getActiveTenantId_() {
  return ACTIVE_TENANT_ID_ || APP_CONFIG.defaultTenantId;
}

function getWarehouseSpreadsheet_() {
  const tenantId = getActiveTenantId_();
  const spreadsheetId = getConfiguredSpreadsheetId_(tenantId);
  if (!spreadsheetId) throw new Error('TENANT_WAREHOUSE_MISSING: tenant ' + tenantId + ' belum punya warehouse spreadsheet id.');
  const cacheKey = [tenantId, spreadsheetId].join(':');
  if (!WAREHOUSE_SPREADSHEET_CACHE_[cacheKey]) {
    WAREHOUSE_SPREADSHEET_CACHE_[cacheKey] = SpreadsheetApp.openById(spreadsheetId);
  }
  return WAREHOUSE_SPREADSHEET_CACHE_[cacheKey];
}

function getOrCreateSheet_(spreadsheet, sheetName) {
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function setHeader_(sheet, headers) {
  const range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function ensureSheet_(sheetName) {
  const spreadsheet = getWarehouseSpreadsheet_();
  const sheet = getOrCreateSheet_(spreadsheet, sheetName);
  setHeader_(sheet, getSheetSchema_(sheetName));
  return sheet;
}

function clearDataKeepHeader_(sheet) {
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow > 1 && lastCol > 0) sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
}

function clearSheetDataByName_(sheetName) {
  clearDataKeepHeader_(ensureSheet_(sheetName));
  invalidateSheetRowsCache_(sheetName);
}

function appendRows_(sheet, rows) {
  if (!rows || rows.length === 0) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function appendObjects_(sheetName, objects) {
  const rows = objects || [];
  if (!rows.length) return { ok: true, appended: 0 };
  const sheet = ensureSheet_(sheetName);
  const headers = getSheetSchema_(sheetName);
  const values = rows.map(row => headers.map(header => row[header] === undefined ? '' : row[header]));
  appendRows_(sheet, values);
  invalidateSheetRowsCache_(sheetName);
  return { ok: true, appended: values.length };
}

function replaceObjects_(sheetName, objects) {
  const sheet = ensureSheet_(sheetName);
  clearDataKeepHeader_(sheet);
  invalidateSheetRowsCache_(sheetName);
  return appendObjects_(sheetName, objects || []);
}

function replaceObjectsWhere_(sheetName, predicate, replacementObjects) {
  const keptRows = getRowsAsObjects_(sheetName).filter(row => !predicate(row));
  return replaceObjects_(sheetName, keptRows.concat(replacementObjects || []));
}

function updateObjectsWhere_(sheetName, predicate, updater) {
  const rows = getRowsAsObjects_(sheetName).map(row => predicate(row) ? updater(Object.assign({}, row)) : row);
  return replaceObjects_(sheetName, rows);
}

function withDocumentLock_(operationName, callback) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(APP_CONFIG.lockWaitMs || 30000)) {
    throw new Error(`Sistem sedang memproses data lain (${operationName}). Coba lagi sebentar lagi.`);
  }
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function withTenantClinicLock_(operationName, tenantId, clinicId, callback) {
  return withDocumentLock_(`${operationName}:${tenantId || 'unknown'}:${clinicId || 'unknown'}`, function() {
    const previousTenantId = ACTIVE_TENANT_ID_;
    if (tenantId) setActiveTenantContext_(tenantId);
    try {
      return callback();
    } finally {
      restoreActiveTenantContext_(previousTenantId);
    }
  });
}

function getRowsAsObjects_(sheetName) {
  const cacheKey = getSheetRowsCacheKey_(sheetName);
  if (SHEET_ROWS_CACHE_[cacheKey]) return cloneRowsForRead_(SHEET_ROWS_CACHE_[cacheKey]);
  const sheet = getWarehouseSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const rows = values
    .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
    .map(row => headers.reduce((obj, header, index) => {
      if (header) obj[header] = row[index];
      return obj;
    }, {}));
  SHEET_ROWS_CACHE_[cacheKey] = rows;
  return cloneRowsForRead_(rows);
}

function getScopedRows_(sheetName, tenantId, clinicId) {
  if (tenantId) setActiveTenantContext_(tenantId);
  const key = [getSheetRowsCacheKey_(sheetName), tenantId || '', clinicId || ''].join('|');
  if (SHEET_SCOPE_ROWS_CACHE_[key]) return cloneRowsForRead_(SHEET_SCOPE_ROWS_CACHE_[key]);
  const rows = getRowsAsObjects_(sheetName).filter(row => inScope_(row, tenantId, clinicId));
  SHEET_SCOPE_ROWS_CACHE_[key] = rows;
  return cloneRowsForRead_(rows);
}

function getScopedPeriodRows_(sheetName, tenantId, clinicId, dateFields, period) {
  const fields = Array.isArray(dateFields) ? dateFields : [dateFields];
  const normalizedPeriod = String(period || '').slice(0, 7);
  if (!normalizedPeriod) return getScopedRows_(sheetName, tenantId, clinicId);
  if (tenantId) setActiveTenantContext_(tenantId);
  const key = [getSheetRowsCacheKey_(sheetName), tenantId || '', clinicId || '', fields.join(','), normalizedPeriod].join('|');
  if (SHEET_SCOPE_ROWS_CACHE_[key]) return cloneRowsForRead_(SHEET_SCOPE_ROWS_CACHE_[key]);
  const rows = getScopedRows_(sheetName, tenantId, clinicId).filter(function(row) {
    return fields.some(function(field) { return toPeriodString_(row[field]) === normalizedPeriod; });
  });
  SHEET_SCOPE_ROWS_CACHE_[key] = rows;
  return cloneRowsForRead_(rows);
}

function cloneRowsForRead_(rows) {
  return (rows || []).map(row => Object.assign({}, row));
}

function getSheetRowsCacheKey_(sheetName) {
  const tenantId = getActiveTenantId_();
  return [tenantId, getConfiguredSpreadsheetId_(tenantId), sheetName].join('|');
}

function getRowsAsObjectsForTenant_(sheetName, tenantId) {
  const previousTenantId = ACTIVE_TENANT_ID_;
  setActiveTenantContext_(tenantId);
  try {
    return getRowsAsObjects_(sheetName);
  } finally {
    restoreActiveTenantContext_(previousTenantId);
  }
}

function restoreActiveTenantContext_(tenantId) {
  const previous = String(tenantId || '').trim();
  if (previous) {
    setActiveTenantContext_(previous);
    return;
  }
  ACTIVE_TENANT_ID_ = '';
}

function invalidateSheetRowsCache_(sheetName) {
  if (!sheetName) {
    SHEET_ROWS_CACHE_ = {};
    SHEET_SCOPE_ROWS_CACHE_ = {};
    return;
  }
  Object.keys(SHEET_ROWS_CACHE_).forEach(function(key) {
    if (key.split('|').pop() === sheetName) delete SHEET_ROWS_CACHE_[key];
  });
  Object.keys(SHEET_SCOPE_ROWS_CACHE_).forEach(function(key) {
    if (key.indexOf('|' + sheetName + '|') !== -1) delete SHEET_SCOPE_ROWS_CACHE_[key];
  });
}

function ensurePhase1WarehouseSheetsNoLock_() {
  const spreadsheet = getWarehouseSpreadsheet_();
  getPhase1SheetNames_().forEach(sheetName => setHeader_(getOrCreateSheet_(spreadsheet, sheetName), getSheetSchema_(sheetName)));
  invalidateSheetRowsCache_();
  if (getActiveTenantId_() === APP_CONFIG.defaultTenantId) seedPocConfig_();
  writeAudit_('system', 'system', 'setup_final_warehouse_sheets', 'spreadsheet_schema', { schemaVersion: APP_CONFIG.schemaVersion, sheetCount: getPhase1SheetNames_().length });
  return { ok: true, tenantId: getActiveTenantId_(), spreadsheetId: getConfiguredSpreadsheetId_(), schemaVersion: APP_CONFIG.schemaVersion, sheetsCreatedOrUpdated: getPhase1SheetNames_().length };
}

function ensureWarehouseSchemaOnlyNoLock_() {
  const spreadsheet = getWarehouseSpreadsheet_();
  getPhase1SheetNames_().forEach(sheetName => setHeader_(getOrCreateSheet_(spreadsheet, sheetName), getSheetSchema_(sheetName)));
  const defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (defaultSheet && spreadsheet.getSheets().length > 1 && defaultSheet.getLastRow() <= 1) {
    spreadsheet.deleteSheet(defaultSheet);
  }
  invalidateSheetRowsCache_();
  return { ok: true, tenantId: getActiveTenantId_(), spreadsheetId: getConfiguredSpreadsheetId_(), schemaVersion: APP_CONFIG.schemaVersion, sheetsCreatedOrUpdated: getPhase1SheetNames_().length };
}

function setupFinalWarehouseSheets() {
  return withDocumentLock_('setup_final_warehouse_sheets', function() {
    return ensurePhase1WarehouseSheetsNoLock_();
  });
}
