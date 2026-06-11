function assertTenantScope_(tenantId, clinicId) {
  if (!tenantId) throw new Error('tenant_id is required. No unscoped query is allowed.');
  if (!clinicId) throw new Error('clinic_id is required. Use ALL explicitly for aggregate later.');
}

function inScope_(row, tenantId, clinicId) {
  return row && row.tenant_id === tenantId && row.clinic_id === clinicId;
}

function asNumber_(value, fallbackValue) {
  if (value === null || value === undefined || value === '') return fallbackValue === undefined ? 0 : fallbackValue;
  if (typeof value === 'number') return isNaN(value) ? (fallbackValue === undefined ? 0 : fallbackValue) : value;
  const normalized = String(value).replace(/Rp/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
  const parsed = Number(normalized);
  return isNaN(parsed) ? (fallbackValue === undefined ? 0 : fallbackValue) : parsed;
}

function sumByField_(rows, fieldName) {
  return (rows || []).reduce((total, row) => total + asNumber_(row[fieldName], 0), 0);
}

function sumAmount_(rows) {
  return sumByField_(rows, 'amount');
}

function toIsoDateString_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, APP_CONFIG.timezone, 'yyyy-MM-dd');
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const dmy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return Utilities.formatDate(parsed, APP_CONFIG.timezone, 'yyyy-MM-dd');
  return text;
}

function toPeriodString_(value) {
  const iso = toIsoDateString_(value);
  return iso.length >= 7 ? iso.slice(0, 7) : iso;
}

function isInPeriod_(value, period) {
  return toPeriodString_(value) === period;
}

function normalizeId_(prefix, value) {
  if (!value) return '';
  return `${prefix}${String(value).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
}

function normalizeDoctorId_(sourceDoctorId) {
  return normalizeId_('doc_', sourceDoctorId);
}

function normalizePoliId_(sourcePoliId) {
  return normalizeId_('poli_', sourcePoliId);
}

function safeJsonParse_(text, fallbackValue) {
  try {
    if (text === null || text === undefined || text === '') return fallbackValue === undefined ? null : fallbackValue;
    return JSON.parse(text);
  } catch (err) {
    return fallbackValue === undefined ? null : fallbackValue;
  }
}

function safeJsonStringify_(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function normalizeHeaderKey_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function rowHasSensitiveKeys_(row) {
  const keys = Object.keys(row || {}).map(normalizeHeaderKey_).join('|');
  return SENSITIVE_SOURCE_KEYS.some(key => keys.indexOf(normalizeHeaderKey_(key)) !== -1);
}

function writeAudit_(actorId, role, action, resource, metadata) {
  const sheet = getWarehouseSpreadsheet_().getSheetByName('AUDIT_LOG');
  if (!sheet) return;
  appendObjects_('AUDIT_LOG', [{
    tenant_id: APP_CONFIG.defaultTenantId,
    audit_id: Utilities.getUuid(),
    user_id: actorId || 'system',
    action,
    target_sheet: resource,
    target_id: metadata && metadata.targetId ? metadata.targetId : '',
    before_json: '',
    after_json: JSON.stringify(metadata || {}),
    ip_or_channel: 'gas',
    created_at: new Date(),
  }]);
}
