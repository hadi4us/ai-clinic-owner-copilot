/**
 * POC Import Service
 * Scope: Upload Excel/CSV -> Data Warehouse sheets -> KPI recompute.
 * No AI logic here.
 */
function uploadPocFile(base64Data, fileName, mimeType, options) {
  const opts = options || {};
  if (!base64Data) throw new Error('File kosong. Upload Excel/CSV terlebih dahulu.');
  const bytes = Utilities.base64Decode(String(base64Data).split(',').pop());
  const blob = Utilities.newBlob(bytes, mimeType || MimeType.MICROSOFT_EXCEL, fileName || 'upload.xlsx');
  return importUploadedBlob_(blob, opts);
}

function importUploadedBlob_(blob, options) {
  const opts = options || {};
  const fileName = blob.getName() || 'upload';
  const lowerName = fileName.toLowerCase();
  const importId = opts.importId || `imp_${Utilities.getUuid().replace(/-/g, '').slice(0, 12)}`;
  const tenantId = opts.tenantId || APP_CONFIG.defaultTenantId;
  const clinicId = opts.clinicId || APP_CONFIG.defaultClinicId;
  return withTenantClinicLock_('import_uploaded_blob', tenantId, clinicId, function() {
  ensurePhase1WarehouseSheetsNoLock_();
  const sourceSystem = opts.sourceSystem || 'generic_excel';
  const now = new Date();

  appendObjects_('IMPORT_BATCH', [{
    tenant_id: tenantId,
    clinic_id: clinicId,
    import_id: importId,
    source_system: sourceSystem,
    import_method: lowerName.endsWith('.csv') ? 'upload_csv' : 'upload_excel',
    period_start: opts.periodStart || '',
    period_end: opts.periodEnd || '',
    status: 'validating',
    data_status: 'partial',
    started_at: now,
    completed_at: '',
    created_by: opts.createdBy || 'dashboard_upload',
    notes: fileName,
  }]);

  appendObjects_('IMPORT_FILE', [{
    tenant_id: tenantId,
    clinic_id: clinicId,
    import_id: importId,
    file_id: importId + '_file',
    file_name: fileName,
    file_type: lowerName.endsWith('.csv') ? 'csv' : 'xlsx',
    source_report_name: opts.sourceReportName || 'POC_UPLOAD',
    checksum: '',
    row_count: 0,
    uploaded_at: now,
    uploaded_by: opts.createdBy || 'dashboard_upload',
    status: 'uploaded',
  }]);

  let result;
  if (lowerName.endsWith('.csv') || String(blob.getContentType()).indexOf('csv') !== -1) {
    result = importCsvBlob_(blob, importId, tenantId, clinicId, opts);
  } else {
    result = importExcelBlob_(blob, importId, tenantId, clinicId, opts);
  }

  const period = opts.period || inferImportPeriod_(result) || toPeriodString_(new Date());
  const kpi = computePocKpisNoLock_(tenantId, clinicId, period);
  appendObjects_('SYNC_LOG', [{
    tenant_id: tenantId,
    clinic_id: clinicId,
    sync_id: importId,
    job_type: 'import',
    source_system: sourceSystem,
    import_id: importId,
    status: 'success',
    started_at: now,
    finished_at: new Date(),
    rows_read: result.rowsRead,
    rows_written: result.rowsWritten,
    rows_failed: result.rowsFailed,
    error_message: '',
  }]);
  writeAudit_('dashboard_upload', 'owner', 'upload_poc_file', 'IMPORT_BATCH', { importId, fileName, rowsWritten: result.rowsWritten, period });
  return Object.assign({ ok: true, importId, period, kpi }, result);
  });
}

function importCsvBlob_(blob, importId, tenantId, clinicId, options) {
  const csvText = blob.getDataAsString();
  const values = Utilities.parseCsv(csvText);
  if (!values.length) return { rowsRead: 0, rowsWritten: 0, rowsFailed: 0, importedSheets: [] };
  const targetSheet = options.targetSheet || detectTargetSheetFromHeaders_(values[0]) || 'PENDAPATAN';
  const rows = tableValuesToObjects_(values);
  return importObjectRowsToFinalSheet_(targetSheet, rows, importId, tenantId, clinicId, 'CSV');
}

