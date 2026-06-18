/**
 * POC Import Service
 * Scope: Upload Excel/CSV -> Data Warehouse sheets -> KPI recompute.
 * No AI logic here.
 */
function uploadPocFile(base64Data, fileName, mimeType, options) {
  const context = resolveRequestContext_({}, options || {}, 'finance');
  return uploadPocFileForContext_(context, base64Data, fileName, mimeType, options || {});
}

function getDefaultImportJobPayload(limit) {
  const context = resolveRequestContext_({}, {}, 'finance');
  return getImportJobPayloadForContext_(context, limit || 10);
}

function runDefaultImportChunkWorker() {
  return runImportChunkWorker_();
}

function retryDefaultImportCompute(importId) {
  const context = resolveRequestContext_({}, {}, 'finance');
  return retryImportComputeForContext_(context, importId);
}

function retryImportComputeForContext_(context, importId) {
  const normalizedImportId = String(importId || '').trim();
  if (!normalizedImportId) throw new Error('Import ID wajib diisi.');
  assertContextScope_(context, context.tenantId, context.clinicId);
  return withTenantClinicLock_('retry_import_compute', context.tenantId, context.clinicId, function() {
    const tenantId = context.tenantId;
    const clinicId = context.clinicId;
    const job = getImportJobById_(tenantId, clinicId, normalizedImportId);
    if (!job) throw new Error('Import job tidak ditemukan untuk tenant/clinic aktif.');
    if (!job.retryable) throw new Error(job.retryReason || 'Job ini tidak bisa di-retry tanpa upload ulang.');
    const period = toPeriodString_(job.periodStart) || getLatestAvailablePeriodForScope_(tenantId, clinicId) || toPeriodString_(new Date());
    const startedAt = new Date();
    updateImportBatchStatus_(tenantId, clinicId, normalizedImportId, 'computing', job.dataStatus || 'partial', 'Retry compute KPI berjalan.');
    try {
      const kpi = computePocKpisNoLock_(tenantId, clinicId, period);
      const validation = summarizeValidationByImport_(tenantId, clinicId)[normalizedImportId] || {};
      const finalStatus = Number(validation.errorCount || 0) > 0 ? 'partial' : 'completed';
      const finalDataStatus = finalStatus === 'partial' ? 'partial' : 'complete';
      updateObjectsWhere_('IMPORT_BATCH', function(row) {
        return row.tenant_id === tenantId && row.clinic_id === clinicId && row.import_id === normalizedImportId;
      }, function(row) {
        row.status = finalStatus;
        row.data_status = finalDataStatus;
        row.completed_at = new Date();
        row.notes = 'KPI compute retry berhasil untuk periode ' + period + '.';
        return row;
      });
      updateObjectsWhere_('IMPORT_FILE', function(row) {
        return row.tenant_id === tenantId && row.clinic_id === clinicId && row.import_id === normalizedImportId;
      }, function(row) {
        row.status = 'completed';
        return row;
      });
      appendSyncLog_(tenantId, clinicId, normalizedImportId, 'compute_retry', job.sourceSystem || 'generic_excel', 'success', startedAt, new Date(), job.rowsRead, job.rowsWritten, job.rowsFailed, '');
      invalidateDashboardCache_(tenantId, clinicId, period);
      writeAudit_(context.actorId || context.userEmail || 'dashboard_retry', context.role || 'finance', 'import_compute_retry', 'IMPORT_BATCH', {
        importId: normalizedImportId,
        period: period,
        status: finalStatus,
      });
      return {
        ok: true,
        importId: normalizedImportId,
        period: period,
        status: finalStatus,
        message: 'Compute KPI berhasil diulang tanpa menulis ulang transaksi.',
        kpi: kpi,
        job: getImportJobById_(tenantId, clinicId, normalizedImportId),
      };
    } catch (err) {
      updateImportBatchStatus_(tenantId, clinicId, normalizedImportId, 'failed', 'partial', 'Retry compute KPI gagal: ' + (err.message || err));
      appendSyncLog_(tenantId, clinicId, normalizedImportId, 'compute_retry', job.sourceSystem || 'generic_excel', 'failed', startedAt, new Date(), job.rowsRead, job.rowsWritten, job.rowsFailed, err.message || String(err));
      throw new Error('Retry compute KPI gagal: ' + (err.message || err));
    }
  });
}

