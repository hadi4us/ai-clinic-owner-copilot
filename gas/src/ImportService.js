/**
 * POC Import Service
 * Scope: Upload Excel/CSV -> Data Warehouse sheets -> KPI recompute.
 * No AI logic here.
 */
function uploadPocFile(base64Data, fileName, mimeType, options) {
  const context = resolveRequestContext_({}, options || {}, 'owner');
  return uploadPocFileForContext_(context, base64Data, fileName, mimeType, options || {});
}

function uploadPocFileForContext_(context, base64Data, fileName, mimeType, options) {
  if (!base64Data) throw new Error('File kosong. Upload Excel/CSV terlebih dahulu.');
  const opts = Object.assign({}, options || {}, { tenantId: context.tenantId, clinicId: context.clinicId, actorId: context.actorId });
  assertContextScope_(context, opts.tenantId, opts.clinicId);
  const bytes = Utilities.base64Decode(String(base64Data).split(',').pop());
  const contentType = mimeType || inferMimeTypeFromFileName_(fileName || 'upload.xlsx');
  const blob = Utilities.newBlob(bytes, contentType, fileName || 'upload.xlsx');
  validateUploadBlob_(blob, opts);
  return importUploadedBlob_(blob, opts);
}


function importUploadedBlob_(blob, options) {
  const opts = options || {};
  validateUploadBlob_(blob, opts);
  const fileName = blob.getName() || 'upload';
  const lowerName = fileName.toLowerCase();
  const fileChecksum = computeBlobChecksum_(blob);
  const importId = opts.importId || `imp_${Utilities.getUuid().replace(/-/g, '').slice(0, 12)}`;
  const tenantId = opts.tenantId || APP_CONFIG.defaultTenantId;
  const clinicId = opts.clinicId || APP_CONFIG.defaultClinicId;
  return withTenantClinicLock_('import_uploaded_blob', tenantId, clinicId, function() {
  ensurePhase1WarehouseSheetsNoLock_();
  const now = new Date();
  const duplicate = findCompletedImportByChecksum_(tenantId, clinicId, fileChecksum);
  if (duplicate && !opts.allowDuplicate) {
    appendSyncLog_(tenantId, clinicId, importId, 'import', opts.sourceSystem || 'generic_excel', 'duplicate', now, new Date(), 0, 0, 0, 'Duplicate upload rejected: same checksum already imported as ' + duplicate.import_id);
    return { ok: false, duplicate: true, importId, duplicateImportId: duplicate.import_id, rowsRead: 0, rowsWritten: 0, rowsFailed: 0, importedSheets: [], message: 'File duplicate. Upload ditolak agar KPI tidak double-count.' };
  }
  const sourceSystem = opts.sourceSystem || 'generic_excel';

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
    created_by: opts.actorId || opts.createdBy || 'dashboard_upload',
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
    checksum: fileChecksum,
    row_count: 0,
    uploaded_at: now,
    uploaded_by: opts.actorId || opts.createdBy || 'dashboard_upload',
    status: 'uploaded',
  }]);

  let result;
  try {
    if (lowerName.endsWith('.csv') || String(blob.getContentType()).indexOf('csv') !== -1) {
      result = importCsvBlob_(blob, importId, tenantId, clinicId, opts);
    } else {
      result = importExcelBlob_(blob, importId, tenantId, clinicId, opts);
    }
  } catch (err) {
    finalizeImportMetadata_(tenantId, clinicId, importId, 'failed', 'invalid', 0, opts.period || '', fileChecksum);
    appendSyncLog_(tenantId, clinicId, importId, 'import', sourceSystem, 'failed', now, new Date(), 0, 0, 0, err.message || String(err));
    throw new Error('Import gagal: ' + (err.message || err));
  }

  const period = opts.period || inferImportPeriodForScope_(tenantId, clinicId) || toPeriodString_(new Date());
  const importStatus = result.rowsWritten > 0 ? (result.rowsFailed > 0 ? 'partial' : 'completed') : 'failed';
  const dataStatus = result.rowsFailed > 0 ? 'partial' : 'complete';
  finalizeImportMetadata_(tenantId, clinicId, importId, importStatus, dataStatus, result.rowsRead, period, fileChecksum);
  const kpi = computePocKpisNoLock_(tenantId, clinicId, period);
  invalidateDashboardCache_(tenantId, clinicId, period);
  appendSyncLog_(tenantId, clinicId, importId, 'import', sourceSystem, importStatus === 'failed' ? 'failed' : 'success', now, new Date(), result.rowsRead, result.rowsWritten, result.rowsFailed, result.rowsFailed > 0 ? 'Import completed with validation failures. See VALIDATION_LOG.' : '');
  writeAudit_(opts.actorId || 'dashboard_upload', 'owner', 'upload_poc_file', 'IMPORT_BATCH', { importId, fileName, rowsWritten: result.rowsWritten, rowsFailed: result.rowsFailed, period });
  return Object.assign({ ok: importStatus !== 'failed', importId, period, kpi, importStatus, dataStatus }, result);
  });
}