function importExcelBlob_(blob, importId, tenantId, clinicId, options) {
  if (typeof Drive === 'undefined' || !Drive.Files || !Drive.Files.insert) {
    throw new Error('Upload Excel membutuhkan Advanced Google Service: Drive API. Enable Drive API di Apps Script Services, atau upload CSV untuk POC cepat.');
  }
  const tempFile = Drive.Files.insert({ title: `POC_IMPORT_${importId}`, mimeType: MimeType.GOOGLE_SHEETS }, blob, { convert: true });
  const tempSpreadsheet = SpreadsheetApp.openById(tempFile.id);
  const imported = [];
  let rowsRead = 0;
  let rowsWritten = 0;
  let rowsFailed = 0;

  tempSpreadsheet.getSheets().forEach(sheet => {
    const sheetName = String(sheet.getName()).trim().toUpperCase();
    const targetSheet = SHEET_SCHEMAS[sheetName] ? sheetName : detectTargetSheetFromHeaders_(sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0]);
    if (!targetSheet || ['IMPORT_BATCH', 'IMPORT_FILE', 'VALIDATION_LOG', 'RAW_IMPORT'].indexOf(targetSheet) !== -1) return;
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return;
    const rows = tableValuesToObjects_(values);
    const result = importObjectRowsToFinalSheet_(targetSheet, rows, importId, tenantId, clinicId, sheet.getName());
    rowsRead += result.rowsRead;
    rowsWritten += result.rowsWritten;
    rowsFailed += result.rowsFailed;
    imported.push({ sourceSheet: sheet.getName(), targetSheet, rowsWritten: result.rowsWritten, rowsFailed: result.rowsFailed });
  });

  try { Drive.Files.trash(tempFile.id); } catch (err) {}
  return { rowsRead, rowsWritten, rowsFailed, importedSheets: imported };
}

function tableValuesToObjects_(values) {
  const headers = (values[0] || []).map(header => String(header || '').trim());
  return values.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
    .map(row => headers.reduce((obj, header, index) => {
      if (header) obj[header] = row[index];
      return obj;
    }, {}));
}

function importObjectRowsToFinalSheet_(targetSheet, sourceRows, importId, tenantId, clinicId, sourceSheetName) {
  const rows = sourceRows || [];
  let rowsFailed = 0;
  const rawRows = [];
  const finalRows = [];
  rows.forEach((sourceRow, index) => {
    const sourceRowId = `${sourceSheetName || targetSheet}_${index + 1}`;
    rawRows.push({
      tenant_id: tenantId,
      clinic_id: clinicId,
      import_id: importId,
      file_id: importId + '_file',
      raw_id: `${importId}_${sourceRowId}`,
      source_system: 'generic_upload',
      source_report_name: targetSheet,
      source_sheet_name: sourceSheetName || targetSheet,
      source_row_id: sourceRowId,
      raw_payload: JSON.stringify(sourceRow),
      payload_hash: Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(sourceRow))).slice(0, 24),
      imported_at: new Date(),
    });

    if (rowHasSensitiveKeys_(sourceRow)) {
      rowsFailed++;
      appendValidationLog_(tenantId, clinicId, importId, targetSheet, index + 2, '', 'error', 'sensitive_field_blocked', 'Field sensitif pasien terdeteksi. Row dilewati.', '', '');
      return;
    }

    const mapped = mapGenericRowToFinalSheet_(targetSheet, sourceRow, importId, tenantId, clinicId, sourceRowId, index);
    const validation = validateFinalRow_(targetSheet, mapped, index + 2);
    if (!validation.ok) {
      rowsFailed++;
      validation.errors.forEach(err => appendValidationLog_(tenantId, clinicId, importId, targetSheet, err.rowNumber, err.columnName, 'error', err.issueType, err.message, err.sourceValue, err.normalizedValue));
      return;
    }
    finalRows.push(mapped);
  });

  appendObjects_('RAW_IMPORT', rawRows);
  appendObjects_(targetSheet, finalRows);
  return { rowsRead: rows.length, rowsWritten: finalRows.length, rowsFailed, importedSheets: [{ targetSheet, rowsWritten: finalRows.length, rowsFailed }] };
}