function getImportJobPayloadForContext_(context, limit) {
  const max = Math.max(1, Math.min(Number(limit || 10), 25));
  const tenantId = context.tenantId;
  const clinicId = context.clinicId;
  const filesByImportId = indexLatestImportFiles_(tenantId, clinicId);
  const syncByImportId = indexLatestSyncLogs_(tenantId, clinicId);
  const validationSummary = summarizeValidationByImport_(tenantId, clinicId);
  const batches = getScopedRows_('IMPORT_BATCH', tenantId, clinicId)
    .sort(function(a, b) { return dateSortValue_(b.started_at || b.completed_at) - dateSortValue_(a.started_at || a.completed_at); })
    .slice(0, max)
    .map(function(batch) {
      return buildImportJobRow_(batch, filesByImportId[batch.import_id], syncByImportId[batch.import_id], validationSummary[batch.import_id]);
    });
  return {
    ok: true,
    tenantId: tenantId,
    clinicId: clinicId,
    count: batches.length,
    jobs: batches,
    summary: summarizeImportJobs_(batches),
    generatedAt: Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
  };
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
  const sourceSystem = opts.sourceSystem || 'generic_excel';
  const duplicate = findCompletedImportByChecksum_(tenantId, clinicId, fileChecksum);
  if (duplicate && !opts.allowDuplicate) {
    appendImportJobStart_(tenantId, clinicId, importId, sourceSystem, lowerName, opts, fileName, fileChecksum, now);
    finalizeImportMetadata_(tenantId, clinicId, importId, 'duplicate', 'duplicate', 0, opts.period || '', fileChecksum);
    appendSyncLog_(tenantId, clinicId, importId, 'import', sourceSystem, 'duplicate', now, new Date(), 0, 0, 0, 'Duplicate upload rejected: same checksum already imported as ' + duplicate.import_id);
    writeAudit_(opts.actorId || 'dashboard_upload', 'finance', 'upload_duplicate_rejected', 'IMPORT_BATCH', { importId, duplicateImportId: duplicate.import_id, fileName });
    return { ok: false, duplicate: true, importId, duplicateImportId: duplicate.import_id, rowsRead: 0, rowsWritten: 0, rowsFailed: 0, importedSheets: [], importStatus: 'duplicate', dataStatus: 'duplicate', message: 'File duplicate. Upload ditolak agar KPI tidak double-count.' };
  }
  appendImportJobStart_(tenantId, clinicId, importId, sourceSystem, lowerName, opts, fileName, fileChecksum, now);

  let result;
  try {
    updateImportBatchStatus_(tenantId, clinicId, importId, 'validating', 'partial', 'Validasi struktur file berjalan.');
    const importPlan = validateImportBlobPlan_(blob, lowerName, opts);
    updateImportBatchStatus_(tenantId, clinicId, importId, 'importing', 'partial', 'Validasi selesai. Import ' + importPlan.sheetCount + ' sheet / ' + importPlan.rowsRead + ' row berjalan.');
    if (shouldQueueChunkedImport_(importPlan, opts)) {
      result = queueChunkedImportFromBlob_(blob, lowerName, importPlan, importId, tenantId, clinicId, opts);
      updateImportBatchStatus_(tenantId, clinicId, importId, 'queued', 'partial', 'Import besar masuk queue: ' + result.rowsRead + ' row menunggu worker.');
      appendSyncLog_(tenantId, clinicId, importId, 'import_queue', sourceSystem, 'queued', now, new Date(), result.rowsRead, 0, 0, 'Queued for chunk worker.');
      writeAudit_(opts.actorId || 'dashboard_upload', 'owner', 'import_chunk_queued', 'IMPORT_BATCH', { importId, fileName, rowsRead: result.rowsRead, targetSheet: result.targetSheet });
      return Object.assign({ ok: true, importId, importStatus: 'queued', dataStatus: 'partial', message: 'Import besar masuk queue. Worker akan memproses bertahap.', job: getImportJobById_(tenantId, clinicId, importId) }, result);
    }
    if (lowerName.endsWith('.csv') || String(blob.getContentType()).indexOf('csv') !== -1) {
      result = importCsvBlob_(blob, importId, tenantId, clinicId, opts);
    } else {
      result = importExcelBlob_(blob, importId, tenantId, clinicId, opts);
    }
    updateImportBatchStatus_(tenantId, clinicId, importId, 'computing', 'partial', 'Import selesai. Compute KPI berjalan.');
  } catch (err) {
    finalizeImportMetadata_(tenantId, clinicId, importId, 'failed', 'invalid', 0, opts.period || '', fileChecksum);
    appendSyncLog_(tenantId, clinicId, importId, 'import', sourceSystem, 'failed', now, new Date(), 0, 0, 0, err.message || String(err));
    throw new Error('Import gagal: ' + (err.message || err));
  }

  const period = opts.period || inferImportPeriodForScope_(tenantId, clinicId) || toPeriodString_(new Date());
  const importStatus = result.rowsWritten > 0 ? (result.rowsFailed > 0 ? 'partial' : 'completed') : 'failed';
  const dataStatus = result.rowsFailed > 0 ? 'partial' : 'complete';
  finalizeImportMetadata_(tenantId, clinicId, importId, importStatus, dataStatus, result.rowsRead, period, fileChecksum);
  let kpi;
  try {
    kpi = computePocKpisNoLock_(tenantId, clinicId, period);
  } catch (err) {
    updateImportBatchStatus_(tenantId, clinicId, importId, 'failed', 'partial', 'KPI compute failed: ' + (err.message || err));
    appendSyncLog_(tenantId, clinicId, importId, 'compute', sourceSystem, 'failed', now, new Date(), result.rowsRead, result.rowsWritten, result.rowsFailed, err.message || String(err));
    throw new Error('Import berhasil ditulis, tetapi compute KPI gagal: ' + (err.message || err));
  }
  invalidateDashboardCache_(tenantId, clinicId, period);
  appendSyncLog_(tenantId, clinicId, importId, 'import', sourceSystem, importStatus === 'failed' ? 'failed' : 'success', now, new Date(), result.rowsRead, result.rowsWritten, result.rowsFailed, result.rowsFailed > 0 ? 'Import completed with validation failures. See VALIDATION_LOG.' : '');
  writeAudit_(opts.actorId || 'dashboard_upload', 'owner', 'upload_poc_file', 'IMPORT_BATCH', { importId, fileName, rowsWritten: result.rowsWritten, rowsFailed: result.rowsFailed, period });
  return Object.assign({ ok: importStatus !== 'failed', importId, period, kpi, importStatus, dataStatus, job: getImportJobById_(tenantId, clinicId, importId) }, result);
  });
}

