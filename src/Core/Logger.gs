/**
 * Logger.gs
 *
 * Structured logging for Google Apps Script V8.
 * Logs must avoid patient-sensitive data and secrets.
 */
function logDebug_(message, metadata) {
  logStructured_('DEBUG', message, metadata);
}

function logInfo_(message, metadata) {
  logStructured_('INFO', message, metadata);
}

function logWarn_(message, metadata) {
  logStructured_('WARN', message, metadata);
}

function logError_(message, metadata) {
  logStructured_('ERROR', message, metadata);
}

function logStructured_(level, message, metadata) {
  const payload = {
    level: level,
    app: APP_CONFIG.app.name,
    version: APP_CONFIG.app.version,
    message: String(message || ''),
    metadata: sanitizeForLog_(metadata || {}),
    timestamp: new Date().toISOString(),
  };

  const text = JSON.stringify(payload);
  if (level === 'ERROR') {
    console.error(text);
  } else if (level === 'WARN') {
    console.warn(text);
  } else {
    console.log(text);
  }
}

function sanitizeForLog_(value) {
  if (value === null || value === undefined) return value;
  if (Object.prototype.toString.call(value) === '[object Date]') return value.toISOString();
  if (Array.isArray(value)) return value.map(function (item) { return sanitizeForLog_(item); });
  if (typeof value !== 'object') return value;

  const sanitized = {};
  Object.keys(value).forEach(function (key) {
    if (isSensitiveKey_(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeForLog_(value[key]);
    }
  });
  return sanitized;
}

function isSensitiveKey_(key) {
  const normalized = String(key || '').toLowerCase();
  return SENSITIVE_KEYS.some(function (sensitiveKey) {
    return normalized.indexOf(String(sensitiveKey).toLowerCase()) !== -1;
  });
}

function auditLog_(session, action, resource, metadata) {
  const safeSession = session || {};
  const row = [
    safeSession.tenantId || APP_CONFIG.tenancy.defaultTenantId,
    Utilities.getUuid(),
    safeSession.actorId || 'system',
    safeSession.role || 'system',
    action,
    resource,
    new Date(),
    JSON.stringify(sanitizeForLog_(metadata || {})),
  ];

  try {
    const spreadsheet = SpreadsheetApp.openById(getConfiguredSpreadsheetId_());
    const sheet = spreadsheet.getSheetByName(SHEET_NAME.LOG_AUDIT);
    if (sheet) sheet.appendRow(row);
  } catch (err) {
    logWarn_('Audit log write failed', { error: err.message, action: action, resource: resource });
  }
}