function mapGenericRowToFinalSheet_(targetSheet, row, importId, tenantId, clinicId, sourceRowId, index) {
  const now = new Date();
  const src = normalizeSourceRowKeys_(row);
  if (targetSheet === 'KUNJUNGAN') return {
    tenant_id: tenantId, clinic_id: clinicId, visit_id: getFirst_(src, ['visit_id', 'id_kunjungan']) || `visit_${importId}_${index + 1}`,
    source_visit_id: getFirst_(src, ['source_visit_id', 'visit_id', 'id_kunjungan']) || '', import_id: importId, source_row_id: sourceRowId,
    visit_date: toIsoDateString_(getFirst_(src, ['visit_date', 'tanggal', 'tanggal_kunjungan', 'transaction_date'])), registration_time: '',
    patient_ref: getFirst_(src, ['patient_ref', 'pasien_ref']) || '', patient_type: getFirst_(src, ['patient_type', 'jenis_pasien']) || '', payer_type: getFirst_(src, ['payer_type', 'penjamin']) || '',
    doctor_id: normalizeDoctorId_(getFirst_(src, ['doctor_id', 'dokter', 'nama_dokter'])), poli_id: normalizePoliId_(getFirst_(src, ['poli_id', 'poli', 'nama_poli'])),
    service_category: getFirst_(src, ['service_category', 'kategori_layanan']) || '', service_name: getFirst_(src, ['service_name', 'layanan']) || '',
    status: getFirst_(src, ['status']) || 'completed', data_status: 'complete', created_at: now, updated_at: now,
  };
  if (targetSheet === 'TINDAKAN') return {
    tenant_id: tenantId, clinic_id: clinicId, procedure_id: getFirst_(src, ['procedure_id', 'tindakan_id']) || `proc_${importId}_${index + 1}`,
    source_procedure_id: getFirst_(src, ['source_procedure_id', 'procedure_id', 'tindakan_id']) || '', import_id: importId, source_row_id: sourceRowId,
    visit_id: getFirst_(src, ['visit_id', 'id_kunjungan']) || '', doctor_id: normalizeDoctorId_(getFirst_(src, ['doctor_id', 'dokter', 'nama_dokter'])), poli_id: normalizePoliId_(getFirst_(src, ['poli_id', 'poli', 'nama_poli'])),
    procedure_date: toIsoDateString_(getFirst_(src, ['procedure_date', 'tanggal', 'tanggal_tindakan', 'transaction_date'])), procedure_category: getFirst_(src, ['procedure_category', 'kategori']) || 'tindakan',
    procedure_name: getFirst_(src, ['procedure_name', 'tindakan', 'layanan', 'item_name']) || 'Tindakan', quantity: asNumber_(getFirst_(src, ['quantity', 'qty']), 1),
    unit_price: asNumber_(getFirst_(src, ['unit_price', 'harga']), 0), gross_amount: asNumber_(getFirst_(src, ['gross_amount', 'amount', 'nilai']), 0), discount_amount: asNumber_(getFirst_(src, ['discount_amount', 'diskon']), 0), net_amount: asNumber_(getFirst_(src, ['net_amount', 'amount', 'nilai']), 0), status: 'active', created_at: now,
  };
  if (targetSheet === 'RESEP') return {
    tenant_id: tenantId, clinic_id: clinicId, prescription_id: getFirst_(src, ['prescription_id', 'resep_id']) || `rx_${importId}_${index + 1}`,
    source_prescription_id: getFirst_(src, ['source_prescription_id', 'prescription_id', 'resep_id']) || '', import_id: importId, source_row_id: sourceRowId,
    visit_id: getFirst_(src, ['visit_id', 'id_kunjungan']) || '', medicine_id: normalizeId_('med_', getFirst_(src, ['medicine_id', 'kode_obat', 'item_code', 'item_name', 'obat'])),
    prescription_date: toIsoDateString_(getFirst_(src, ['prescription_date', 'tanggal', 'tanggal_resep', 'transaction_date'])), item_name: getFirst_(src, ['item_name', 'obat', 'medicine_name', 'nama_obat']) || 'Obat',
    quantity: asNumber_(getFirst_(src, ['quantity', 'qty']), 0), unit: getFirst_(src, ['unit', 'satuan']) || '', unit_price: asNumber_(getFirst_(src, ['unit_price', 'harga_jual']), 0),
    gross_amount: asNumber_(getFirst_(src, ['gross_amount', 'amount', 'nilai']), 0), discount_amount: asNumber_(getFirst_(src, ['discount_amount', 'diskon']), 0), net_amount: asNumber_(getFirst_(src, ['net_amount', 'amount', 'nilai']), 0), cogs_amount: asNumber_(getFirst_(src, ['cogs_amount', 'hpp', 'modal']), 0), batch_no: getFirst_(src, ['batch_no', 'batch']) || '', status: 'active', created_at: now,
  };
  if (targetSheet === 'BIAYA') return {
    tenant_id: tenantId, clinic_id: clinicId, expense_id: getFirst_(src, ['expense_id', 'biaya_id']) || `exp_${importId}_${index + 1}`,
    import_id: importId, source_row_id: sourceRowId, expense_date: toIsoDateString_(getFirst_(src, ['expense_date', 'tanggal', 'tanggal_biaya', 'transaction_date'])),
    expense_category: getFirst_(src, ['expense_category', 'kategori_biaya', 'kategori']) || 'operasional', expense_name: getFirst_(src, ['expense_name', 'nama_biaya', 'keterangan', 'item_name']) || 'Biaya',
    account_id: getFirst_(src, ['account_id', 'coa']) || '', amount: asNumber_(getFirst_(src, ['amount', 'nilai', 'nominal']), 0), payment_method: getFirst_(src, ['payment_method', 'metode_bayar']) || '', vendor_name: getFirst_(src, ['vendor_name', 'vendor', 'supplier']) || '', related_visit_id: getFirst_(src, ['related_visit_id', 'visit_id']) || '', related_item_code: getFirst_(src, ['related_item_code', 'item_code']) || '', cost_type: getFirst_(src, ['cost_type', 'jenis_biaya']) || 'operational', allocation_target: getFirst_(src, ['allocation_target', 'alokasi']) || 'clinic', allocation_id: getFirst_(src, ['allocation_id']) || clinicId, status: 'paid', trace_status: 'traceable', created_at: now,
  };
  return {
    tenant_id: tenantId, clinic_id: clinicId, revenue_id: getFirst_(src, ['revenue_id', 'pendapatan_id']) || `rev_${importId}_${index + 1}`,
    transaction_id: getFirst_(src, ['transaction_id', 'invoice', 'no_transaksi']) || `trx_${importId}_${index + 1}`,
    import_id: importId, source_row_id: sourceRowId, visit_id: getFirst_(src, ['visit_id', 'id_kunjungan']) || '', doctor_id: normalizeDoctorId_(getFirst_(src, ['doctor_id', 'dokter', 'nama_dokter'])), poli_id: normalizePoliId_(getFirst_(src, ['poli_id', 'poli', 'nama_poli'])), transaction_date: toIsoDateString_(getFirst_(src, ['transaction_date', 'tanggal', 'tanggal_transaksi'])), revenue_type: getFirst_(src, ['revenue_type', 'jenis_pendapatan', 'kategori']) || 'tindakan', item_code: getFirst_(src, ['item_code', 'kode_item']) || '', item_name: getFirst_(src, ['item_name', 'layanan', 'tindakan', 'nama_item']) || 'Pendapatan', quantity: asNumber_(getFirst_(src, ['quantity', 'qty']), 1), unit_price: asNumber_(getFirst_(src, ['unit_price', 'harga']), 0), gross_amount: asNumber_(getFirst_(src, ['gross_amount', 'amount', 'nilai']), 0), discount_amount: asNumber_(getFirst_(src, ['discount_amount', 'diskon']), 0), net_amount: asNumber_(getFirst_(src, ['net_amount', 'amount', 'nilai']), 0), paid_amount: asNumber_(getFirst_(src, ['paid_amount', 'terbayar']), 0), receivable_amount: asNumber_(getFirst_(src, ['receivable_amount', 'piutang']), 0), payment_method: getFirst_(src, ['payment_method', 'metode_bayar']) || '', payer_type: getFirst_(src, ['payer_type', 'penjamin']) || '', cashier: getFirst_(src, ['cashier', 'kasir']) || '', status: getFirst_(src, ['status']) || 'paid', trace_status: 'traceable', created_at: now,
  };
}