function validateImportBlobPlan_(blob, lowerName, options) {
  if (lowerName.endsWith('.csv') || String(blob.getContentType()).indexOf('csv') !== -1) {
    const csvText = blob.getDataAsString();
    const values = Utilities.parseCsv(csvText);
    if (!values.length) throw new Error('CSV kosong. Sertakan header dan minimal satu baris data.');
    assertImportRowLimit_(values.length - 1);
    const targetSheet = options.targetSheet || detectTargetSheetFromHeaders_(values[0]);
    if (!targetSheet) throw new Error('Header CSV tidak dikenali. Sertakan kolom tanggal + amount/nilai atau pilih targetSheet eksplisit.');
    return { ok: true, fileType: 'csv', sheetCount: 1, rowsRead: values.length - 1, targets: [targetSheet] };
  }
  if (typeof Drive === 'undefined' || !Drive.Files || !Drive.Files.insert) {
    throw new Error('Upload Excel membutuhkan Advanced Google Service: Drive API. Enable Drive API di Apps Script Services, atau upload CSV untuk POC cepat.');
  }
  return { ok: true, fileType: 'xlsx', sheetCount: 1, rowsRead: 0, targets: [] };
}

function shouldQueueChunkedImport_(importPlan, options) {
  if (options && options.forceChunkedImport === false) return false;
  if (options && options.forceChunkedImport === true) return true;
  if (!importPlan || importPlan.fileType !== 'csv') return false;
  return Number(importPlan.rowsRead || 0) > Number(APP_CONFIG.importChunkRows || 500);
}