function importCsvBlob_(blob, importId, tenantId, clinicId, options) {
  const csvText = blob.getDataAsString();
  const values = Utilities.parseCsv(csvText);
  if (!values.length) return { rowsRead: 0, rowsWritten: 0, rowsFailed: 0, importedSheets: [] };
  assertImportRowLimit_(values.length - 1);
  const targetSheet = options.targetSheet || detectTargetSheetFromHeaders_(values[0]);
  if (!targetSheet) throw new Error('Header CSV tidak dikenali. Sertakan kolom tanggal + amount/nilai atau pilih targetSheet eksplisit.');
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

  const sheets = tempSpreadsheet.getSheets();
  assertImportSheetLimit_(sheets.length);
  sheets.forEach(sheet => {
    const sheetName = String(sheet.getName()).trim().toUpperCase();
    const targetSheet = SHEET_SCHEMAS[sheetName] ? sheetName : detectTargetSheetFromHeaders_(sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0]);
    if (!targetSheet || ['IMPORT_BATCH', 'IMPORT_FILE', 'VALIDATION_LOG', 'RAW_IMPORT'].indexOf(targetSheet) !== -1) return;
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return;
    assertImportRowLimit_(rowsRead + values.length - 1);
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
  const seenPayloadHashes = {};
  rows.forEach((sourceRow, index) => {
    const sourceRowId = `${sourceSheetName || targetSheet}_${index + 1}`;
    const payloadHash = computePayloadHash_(sourceRow);
    if (seenPayloadHashes[payloadHash]) {
      rowsFailed++;
      appendValidationLog_(tenantId, clinicId, importId, targetSheet, index + 2, '', 'error', 'duplicate_source_row', 'Duplicate row dalam file dilewati agar KPI tidak double-count.', payloadHash, payloadHash);
      return;
    }
    seenPayloadHashes[payloadHash] = true;
    if (rowHasSensitiveKeys_(sourceRow)) {
      rowsFailed++;
      appendValidationLog_(tenantId, clinicId, importId, targetSheet, index + 2, '', 'error', 'sensitive_field_blocked', 'Field sensitif pasien terdeteksi. Row dilewati dan tidak disimpan ke RAW_IMPORT.', '', '');
      return;
    }

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
      payload_hash: payloadHash,
      imported_at: new Date(),
    });

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
    patient_ref: getFirst_(src, ['patient_ref', 'pasien_ref', 'kode_pasien_anonim']) || '', patient_type: getFirst_(src, ['patient_type', 'jenis_pasien']) || '', payer_type: getFirst_(src, ['payer_type', 'penjamin', 'jenis_pasienpenjamin']) || '',
    doctor_id: normalizeDoctorId_(getFirst_(src, ['doctor_id', 'dokter', 'nama_dokter'])), poli_id: normalizePoliId_(getFirst_(src, ['poli_id', 'poli', 'nama_poli'])),
    service_category: getFirst_(src, ['service_category', 'kategori_layanan']) || '', service_name: getFirst_(src, ['service_name', 'layanan', 'nama_layanan']) || '',
    status: getFirst_(src, ['status']) || 'completed', data_status: 'complete', created_at: now, updated_at: now,
  };
  if (targetSheet === 'TINDAKAN') return {
    tenant_id: tenantId, clinic_id: clinicId, procedure_id: getFirst_(src, ['procedure_id', 'tindakan_id']) || `proc_${importId}_${index + 1}`,
    source_procedure_id: getFirst_(src, ['source_procedure_id', 'procedure_id', 'tindakan_id']) || '', import_id: importId, source_row_id: sourceRowId,
    visit_id: getFirst_(src, ['visit_id', 'id_kunjungan']) || '', doctor_id: normalizeDoctorId_(getFirst_(src, ['doctor_id', 'dokter', 'nama_dokter'])), poli_id: normalizePoliId_(getFirst_(src, ['poli_id', 'poli', 'nama_poli'])),
    procedure_date: toIsoDateString_(getFirst_(src, ['procedure_date', 'tanggal', 'tanggal_tindakan', 'transaction_date'])), procedure_category: getFirst_(src, ['procedure_category', 'kategori', 'kategori_tindakan']) || 'tindakan',
    procedure_name: getFirst_(src, ['procedure_name', 'tindakan', 'layanan', 'item_name', 'nama_tindakan']) || 'Tindakan', quantity: asNumber_(getFirst_(src, ['quantity', 'qty', 'jumlah']), 1),
    unit_price: asNumber_(getFirst_(src, ['unit_price', 'harga', 'harga_satuan']), 0), gross_amount: asNumber_(getFirst_(src, ['gross_amount', 'amount', 'nilai', 'pendapatan_kotor']), 0), discount_amount: asNumber_(getFirst_(src, ['discount_amount', 'diskon']), 0), net_amount: asNumber_(getFirst_(src, ['net_amount', 'amount', 'nilai', 'pendapatan_bersih']), 0), status: 'active', created_at: now,
  };
  if (targetSheet === 'RESEP') return {
    tenant_id: tenantId, clinic_id: clinicId, prescription_id: getFirst_(src, ['prescription_id', 'resep_id']) || `rx_${importId}_${index + 1}`,
    source_prescription_id: getFirst_(src, ['source_prescription_id', 'prescription_id', 'resep_id']) || '', import_id: importId, source_row_id: sourceRowId,
    visit_id: getFirst_(src, ['visit_id', 'id_kunjungan']) || '', medicine_id: normalizeId_('med_', getFirst_(src, ['medicine_id', 'kode_obat', 'item_code', 'item_name', 'obat'])),
    prescription_date: toIsoDateString_(getFirst_(src, ['prescription_date', 'tanggal', 'tanggal_resep', 'transaction_date'])), item_name: getFirst_(src, ['item_name', 'obat', 'medicine_name', 'nama_obat', 'nama_obatitem']) || 'Obat',
    quantity: asNumber_(getFirst_(src, ['quantity', 'qty', 'jumlah']), 0), unit: getFirst_(src, ['unit', 'satuan']) || '', unit_price: asNumber_(getFirst_(src, ['unit_price', 'harga_jual', 'harga_satuan']), 0),
    gross_amount: asNumber_(getFirst_(src, ['gross_amount', 'amount', 'nilai', 'pendapatan_kotor']), 0), discount_amount: asNumber_(getFirst_(src, ['discount_amount', 'diskon']), 0), net_amount: asNumber_(getFirst_(src, ['net_amount', 'amount', 'nilai', 'pendapatan_bersih']), 0), cogs_amount: asNumber_(getFirst_(src, ['cogs_amount', 'hpp', 'modal', 'hppmodal']), 0), batch_no: getFirst_(src, ['batch_no', 'batch']) || '', status: 'active', created_at: now,
  };
  if (targetSheet === 'BIAYA') return {
    tenant_id: tenantId, clinic_id: clinicId, expense_id: getFirst_(src, ['expense_id', 'biaya_id']) || `exp_${importId}_${index + 1}`,
    import_id: importId, source_row_id: sourceRowId, expense_date: toIsoDateString_(getFirst_(src, ['expense_date', 'tanggal', 'tanggal_biaya', 'transaction_date'])),
    expense_category: getFirst_(src, ['expense_category', 'kategori_biaya', 'kategori']) || 'operasional', expense_name: getFirst_(src, ['expense_name', 'nama_biaya', 'keterangan', 'item_name', 'nama_biayaketerangan']) || 'Biaya',
    account_id: getFirst_(src, ['account_id', 'coa']) || '', amount: asNumber_(getFirst_(src, ['amount', 'nilai', 'nominal']), 0), payment_method: getFirst_(src, ['payment_method', 'metode_bayar']) || '', vendor_name: getFirst_(src, ['vendor_name', 'vendor', 'supplier', 'vendorsupplier']) || '', related_visit_id: getFirst_(src, ['related_visit_id', 'visit_id']) || '', related_item_code: getFirst_(src, ['related_item_code', 'item_code']) || '', cost_type: getFirst_(src, ['cost_type', 'jenis_biaya']) || 'operational', allocation_target: getFirst_(src, ['allocation_target', 'alokasi']) || 'clinic', allocation_id: getFirst_(src, ['allocation_id']) || clinicId, status: 'paid', trace_status: 'traceable', created_at: now,
  };
  return {
    tenant_id: tenantId, clinic_id: clinicId, revenue_id: getFirst_(src, ['revenue_id', 'pendapatan_id']) || `rev_${importId}_${index + 1}`,
    transaction_id: getFirst_(src, ['transaction_id', 'invoice', 'no_transaksi']) || `trx_${importId}_${index + 1}`,
    import_id: importId, source_row_id: sourceRowId, visit_id: getFirst_(src, ['visit_id', 'id_kunjungan']) || '', doctor_id: normalizeDoctorId_(getFirst_(src, ['doctor_id', 'dokter', 'nama_dokter'])), poli_id: normalizePoliId_(getFirst_(src, ['poli_id', 'poli', 'nama_poli'])), transaction_date: toIsoDateString_(getFirst_(src, ['transaction_date', 'tanggal', 'tanggal_transaksi'])), revenue_type: getFirst_(src, ['revenue_type', 'jenis_pendapatan', 'kategori']) || 'tindakan', item_code: getFirst_(src, ['item_code', 'kode_item']) || '', item_name: getFirst_(src, ['item_name', 'layanan', 'tindakan', 'nama_item', 'nama_layananitem']) || 'Pendapatan', quantity: asNumber_(getFirst_(src, ['quantity', 'qty', 'jumlah']), 1), unit_price: asNumber_(getFirst_(src, ['unit_price', 'harga', 'harga_satuan']), 0), gross_amount: asNumber_(getFirst_(src, ['gross_amount', 'amount', 'nilai', 'pendapatan_kotor']), 0), discount_amount: asNumber_(getFirst_(src, ['discount_amount', 'diskon']), 0), net_amount: asNumber_(getFirst_(src, ['net_amount', 'amount', 'nilai', 'pendapatan_bersih']), 0), paid_amount: asNumber_(getFirst_(src, ['paid_amount', 'terbayar']), 0), receivable_amount: asNumber_(getFirst_(src, ['receivable_amount', 'piutang']), 0), payment_method: getFirst_(src, ['payment_method', 'metode_bayar']) || '', payer_type: getFirst_(src, ['payer_type', 'penjamin', 'jenis_pasienpenjamin']) || '', cashier: getFirst_(src, ['cashier', 'kasir']) || '', status: getFirst_(src, ['status']) || 'paid', trace_status: 'traceable', created_at: now,
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
  if (targetSheet === 'PENDAPATAN' && asNumber_(row.net_amount, 0) <= 0) {
    errors.push({ rowNumber, columnName: 'net_amount', issueType: 'invalid_amount', message: 'Nilai pendapatan harus lebih dari 0.', sourceValue: row.net_amount, normalizedValue: row.net_amount });
  }
  if (targetSheet === 'BIAYA' && asNumber_(row.amount, 0) <= 0) {
    errors.push({ rowNumber, columnName: 'amount', issueType: 'invalid_amount', message: 'Nilai biaya harus lebih dari 0.', sourceValue: row.amount, normalizedValue: row.amount });
  }
  return { ok: errors.length === 0, errors };
}

function appendValidationLog_(tenantId, clinicId, importId, targetSheet, rowNumber, columnName, severity, issueType, message, sourceValue, normalizedValue) {
  appendObjects_('VALIDATION_LOG', [{ validation_id: Utilities.getUuid(), tenant_id: tenantId, clinic_id: clinicId, import_id: importId, file_id: importId + '_file', target_sheet: targetSheet, row_number: rowNumber, column_name: columnName, severity, issue_type: issueType, message, source_value: sourceValue, normalized_value: normalizedValue, resolved: false, created_at: new Date() }]);
}

function validateUploadBlob_(blob, options) {
  const fileName = String(blob.getName() || '').toLowerCase();
  const contentType = String(blob.getContentType() || '').toLowerCase();
  const size = blob.getBytes().length;
  const maxBytes = (options && options.maxUploadBytes) || APP_CONFIG.maxUploadBytes || (5 * 1024 * 1024);
  if (size > maxBytes) throw new Error(`File terlalu besar (${size} bytes). Maksimum pilot ${maxBytes} bytes. Gunakan CSV terfilter.`);
  if (!isSupportedUploadType_(fileName, contentType)) throw new Error('Format file tidak didukung. Gunakan CSV atau XLSX untuk pilot.');
}

function isSupportedUploadType_(fileName, contentType) {
  if (/\.csv$/.test(fileName) || contentType.indexOf('csv') !== -1 || contentType === 'text/plain') return true;
  if (/\.xlsx?$/.test(fileName)) return true;
  if (contentType.indexOf('spreadsheet') !== -1 || contentType.indexOf('excel') !== -1 || contentType.indexOf('officedocument') !== -1) return true;
  return false;
}

function inferMimeTypeFromFileName_(fileName) {
  return String(fileName || '').toLowerCase().endsWith('.csv') ? 'text/csv' : MimeType.MICROSOFT_EXCEL;
}

function assertImportRowLimit_(rowCount) {
  const maxRows = APP_CONFIG.maxImportRows || 5000;
  if (rowCount > maxRows) throw new Error(`Jumlah row import terlalu besar (${rowCount}). Maksimum pilot ${maxRows}. Pecah file atau filter periode.`);
}

function assertImportSheetLimit_(sheetCount) {
  const maxSheets = APP_CONFIG.maxImportSheets || 8;
  if (sheetCount > maxSheets) throw new Error(`Jumlah sheet terlalu banyak (${sheetCount}). Maksimum pilot ${maxSheets}. Upload CSV lebih disarankan.`);
}

function computeBlobChecksum_(blob) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, blob.getBytes())).slice(0, 32);
}

