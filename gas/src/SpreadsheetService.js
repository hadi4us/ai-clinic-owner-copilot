function getWarehouseSpreadsheet_() {
  return SpreadsheetApp.openById(getConfiguredSpreadsheetId_());
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
  return { ok: true, appended: values.length };
}

function replaceObjects_(sheetName, objects) {
  const sheet = ensureSheet_(sheetName);
  clearDataKeepHeader_(sheet);
  return appendObjects_(sheetName, objects || []);
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
  return withDocumentLock_(`${operationName}:${tenantId || 'unknown'}:${clinicId || 'unknown'}`, callback);
}

function getRowsAsObjects_(sheetName) {
  const sheet = getWarehouseSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values
    .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
    .map(row => headers.reduce((obj, header, index) => {
      if (header) obj[header] = row[index];
      return obj;
    }, {}));
}

function ensurePhase1WarehouseSheetsNoLock_() {
  const spreadsheet = getWarehouseSpreadsheet_();
  getPhase1SheetNames_().forEach(sheetName => setHeader_(getOrCreateSheet_(spreadsheet, sheetName), getSheetSchema_(sheetName)));
  seedPocConfig_();
  writeAudit_('system', 'system', 'setup_final_warehouse_sheets', 'spreadsheet_schema', { schemaVersion: APP_CONFIG.schemaVersion, sheetCount: getPhase1SheetNames_().length });
  return { ok: true, spreadsheetId: getConfiguredSpreadsheetId_(), schemaVersion: APP_CONFIG.schemaVersion, sheetsCreatedOrUpdated: getPhase1SheetNames_().length };
}

function setupFinalWarehouseSheets() {
  return withDocumentLock_('setup_final_warehouse_sheets', function() {
    return ensurePhase1WarehouseSheetsNoLock_();
  });
}