function queueChunkedImportFromBlob_(blob, lowerName, importPlan, importId, tenantId, clinicId, options) {
  if (!importPlan || importPlan.fileType !== 'csv') throw new Error('Chunk worker MVP baru mendukung CSV.');
  const values = Utilities.parseCsv(blob.getDataAsString());
  const targetSheet = options.targetSheet || (importPlan.targets && importPlan.targets[0]);
  const rows = tableValuesToObjects_(values);
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('IMPORT_CHUNK_QUEUE_JSON') || '[]';
  let queue = [];
  try { queue = JSON.parse(raw) || []; } catch (err) { queue = []; }
  queue = queue.filter(function(item) { return item && item.importId !== importId; });
  queue.push({
    importId: importId,
    tenantId: tenantId,
    clinicId: clinicId,
    sourceSystem: options.sourceSystem || 'generic_excel',
    sourceSheetName: 'CSV',
    targetSheet: targetSheet,
    rows: rows,
    nextRowOffset: 0,
    rowsRead: 0,
    rowsWritten: 0,
    rowsFailed: 0,
    period: options.period || '',
    status: 'queued',
    chunkRows: Number(options.chunkRows || APP_CONFIG.importChunkRows || 500),
    updatedAt: Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
  });
  props.setProperty('IMPORT_CHUNK_QUEUE_JSON', JSON.stringify(queue));
  installImportChunkWorkerTrigger_();
  return { queued: true, rowsRead: rows.length, rowsWritten: 0, rowsFailed: 0, targetSheet: targetSheet, importedSheets: [{ targetSheet: targetSheet, rowsWritten: 0, rowsFailed: 0 }] };
}

function installImportChunkWorkerTrigger_() {
  if (typeof ScriptApp === 'undefined' || !ScriptApp.newTrigger) return { ok: false, message: 'ScriptApp trigger API unavailable.' };
  const existing = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction && trigger.getHandlerFunction() === 'runDefaultImportChunkWorker';
  });
  if (existing.length) return { ok: true, existing: true, count: existing.length };
  const trigger = ScriptApp.newTrigger('runDefaultImportChunkWorker').timeBased().after(60 * 1000).create();
  return { ok: true, triggerId: trigger.getUniqueId ? trigger.getUniqueId() : '' };
}

