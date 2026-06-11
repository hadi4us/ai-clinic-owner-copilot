/**
 * MappingService.gs
 *
 * Maps SIM Klinik/export fields into canonical Data Warehouse schemas.
 */
function mapSourceRowsToWarehouse_(sheetName, sourceRows, mapping) {
  const schema = getDataWarehouseSchema_(sheetName);
  const fieldMapping = mapping || {};
  return (sourceRows || []).map(function (sourceRow) {
    const target = {};
    schema.forEach(function (targetField) {
      const sourceField = fieldMapping[targetField] || targetField;
      if (sourceRow[sourceField] !== undefined) {
        target[targetField] = normalizeWarehouseValue_(targetField, sourceRow[sourceField]);
      }
    });
    return target;
  });
}

function normalizeWarehouseValue_(fieldName, value) {
  if (value === null || value === undefined) return '';
  if (fieldName === 'amount' || fieldName.indexOf('_amount') !== -1 || fieldName.indexOf('total_') === 0 || fieldName === 'profit_margin') {
    return asNumber_(value, 0);
  }
  if (fieldName.indexOf('_date') !== -1 || fieldName === 'date' || fieldName === 'submitted_at' || fieldName === 'paid_at') {
    return toIsoDateString_(value);
  }
  if (fieldName === 'period' || fieldName === 'claim_month' || fieldName === 'visit_period') {
    return String(value).slice(0, 7);
  }
  if (fieldName === 'patient_ref' || fieldName === 'source_patient_id_hash') {
    return String(value);
  }
  return value;
}

function buildMappingTemplate_(sheetName, sourceHeaders) {
  const schema = getDataWarehouseSchema_(sheetName);
  const headers = sourceHeaders || [];
  return schema.reduce(function (mapping, field) {
    mapping[field] = headers.indexOf(field) !== -1 ? field : '';
    return mapping;
  }, {});
}

function assertMappingDoesNotExposeSensitiveFields_(mapping) {
  const text = JSON.stringify(mapping || {}).toLowerCase();
  SENSITIVE_KEYS.forEach(function (key) {
    if (text.indexOf(key) !== -1 && key !== 'patient_name') {
      throw new Error('Mapping contains sensitive field: ' + key);
    }
  });
  return true;
}