function normalizeSourceRowKeys_(row) {
  return Object.keys(row || {}).reduce((obj, key) => {
    obj[normalizeHeaderKey_(key)] = row[key];
    return obj;
  }, {});
}

function getFirst_(row, keys) {
  for (let i = 0; i < keys.length; i++) {
    const key = normalizeHeaderKey_(keys[i]);
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return '';
}

function detectTargetSheetFromHeaders_(headers) {
  const keys = (headers || []).map(normalizeHeaderKey_).join('|');
  if (keys.indexOf('expense') !== -1 || keys.indexOf('biaya') !== -1 || keys.indexOf('nominal') !== -1) return 'BIAYA';
  if (keys.indexOf('prescription') !== -1 || keys.indexOf('resep') !== -1 || keys.indexOf('obat') !== -1) return 'RESEP';
  if (keys.indexOf('procedure') !== -1 || keys.indexOf('tindakan') !== -1) return 'TINDAKAN';
  if (keys.indexOf('visit') !== -1 || keys.indexOf('kunjungan') !== -1) return 'KUNJUNGAN';
  if (keys.indexOf('revenue') !== -1 || keys.indexOf('pendapatan') !== -1 || keys.indexOf('amount') !== -1 || keys.indexOf('nilai') !== -1) return 'PENDAPATAN';
  return '';
}

function validateFinalRow_(targetSheet, row, rowNumber) {
  const required = {
    KUNJUNGAN: ['tenant_id', 'clinic_id', 'visit_id', 'visit_date'],
    TINDAKAN: ['tenant_id', 'clinic_id', 'procedure_id', 'procedure_date', 'procedure_name', 'net_amount'],
    RESEP: ['tenant_id', 'clinic_id', 'prescription_id', 'prescription_date', 'item_name', 'net_amount'],
    PENDAPATAN: ['tenant_id', 'clinic_id', 'revenue_id', 'transaction_id', 'transaction_date', 'net_amount'],
    BIAYA: ['tenant_id', 'clinic_id', 'expense_id', 'expense_date', 'expense_category', 'amount'],
  }[targetSheet] || ['tenant_id', 'clinic_id'];
  const errors = [];
  required.forEach(field => {
    if (row[field] === undefined || row[field] === null || row[field] === '') errors.push({ rowNumber, columnName: field, issueType: 'missing_required', message: `Kolom wajib kosong: ${field}`, sourceValue: '', normalizedValue: '' });
  });
  ['transaction_date', 'expense_date', 'visit_date', 'procedure_date', 'prescription_date'].forEach(field => {
    if (row[field] && !/^\d{4}-\d{2}-\d{2}/.test(String(row[field]))) errors.push({ rowNumber, columnName: field, issueType: 'invalid_date', message: `Format tanggal harus YYYY-MM-DD: ${field}`, sourceValue: row[field], normalizedValue: row[field] });
  });
  return { ok: errors.length === 0, errors };
}

function appendValidationLog_(tenantId, clinicId, importId, targetSheet, rowNumber, columnName, severity, issueType, message, sourceValue, normalizedValue) {
  appendObjects_('VALIDATION_LOG', [{ validation_id: Utilities.getUuid(), tenant_id: tenantId, clinic_id: clinicId, import_id: importId, file_id: importId + '_file', target_sheet: targetSheet, row_number: rowNumber, column_name: columnName, severity, issue_type: issueType, message, source_value: sourceValue, normalized_value: normalizedValue, resolved: false, created_at: new Date() }]);
}

function inferImportPeriod_(result) {
  const rows = getRowsAsObjects_('PENDAPATAN').concat(getRowsAsObjects_('BIAYA'));
  if (!rows.length) return '';
  const last = rows[rows.length - 1];
  return toPeriodString_(last.transaction_date || last.expense_date || new Date());
}