function runImportChunkWorker_() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('IMPORT_CHUNK_QUEUE_JSON') || '[]';
  let queue = [];
  try { queue = JSON.parse(raw) || []; } catch (err) { queue = []; }
  const job = queue.filter(function(item) { return item && ['queued', 'waiting', 'running'].indexOf(String(item.status || 'queued')) !== -1; })[0];
  if (!job) return { ok: true, message: 'Tidak ada import chunk job aktif.', processed: 0 };
  const startedAt = new Date();
  const maxRuntimeMs = Number(APP_CONFIG.importChunkMaxRuntimeMs || 240000);
  const chunkRows = Number(job.chunkRows || APP_CONFIG.importChunkRows || 500);
  const tenantId = job.tenantId || APP_CONFIG.defaultTenantId;
  const clinicId = job.clinicId || APP_CONFIG.defaultClinicId;
  return withTenantClinicLock_('import_chunk_worker', tenantId, clinicId, function() {
    updateImportBatchStatus_(tenantId, clinicId, job.importId, 'running', 'partial', 'Chunk import berjalan mulai row ' + (Number(job.nextRowOffset || 0) + 1) + '.');
    const rows = job.rows || [];
    const targetSheet = job.targetSheet;
    const start = Number(job.nextRowOffset || 0);
    const end = Math.min(rows.length, start + chunkRows);
    const result = importObjectRowsToFinalSheet_(targetSheet, rows.slice(start, end), job.importId, tenantId, clinicId, job.sourceSheetName || 'CHUNK');
    job.nextRowOffset = end;
    job.rowsRead = Number(job.rowsRead || 0) + result.rowsRead;
    job.rowsWritten = Number(job.rowsWritten || 0) + result.rowsWritten;
    job.rowsFailed = Number(job.rowsFailed || 0) + result.rowsFailed;
    job.updatedAt = Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss');
    if (job.nextRowOffset < rows.length && (new Date().getTime() - startedAt.getTime()) < maxRuntimeMs) {
      job.status = 'waiting';
      updateImportBatchStatus_(tenantId, clinicId, job.importId, 'waiting', 'partial', 'Chunk import menunggu trigger berikutnya: ' + job.nextRowOffset + '/' + rows.length + ' row.');
      appendSyncLog_(tenantId, clinicId, job.importId, 'import_chunk', job.sourceSystem || 'generic_excel', 'waiting', startedAt, new Date(), result.rowsRead, result.rowsWritten, result.rowsFailed, 'Chunk selesai, masih ada row tersisa.');
    } else {
      job.status = 'computing';
      updateImportBatchStatus_(tenantId, clinicId, job.importId, 'computing', 'partial', 'Semua chunk selesai. Compute KPI berjalan.');
      const period = job.period || inferImportPeriodForScope_(tenantId, clinicId) || toPeriodString_(new Date());
      computePocKpisNoLock_(tenantId, clinicId, period);
      invalidateDashboardCache_(tenantId, clinicId, period);
      updateImportBatchStatus_(tenantId, clinicId, job.importId, job.rowsFailed > 0 ? 'partial' : 'completed', job.rowsFailed > 0 ? 'partial' : 'complete', 'Chunk import selesai: ' + job.rowsWritten + ' row tertulis.');
      appendSyncLog_(tenantId, clinicId, job.importId, 'import_chunk', job.sourceSystem || 'generic_excel', 'success', startedAt, new Date(), job.rowsRead, job.rowsWritten, job.rowsFailed, '');
      job.status = 'completed';
    }
    props.setProperty('IMPORT_CHUNK_QUEUE_JSON', JSON.stringify(queue));
    return { ok: true, importId: job.importId, status: job.status, nextRowOffset: job.nextRowOffset, rowsRead: job.rowsRead, rowsWritten: job.rowsWritten, rowsFailed: job.rowsFailed };
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
  let coaSuggestionCount = 0;
  let coaReviewCount = 0;

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
    coaSuggestionCount += Number(result.coaSuggestionCount || 0);
    coaReviewCount += Number(result.coaReviewCount || 0);
    imported.push({ sourceSheet: sheet.getName(), targetSheet, rowsWritten: result.rowsWritten, rowsFailed: result.rowsFailed });
  });

  try { Drive.Files.trash(tempFile.id); } catch (err) {}
  return { rowsRead, rowsWritten, rowsFailed, coaSuggestionCount, coaReviewCount, importedSheets: imported };
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
  const coaSuggestionRows = [];
  const coaContext = { tenantId, clinicId };
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

    const mapped = applyCoaSuggestionToFinalRow_(coaContext, mapGenericRowToFinalSheet_(targetSheet, sourceRow, importId, tenantId, clinicId, sourceRowId, index), targetSheet);
    const validation = validateFinalRow_(targetSheet, mapped, index + 2);
    if (!validation.ok) {
      rowsFailed++;
      validation.errors.forEach(err => appendValidationLog_(tenantId, clinicId, importId, targetSheet, err.rowNumber, err.columnName, 'error', err.issueType, err.message, err.sourceValue, err.normalizedValue));
      return;
    }
    if (mapped._coaSuggestionAudit) {
      coaSuggestionRows.push(mapped._coaSuggestionAudit);
      delete mapped._coaSuggestionAudit;
    } else {
      const auditRow = buildImportedCoaSuggestionRow_(coaContext, mapped, targetSheet);
      if (auditRow) coaSuggestionRows.push(auditRow);
    }
    finalRows.push(mapped);
  });

  appendObjects_('RAW_IMPORT', rawRows);
  appendObjects_(targetSheet, finalRows);
  appendObjects_('AI_COA_SUGGESTION', coaSuggestionRows);
  return { rowsRead: rows.length, rowsWritten: finalRows.length, rowsFailed, coaSuggestionCount: coaSuggestionRows.length, coaReviewCount: coaSuggestionRows.filter(function(row) { return String(row.review_status || '') === 'pending_review'; }).length, importedSheets: [{ targetSheet, rowsWritten: finalRows.length, rowsFailed, coaSuggestionCount: coaSuggestionRows.length, coaReviewCount: coaSuggestionRows.filter(function(row) { return String(row.review_status || '') === 'pending_review'; }).length }] };
}

