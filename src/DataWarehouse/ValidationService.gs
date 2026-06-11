/**
 * ValidationService.gs
 *
 * Validates canonical warehouse rows before write.
 */
function validateWarehouseRows_(session, sheetName, rows) {
  requireSession_(session);
  const errors = [];
  const schema = getDataWarehouseSchema_(sheetName);
  const requiredFields = getDataWarehouseRequiredFields_(sheetName);

  (rows || []).forEach(function (row, rowIndex) {
    validateWarehouseRow_(session, sheetName, schema, requiredFields, row, rowIndex, errors);
  });

  return { ok: errors.length === 0, errors: errors };
}

function validateWarehouseRow_(session, sheetName, schema, requiredFields, row, rowIndex, errors) {
  if (!row) {
    errors.push(makeValidationError_(sheetName, rowIndex, 'row_empty', 'Row is empty'));
    return;
  }

  requiredFields.forEach(function (field) {
    if (row[field] === undefined || row[field] === null || row[field] === '') {
      errors.push(makeValidationError_(sheetName, rowIndex, 'missing_required_field', 'Missing required field: ' + field));
    }
  });

  if (row.tenant_id !== session.tenantId) {
    errors.push(makeValidationError_(sheetName, rowIndex, 'tenant_scope_violation', 'Row tenant_id does not match session tenant.'));
  }

  if (row.clinic_id && !canAccessClinic_(session, row.clinic_id)) {
    errors.push(makeValidationError_(sheetName, rowIndex, 'clinic_scope_violation', 'Row clinic_id is outside session scope.'));
  }

  Object.keys(row).forEach(function (field) {
    if (schema.indexOf(field) === -1) {
      errors.push(makeValidationError_(sheetName, rowIndex, 'unknown_field', 'Unknown field for schema: ' + field));
    }
  });

  validateNoBlockedPatientData_(sheetName, row, rowIndex, errors);
  validateWarehouseTypes_(sheetName, row, rowIndex, errors);
}

function validateNoBlockedPatientData_(sheetName, row, rowIndex, errors) {
  const blockedFields = ['patient_name', 'patient_phone', 'patient_address', 'nik', 'diagnosis', 'medical_record', 'clinical_note'];
  blockedFields.forEach(function (field) {
    if (row[field] !== undefined && row[field] !== '') {
      errors.push(makeValidationError_(sheetName, rowIndex, 'sensitive_field_blocked', 'Sensitive field is not allowed: ' + field));
    }
  });
}

function validateWarehouseTypes_(sheetName, row, rowIndex, errors) {
  Object.keys(row).forEach(function (field) {
    const value = row[field];
    if (value === '' || value === null || value === undefined) return;
    if (field === 'amount' || field.indexOf('_amount') !== -1 || field === 'profit_margin') {
      if (isNaN(Number(value))) {
        errors.push(makeValidationError_(sheetName, rowIndex, 'invalid_number', 'Field must be numeric: ' + field));
      }
    }
    if (field.indexOf('_date') !== -1 || field === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}/.test(String(value))) {
        errors.push(makeValidationError_(sheetName, rowIndex, 'invalid_date', 'Field must use yyyy-MM-dd: ' + field));
      }
    }
    if (field === 'period' || field === 'claim_month' || field === 'visit_period') {
      if (!/^\d{4}-\d{2}/.test(String(value))) {
        errors.push(makeValidationError_(sheetName, rowIndex, 'invalid_period', 'Field must use yyyy-MM: ' + field));
      }
    }
  });
}

function makeValidationError_(sheetName, rowIndex, ruleId, message) {
  return {
    sheetName: sheetName,
    rowIndex: rowIndex,
    ruleId: ruleId,
    message: message,
  };
}