function computePayloadHash_(row) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(row || {}))).slice(0, 32);
}

function findCompletedImportByChecksum_(tenantId, clinicId, checksum) {
  if (!checksum) return null;
  return getRowsAsObjects_('IMPORT_FILE').find(row => row.tenant_id === tenantId && row.clinic_id === clinicId && row.checksum === checksum && String(row.status || '').toLowerCase() === 'completed') || null;
}

function finalizeImportMetadata_(tenantId, clinicId, importId, importStatus, dataStatus, rowCount, period, checksum) {
  const matchesImport = function(row) { return row.tenant_id === tenantId && row.clinic_id === clinicId && row.import_id === importId; };
  updateObjectsWhere_('IMPORT_BATCH', matchesImport, function(row) {
    row.status = importStatus;
    row.data_status = dataStatus;
    row.period_start = period ? period + '-01' : row.period_start;
    row.period_end = period ? period + '-31' : row.period_end;
    row.completed_at = new Date();
    return row;
  });
  updateObjectsWhere_('IMPORT_FILE', matchesImport, function(row) {
    row.checksum = checksum || row.checksum;
    row.row_count = rowCount;
    row.status = importStatus === 'completed' || importStatus === 'partial' ? 'completed' : 'failed';
    return row;
  });
}

function appendSyncLog_(tenantId, clinicId, importId, jobType, sourceSystem, status, startedAt, finishedAt, rowsRead, rowsWritten, rowsFailed, errorMessage) {
  appendObjects_('SYNC_LOG', [{ tenant_id: tenantId, clinic_id: clinicId, sync_id: importId, job_type: jobType, source_system: sourceSystem, import_id: importId, status, started_at: startedAt, finished_at: finishedAt, rows_read: rowsRead, rows_written: rowsWritten, rows_failed: rowsFailed, error_message: errorMessage || '' }]);
}

function inferImportPeriod_(result) {
  return inferImportPeriodForScope_(APP_CONFIG.defaultTenantId, APP_CONFIG.defaultClinicId);
}

function inferImportPeriodForScope_(tenantId, clinicId) {
  const rows = getRowsAsObjects_('PENDAPATAN').concat(getRowsAsObjects_('BIAYA')).filter(row => inScope_(row, tenantId, clinicId));
  if (!rows.length) return '';
  const last = rows[rows.length - 1];
  return toPeriodString_(last.transaction_date || last.expense_date || new Date());
}