function mapGenericRowToFinalSheet_(targetSheet, row, importId, tenantId, clinicId, sourceRowId, index) {
  const now = new Date();
  const src = normalizeSourceRowKeys_(row);
  if (targetSheet === 'KUNJUNGAN') return {
    tenant_id: tenantId, clinic_id: clinicId, visit_id: getFirst_(src, ['visit_id', 'id_kunjungan']) || `visit_${importId}_${index + 1}`,
    source_visit_id: getFirst_(src, ['source_visit_id', 'visit_id', 'id_kunjungan']) || '', import_id: importId, source_row_id: sourceRowId,
    visit_date: toIsoDateString_(getFirst_(src, ['visit_date', 'tanggal', 'tanggal_kunjungan', 'transaction_date'])), registration_time: getFirst_(src, ['registration_time', 'jam_registrasi']) || '',
    patient_ref: getFirst_(src, ['patient_ref', 'pasien_ref', 'kode_pasien_anonim']) || '', patient_type: getFirst_(src, ['patient_type', 'jenis_pasien', 'status_pasien']) || '', payer_type: getFirst_(src, ['payer_type', 'penjamin', 'jenis_pasienpenjamin']) || '',
    doctor_id: normalizeDoctorId_(getFirst_(src, ['doctor_id', 'dokter', 'nama_dokter'])), poli_id: normalizePoliId_(getFirst_(src, ['poli_id', 'poli', 'nama_poli'])),
    service_category: getFirst_(src, ['service_category', 'kategori_layanan', 'tipe_kunjungan']) || '', service_name: getFirst_(src, ['service_name', 'layanan', 'nama_layanan', 'tujuan_kunjunganlayanan_administratif', 'tujuan_kunjungan']) || '',
    status: getFirst_(src, ['status', 'status_kunjungan']) || 'completed', data_status: getFirst_(src, ['data_status', 'status_data']) || 'complete', created_at: now, updated_at: now,
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
  if (targetSheet === 'PAJAK') {
    const period = String(getFirst_(src, ['tax_period', 'masa_pajak', 'periode']) || '').slice(0, 7) || toPeriodString_(getFirst_(src, ['tanggal', 'date'])) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM');
    const payable = asNumber_(getFirst_(src, ['tax_payable', 'pajak_terutang', 'amount', 'nilai']), 0);
    const paid = asNumber_(getFirst_(src, ['tax_paid', 'pajak_dibayar']), 0);
    return {
      tenant_id: tenantId, clinic_id: clinicId, tax_id: getFirst_(src, ['tax_id', 'id_pajak']) || `tax_${importId}_${index + 1}`,
      import_id: importId, tax_period: period, tax_type: getFirst_(src, ['tax_type', 'jenis_pajak']) || 'Pajak manual',
      taxable_revenue: asNumber_(getFirst_(src, ['taxable_revenue', 'omzet_kena_pajak']), 0), non_taxable_revenue: asNumber_(getFirst_(src, ['non_taxable_revenue', 'omzet_tidak_kena_pajak']), 0),
      tax_base_amount: asNumber_(getFirst_(src, ['tax_base_amount', 'dppdasar_pengenaan_pajak', 'dpp']), 0), tax_rate: asNumber_(getFirst_(src, ['tax_rate', 'tarif_pajak']), 0),
      tax_payable: payable, tax_paid: paid, tax_outstanding: Math.max(0, payable - paid), document_status: getFirst_(src, ['document_status', 'status_dokumen']) || 'draft',
      risk_flag: getFirst_(src, ['risk_flag']) || 'review_required', reconciliation_gap: asNumber_(getFirst_(src, ['reconciliation_gap']), 0), notes: getFirst_(src, ['notes', 'catatan_pajak', 'catatan']) || '', created_at: now, updated_at: now,
    };
  }
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
  if (keys.indexOf('pajak') !== -1 || keys.indexOf('tax') !== -1 || keys.indexOf('masa_pajak') !== -1) return 'PAJAK';
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
    PAJAK: ['tenant_id', 'clinic_id', 'tax_id', 'tax_period', 'tax_type', 'tax_payable'],
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

function appendImportJobStart_(tenantId, clinicId, importId, sourceSystem, lowerName, opts, fileName, fileChecksum, startedAt) {
  appendObjects_('IMPORT_BATCH', [{
    tenant_id: tenantId,
    clinic_id: clinicId,
    import_id: importId,
    source_system: sourceSystem,
    import_method: lowerName.endsWith('.csv') ? 'upload_csv' : 'upload_excel',
    period_start: opts.periodStart || opts.period || '',
    period_end: opts.periodEnd || '',
    status: 'validating',
    data_status: 'partial',
    started_at: startedAt,
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
    uploaded_at: startedAt,
    uploaded_by: opts.actorId || opts.createdBy || 'dashboard_upload',
    status: 'uploaded',
  }]);
}

function updateImportBatchStatus_(tenantId, clinicId, importId, status, dataStatus, notes) {
  updateObjectsWhere_('IMPORT_BATCH', function(row) {
    return row.tenant_id === tenantId && row.clinic_id === clinicId && row.import_id === importId;
  }, function(row) {
    row.status = status || row.status;
    row.data_status = dataStatus || row.data_status;
    if (notes) row.notes = notes;
    return row;
  });
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

function getImportJobById_(tenantId, clinicId, importId) {
  const batch = getScopedRows_('IMPORT_BATCH', tenantId, clinicId).find(function(row) { return row.import_id === importId; });
  if (!batch) return null;
  return buildImportJobRow_(
    batch,
    indexLatestImportFiles_(tenantId, clinicId)[importId],
    indexLatestSyncLogs_(tenantId, clinicId)[importId],
    summarizeValidationByImport_(tenantId, clinicId)[importId]
  );
}

function buildImportJobRow_(batch, file, sync, validation) {
  const startedAt = batch.started_at || (file && file.uploaded_at) || '';
  const completedAt = batch.completed_at || (sync && sync.finished_at) || '';
  const rowsRead = Number((sync && sync.rows_read) || (file && file.row_count) || 0);
  const rowsWritten = Number((sync && sync.rows_written) || 0);
  const rowsFailed = Number((sync && sync.rows_failed) || (validation && validation.errorCount) || 0);
  const status = batch.status || (sync && sync.status) || 'unknown';
  const failureText = [sync && sync.error_message, batch.notes].filter(Boolean).join(' ').toLowerCase();
  const computeFailed = status === 'failed' && rowsWritten > 0 && failureText.indexOf('compute') !== -1;
  return {
    importId: batch.import_id || '',
    tenantId: batch.tenant_id || '',
    clinicId: batch.clinic_id || '',
    fileName: (file && file.file_name) || batch.notes || '',
    fileType: (file && file.file_type) || '',
    sourceSystem: batch.source_system || '',
    method: batch.import_method || '',
    status: status,
    dataStatus: batch.data_status || '',
    periodStart: batch.period_start || '',
    periodEnd: batch.period_end || '',
    startedAt: formatJobDate_(startedAt),
    completedAt: formatJobDate_(completedAt),
    durationSeconds: computeDurationSeconds_(startedAt, completedAt),
    createdBy: batch.created_by || '',
    rowsRead: rowsRead,
    rowsWritten: rowsWritten,
    rowsFailed: rowsFailed,
    retryable: computeFailed,
    retryReason: computeFailed ? '' : (rowsWritten > 0 ? 'Retry otomatis hanya tersedia jika tahap compute KPI gagal.' : 'Belum ada transaksi yang berhasil ditulis; perbaiki file lalu upload ulang.'),
    validationCount: Number((validation && validation.count) || 0),
    validationErrors: (validation && validation.samples) || [],
    errorMessage: (sync && sync.error_message) || '',
    checksum: (file && file.checksum) || '',
  };
}

function indexLatestImportFiles_(tenantId, clinicId) {
  return getScopedRows_('IMPORT_FILE', tenantId, clinicId).reduce(function(index, row) {
    const existing = index[row.import_id];
    if (!existing || dateSortValue_(row.uploaded_at) >= dateSortValue_(existing.uploaded_at)) index[row.import_id] = row;
    return index;
  }, {});
}

function indexLatestSyncLogs_(tenantId, clinicId) {
  return getScopedRows_('SYNC_LOG', tenantId, clinicId).reduce(function(index, row) {
    const existing = index[row.import_id];
    if (!existing || dateSortValue_(row.finished_at || row.started_at) >= dateSortValue_(existing.finished_at || existing.started_at)) index[row.import_id] = row;
    return index;
  }, {});
}

function summarizeValidationByImport_(tenantId, clinicId) {
  return getScopedRows_('VALIDATION_LOG', tenantId, clinicId).reduce(function(index, row) {
    const importId = row.import_id || '';
    if (!importId) return index;
    if (!index[importId]) index[importId] = { count: 0, errorCount: 0, samples: [] };
    index[importId].count++;
    if (String(row.severity || '').toLowerCase() === 'error') index[importId].errorCount++;
    if (index[importId].samples.length < 3) {
      index[importId].samples.push({
        targetSheet: row.target_sheet || '',
        rowNumber: row.row_number || '',
        issueType: row.issue_type || '',
        message: row.message || '',
      });
    }
    return index;
  }, {});
}

function summarizeImportJobs_(jobs) {
  const summary = { total: jobs.length, running: 0, completed: 0, failed: 0, partial: 0, duplicate: 0, rowsWritten: 0, rowsFailed: 0 };
  (jobs || []).forEach(function(job) {
    const status = String(job.status || '').toLowerCase();
    if (['validating', 'importing', 'computing'].indexOf(status) !== -1) summary.running++;
    else if (status === 'completed') summary.completed++;
    else if (status === 'partial') summary.partial++;
    else if (status === 'duplicate') summary.duplicate++;
    else if (status === 'failed') summary.failed++;
    summary.rowsWritten += Number(job.rowsWritten || 0);
    summary.rowsFailed += Number(job.rowsFailed || 0);
  });
  return summary;
}

function dateSortValue_(value) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return isNaN(time) ? 0 : time;
}

function formatJobDate_(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return Utilities.formatDate(date, APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss');
}

function computeDurationSeconds_(startedAt, completedAt) {
  const start = dateSortValue_(startedAt);
  const end = dateSortValue_(completedAt);
  return start && end && end >= start ? Math.round((end - start) / 1000) : 0;
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
