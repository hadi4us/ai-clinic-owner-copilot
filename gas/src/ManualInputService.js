function saveManualClinicEntryForContext_(context, entry) {
  assertTenantScope_(context.tenantId, context.clinicId);
  const type = normalizeHeaderKey_(entry && entry.type);
  if (!type) throw new Error('Jenis input wajib dipilih.');
  return withTenantClinicLock_('manual_input', context.tenantId, context.clinicId, function() {
    ensurePhase1WarehouseSheetsNoLock_();
    const now = new Date();
    const importId = 'manual_' + Utilities.getUuid();
    const date = toIsoDateString_((entry.date || entry.transactionDate || entry.expenseDate || entry.taxPeriod || '').toString().slice(0, 10));
    const period = (entry.period || toPeriodString_(date) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM')).slice(0, 7);
    appendObjects_('IMPORT_BATCH', [{
      tenant_id: context.tenantId,
      clinic_id: context.clinicId,
      import_id: importId,
      source_system: 'manual_form',
      import_method: 'manual_input',
      period_start: period + '-01',
      period_end: period + '-31',
      status: 'completed',
      data_status: 'manual',
      started_at: now,
      completed_at: now,
      created_by: context.userEmail || 'owner',
      notes: 'Manual input via GAS UI: ' + type,
    }]);
    let sheetName = '';
    let row = null;
    let coaSuggestion = null;
    if ((type === 'pendapatan' || type === 'biaya') && !entry.accountId) {
      coaSuggestion = buildCoaSuggestion_(context, normalizeCoaCandidateInput_(Object.assign({}, entry, { type: type, transactionDate: date || period + '-01' })));
    }
    if (type === 'pendapatan') {
      sheetName = 'PENDAPATAN';
      row = {
        tenant_id: context.tenantId, clinic_id: context.clinicId, revenue_id: 'rev_' + importId, transaction_id: entry.transactionId || 'trx_' + importId,
        import_id: importId, source_row_id: 'manual_1', visit_id: '', doctor_id: normalizeDoctorId_(entry.doctor || ''), poli_id: normalizePoliId_(entry.poli || ''),
        transaction_date: date || period + '-01', revenue_type: entry.category || 'tindakan', item_code: '', item_name: entry.description || 'Pendapatan manual',
        quantity: asNumber_(entry.quantity, 1), unit_price: asNumber_(entry.unitPrice, asNumber_(entry.amount, 0)), gross_amount: asNumber_(entry.grossAmount, asNumber_(entry.unitPrice, asNumber_(entry.amount, 0)) * asNumber_(entry.quantity, 1)),
        discount_amount: asNumber_(entry.discountAmount, 0), net_amount: asNumber_(entry.amount, 0), paid_amount: asNumber_(entry.paidAmount, asNumber_(entry.amount, 0)),
        receivable_amount: asNumber_(entry.receivableAmount, 0), payment_method: entry.paymentMethod || '', payer_type: entry.payerType || '', cashier: '', status: 'paid', trace_status: 'manual_trace', created_at: now,
      };
    } else if (type === 'biaya') {
      sheetName = 'BIAYA';
      row = {
        tenant_id: context.tenantId, clinic_id: context.clinicId, expense_id: 'exp_' + importId, import_id: importId, source_row_id: 'manual_1',
        expense_date: date || period + '-01', expense_category: entry.category || (coaSuggestion && coaSuggestion.suggestedCategory) || 'operasional', expense_name: entry.description || 'Biaya manual', account_id: entry.accountId || (coaSuggestion && !coaSuggestion.needsReview ? coaSuggestion.suggestedAccountId : ''),
        amount: asNumber_(entry.amount, 0), payment_method: entry.paymentMethod || '', vendor_name: entry.vendor || '', related_visit_id: '', related_item_code: '',
        cost_type: entry.costType || 'operational', allocation_target: 'clinic', allocation_id: context.clinicId, status: 'paid', trace_status: 'manual_trace', created_at: now,
      };
    } else if (type === 'pajak') {
      sheetName = 'PAJAK';
      const payable = asNumber_(entry.taxPayable, asNumber_(entry.amount, 0));
      const paid = asNumber_(entry.taxPaid, 0);
      row = {
        tenant_id: context.tenantId, clinic_id: context.clinicId, tax_id: 'tax_' + importId, import_id: importId, tax_period: period,
        tax_type: entry.taxType || 'Pajak manual', taxable_revenue: asNumber_(entry.taxableRevenue, 0), non_taxable_revenue: asNumber_(entry.nonTaxableRevenue, 0),
        tax_base_amount: asNumber_(entry.taxBaseAmount, 0), tax_rate: asNumber_(entry.taxRate, 0), tax_payable: payable, tax_paid: paid,
        tax_outstanding: Math.max(0, payable - paid), document_status: entry.documentStatus || 'manual', risk_flag: entry.riskFlag || 'review_required',
        reconciliation_gap: asNumber_(entry.reconciliationGap, 0), notes: entry.notes || '', created_at: now, updated_at: now,
      };
    } else if (type === 'kunjungan') {
      sheetName = 'KUNJUNGAN';
      row = {
        tenant_id: context.tenantId, clinic_id: context.clinicId, visit_id: 'visit_' + importId, source_visit_id: '', import_id: importId, source_row_id: 'manual_1',
        visit_date: date || period + '-01', registration_time: entry.registrationTime || '', patient_ref: entry.patientRef || '', patient_type: entry.patientType || 'umum', payer_type: entry.payerType || '',
        doctor_id: normalizeDoctorId_(entry.doctor || ''), poli_id: normalizePoliId_(entry.poli || ''), service_category: entry.category || 'rawat_jalan', service_name: entry.description || 'Kunjungan manual',
        status: entry.status || 'registered', data_status: 'manual', created_at: now, updated_at: now,
      };
    } else {
      throw new Error('Jenis input tidak dikenal: ' + type);
    }
    appendObjects_(sheetName, [row]);
    if (coaSuggestion) saveCoaSuggestion_(context, normalizeCoaCandidateInput_(Object.assign({}, entry, { type: type, sourceId: row.revenue_id || row.expense_id || importId, transactionDate: date || period + '-01' })), coaSuggestion, 'manual_input');
    const computeResult = computePocKpisNoLock_(context.tenantId, context.clinicId, period);
    writeAudit_(context.userEmail || 'owner', 'owner', 'manual_input_' + type, sheetName, { importId, period, targetId: row.revenue_id || row.expense_id || row.tax_id || row.visit_id });
    return { ok: true, type, sheetName, importId, period, rowWritten: 1, coaSuggestion, compute: computeResult };
  });
}

function saveDefaultManualClinicEntry(entry) {
  const context = resolveRequestContext_({}, {}, 'finance');
  return saveManualClinicEntryForContext_(context, entry || {});
}

function getDefaultManualInputOptions() {
  const context = resolveRequestContext_({}, {}, 'finance');
  ensurePhase1WarehouseSheetsNoLock_();
  const active = row => String(row.status || 'active').toLowerCase() !== 'inactive';
  const doctors = getRowsAsObjects_('MASTER_DOKTER')
    .filter(row => inScope_(row, context.tenantId, context.clinicId) && active(row))
    .map(row => ({ value: row.doctor_id || normalizeDoctorId_(row.doctor_name), label: row.doctor_name || row.doctor_id, meta: row.specialty || '' }));
  const polis = getRowsAsObjects_('MASTER_POLI')
    .filter(row => inScope_(row, context.tenantId, context.clinicId) && active(row))
    .map(row => ({ value: row.poli_id || normalizePoliId_(row.poli_name), label: row.poli_name || row.poli_id }));
  const medicines = getRowsAsObjects_('MASTER_OBAT')
    .filter(row => inScope_(row, context.tenantId, context.clinicId) && active(row))
    .slice(0, 300)
    .map(row => ({ value: row.medicine_id || row.medicine_name, label: row.medicine_name || row.medicine_id, meta: row.unit || '' }));
  const coa = getRowsAsObjects_('MASTER_COA')
    .filter(row => row.tenant_id === context.tenantId && active(row))
    .map(row => ({ value: row.account_id || row.account_code, label: [row.account_code, row.account_name].filter(Boolean).join(' - '), meta: row.account_type || '' }));
  return {
    ok: true,
    doctors: doctors.length ? doctors : [{ value: 'doc_umum', label: 'Dokter Umum' }, { value: 'doc_gigi', label: 'Dokter Gigi' }],
    polis: polis.length ? polis : [{ value: 'poli_umum', label: 'Poli Umum' }, { value: 'poli_gigi', label: 'Poli Gigi' }, { value: 'poli_kia', label: 'KIA' }],
    medicines,
    coa,
    paymentMethods: [
      { value: 'cash', label: 'Tunai' }, { value: 'transfer', label: 'Transfer Bank' }, { value: 'qris', label: 'QRIS' },
      { value: 'debit', label: 'Kartu Debit' }, { value: 'credit_card', label: 'Kartu Kredit' }, { value: 'bpjs', label: 'BPJS' }, { value: 'insurance', label: 'Asuransi' }
    ],
    payerTypes: [
      { value: 'umum', label: 'Pasien Umum' }, { value: 'bpjs', label: 'BPJS' }, { value: 'asuransi', label: 'Asuransi' }, { value: 'perusahaan', label: 'Perusahaan' }
    ],
    revenueCategories: [
      { value: 'konsultasi', label: 'Konsultasi' }, { value: 'tindakan', label: 'Tindakan Medis' }, { value: 'obat', label: 'Obat / Farmasi' },
      { value: 'laboratorium', label: 'Laboratorium' }, { value: 'administrasi', label: 'Administrasi' }, { value: 'lainnya', label: 'Lainnya' }
    ],
    expenseCategories: [
      { value: 'gaji', label: 'Gaji & Honor' }, { value: 'sewa', label: 'Sewa' }, { value: 'obat_bmhp', label: 'Obat & BMHP' },
      { value: 'utilitas', label: 'Listrik, Air, Internet' }, { value: 'marketing', label: 'Marketing' }, { value: 'maintenance', label: 'Maintenance' },
      { value: 'administrasi', label: 'Administrasi' }, { value: 'operasional', label: 'Operasional Lainnya' }
    ],
    taxTypes: [
      { value: 'PPh Final UMKM', label: 'PPh Final UMKM' }, { value: 'PPh 21', label: 'PPh 21' }, { value: 'PPh 23', label: 'PPh 23' },
      { value: 'PPN Keluaran', label: 'PPN Keluaran' }, { value: 'PPN Masukan', label: 'PPN Masukan' }, { value: 'Pajak Daerah', label: 'Pajak Daerah' }, { value: 'Pajak manual', label: 'Pajak Lainnya' }
    ],
    visitCategories: [
      { value: 'rawat_jalan', label: 'Rawat Jalan / Registrasi' }, { value: 'kontrol', label: 'Kontrol' }, { value: 'screening', label: 'Screening / Pemeriksaan Awal' },
      { value: 'kia', label: 'KIA' }, { value: 'gigi', label: 'Gigi' }, { value: 'administrasi', label: 'Administrasi' }
    ]
  };
}

function getDefaultTransactionListPayload(type, period, limit) {
  const context = resolveRequestContext_({}, {}, 'finance');
  const resolvedPeriod = normalizeTransactionListPeriod_(period || getLatestAvailablePeriodForTransactions_(context) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM'));
  return getTransactionListPayloadForContext_(context, type || 'all', resolvedPeriod, limit || 100);
}

function getTransactionListPayloadForContext_(context, type, period, limit) {
  assertTenantScope_(context.tenantId, context.clinicId);
  const normalizedType = normalizeHeaderKey_(type || 'all');
  const normalizedPeriod = normalizeTransactionListPeriod_(period || getLatestAvailablePeriodForTransactions_(context) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM'));
  const maxRows = Math.max(1, Math.min(Number(limit || 100), 300));
  const rows = [];
  const include = name => normalizedType === 'all' || normalizedType === name;
  if (include('pendapatan')) {
    getRowsAsObjects_('PENDAPATAN').filter(row => transactionRowInScope_(row, context, row.transaction_date, normalizedPeriod)).forEach(row => rows.push({
      type: 'pendapatan', date: toIsoDateString_(row.transaction_date), category: row.revenue_type || '', description: row.item_name || '', amount: asNumber_(row.net_amount, 0),
      paymentMethod: row.payment_method || '', payerType: row.payer_type || '', doctor: row.doctor_id || '', poli: row.poli_id || '', status: row.status || '', importId: row.import_id || '', id: row.revenue_id || row.transaction_id || '', sourceSheet: 'PENDAPATAN', editable: isManualTransactionRow_(row)
    }));
  }
  if (include('biaya')) {
    getRowsAsObjects_('BIAYA').filter(row => transactionRowInScope_(row, context, row.expense_date, normalizedPeriod)).forEach(row => rows.push({
      type: 'biaya', date: toIsoDateString_(row.expense_date), category: row.expense_category || '', description: row.expense_name || '', amount: -Math.abs(asNumber_(row.amount, 0)),
      paymentMethod: row.payment_method || '', payerType: '', doctor: '', poli: '', status: row.status || '', importId: row.import_id || '', id: row.expense_id || '', accountId: row.account_id || '', costType: row.cost_type || '', sourceSheet: 'BIAYA', editable: isManualTransactionRow_(row)
    }));
  }
  if (include('pajak')) {
    getRowsAsObjects_('PAJAK').filter(row => transactionRowInScope_(row, context, row.tax_period, normalizedPeriod)).forEach(row => rows.push({
      type: 'pajak', date: String(row.tax_period || normalizedPeriod).slice(0, 7), category: row.tax_type || '', description: row.notes || row.document_status || 'Rekap pajak', amount: -Math.abs(asNumber_(row.tax_payable, 0)),
      paymentMethod: '', payerType: '', doctor: '', poli: '', status: row.document_status || '', importId: row.import_id || '', id: row.tax_id || '', sourceSheet: 'PAJAK', editable: isManualTransactionRow_(row)
    }));
  }
  if (include('kunjungan')) {
    getRowsAsObjects_('KUNJUNGAN').filter(row => transactionRowInScope_(row, context, row.visit_date, normalizedPeriod)).forEach(row => rows.push({
      type: 'kunjungan', date: toIsoDateString_(row.visit_date), category: row.service_category || '', description: row.service_name || '', amount: 0,
      paymentMethod: '', payerType: row.payer_type || row.patient_type || '', doctor: row.doctor_id || '', poli: row.poli_id || '', status: row.status || '', importId: row.import_id || '', id: row.visit_id || '', patientRef: row.patient_ref || '', sourceSheet: 'KUNJUNGAN', editable: isManualTransactionRow_(row)
    }));
  }
  rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.id || '').localeCompare(String(a.id || '')));
  return {
    ok: true,
    tenantId: context.tenantId,
    clinicId: context.clinicId,
    period: normalizedPeriod,
    type: normalizedType,
    count: Math.min(rows.length, maxRows),
    totalCount: rows.length,
    rows: rows.slice(0, maxRows),
    availablePeriods: getAvailableTransactionPeriodsForContext_(context).slice(-18),
    generatedAt: Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
  };
}

function updateDefaultTransactionEntry(transaction) {
  const context = resolveRequestContext_({}, {}, 'finance');
  return updateTransactionEntryForContext_(context, transaction || {});
}

function deleteDefaultTransactionEntry(type, id) {
  const context = resolveRequestContext_({}, {}, 'finance');
  return deleteTransactionEntryForContext_(context, type, id);
}

function updateTransactionEntryForContext_(context, transaction) {
  assertTenantScope_(context.tenantId, context.clinicId);
  const type = normalizeHeaderKey_(transaction.type || '');
  const id = String(transaction.id || '').trim();
  const config = getTransactionMutationConfig_(type);
  if (!config || !id) throw new Error('TRANSACTION_UPDATE_INVALID: jenis/id transaksi tidak valid.');
  let updated = null;
  return withTenantClinicLock_('update_transaction_entry', context.tenantId, context.clinicId, function() {
    updateObjectsWhere_(config.sheet, function(row) { return rowMatchesTransactionId_(row, config.idFields, id) && inScope_(row, context.tenantId, context.clinicId); }, function(row) {
      if (!isManualTransactionRow_(row)) throw new Error('TRANSACTION_IMMUTABLE: transaksi hasil import/SIM tidak boleh diedit langsung. Buat koreksi/reversal.');
      const next = applyTransactionPatch_(type, row, transaction);
      updated = next;
      return next;
    });
    if (!updated) throw new Error('TRANSACTION_NOT_FOUND: transaksi tidak ditemukan.');
    const period = getTransactionPeriodFromRow_(type, updated);
    computePocKpisNoLock_(context.tenantId, context.clinicId, period);
    invalidateDashboardCache_(context.tenantId, context.clinicId);
    writeAudit_(context.userEmail || 'owner', 'owner', 'transaction_update', config.sheet, { targetId: id, period: period, type: type });
    return { ok: true, action: 'updated', type: type, id: id, period: period, row: updated };
  });
}

function deleteTransactionEntryForContext_(context, type, id) {
  assertTenantScope_(context.tenantId, context.clinicId);
  const normalizedType = normalizeHeaderKey_(type || '');
  const config = getTransactionMutationConfig_(normalizedType);
  const targetId = String(id || '').trim();
  if (!config || !targetId) throw new Error('TRANSACTION_DELETE_INVALID: jenis/id transaksi tidak valid.');
  let removed = null;
  return withTenantClinicLock_('delete_transaction_entry', context.tenantId, context.clinicId, function() {
    const rows = getRowsAsObjects_(config.sheet);
    const kept = [];
    rows.forEach(function(row) {
      const match = rowMatchesTransactionId_(row, config.idFields, targetId) && inScope_(row, context.tenantId, context.clinicId);
      if (!match) { kept.push(row); return; }
      if (!isManualTransactionRow_(row)) throw new Error('TRANSACTION_IMMUTABLE: transaksi hasil import/SIM tidak boleh dihapus langsung. Buat koreksi/reversal.');
      removed = row;
    });
    if (!removed) throw new Error('TRANSACTION_NOT_FOUND: transaksi tidak ditemukan.');
    replaceObjects_(config.sheet, kept);
    const period = getTransactionPeriodFromRow_(normalizedType, removed);
    computePocKpisNoLock_(context.tenantId, context.clinicId, period);
    invalidateDashboardCache_(context.tenantId, context.clinicId);
    writeAudit_(context.userEmail || 'owner', 'owner', 'transaction_delete', config.sheet, { targetId: targetId, period: period, type: normalizedType });
    return { ok: true, action: 'deleted', type: normalizedType, id: targetId, period: period };
  });
}

function getTransactionMutationConfig_(type) {
  return {
    pendapatan: { sheet: 'PENDAPATAN', idFields: ['revenue_id', 'transaction_id'] },
    biaya: { sheet: 'BIAYA', idFields: ['expense_id'] },
    pajak: { sheet: 'PAJAK', idFields: ['tax_id'] },
    kunjungan: { sheet: 'KUNJUNGAN', idFields: ['visit_id'] },
  }[type] || null;
}

function rowMatchesTransactionId_(row, idFields, id) {
  return (idFields || []).some(function(field) { return String(row[field] || '') === String(id || ''); });
}

function isManualTransactionRow_(row) {
  return String(row.import_id || '').indexOf('manual_') === 0 || String(row.source_row_id || '').indexOf('manual_') === 0;
}

function applyTransactionPatch_(type, row, patch) {
  const next = Object.assign({}, row);
  const now = new Date();
  const description = String(patch.description || '').trim();
  const category = String(patch.category || '').trim();
  const status = String(patch.status || '').trim();
  const paymentMethod = String(patch.paymentMethod || '').trim();
  const amount = patch.amount === undefined || patch.amount === '' ? null : Math.abs(asNumber_(patch.amount, 0));
  const date = String(patch.date || '').trim();
  if (type === 'pendapatan') {
    if (date) next.transaction_date = date;
    if (category) next.revenue_type = category;
    if (description) next.item_name = description;
    if (amount !== null) { next.net_amount = amount; next.gross_amount = amount; next.paid_amount = amount; }
    if (paymentMethod) next.payment_method = paymentMethod;
    if (status) next.status = status;
  } else if (type === 'biaya') {
    if (date) next.expense_date = date;
    if (category) next.expense_category = category;
    if (description) next.expense_name = description;
    if (amount !== null) next.amount = amount;
    if (paymentMethod) next.payment_method = paymentMethod;
    if (String(patch.vendor || '').trim()) next.vendor_name = String(patch.vendor || '').trim();
    if (String(patch.accountId || '').trim()) next.account_id = String(patch.accountId || '').trim();
    if (String(patch.costType || '').trim()) next.cost_type = String(patch.costType || '').trim();
    if (status) next.status = status;
  } else if (type === 'pajak') {
    if (date) next.tax_period = String(date).slice(0, 7);
    if (category) next.tax_type = category;
    if (description) next.notes = description;
    if (amount !== null) next.tax_payable = amount;
    if (status) next.document_status = status;
  } else if (type === 'kunjungan') {
    if (date) next.visit_date = date;
    if (category) next.service_category = category;
    if (description) next.service_name = description;
    if (String(patch.doctor || '').trim()) next.doctor_id = String(patch.doctor || '').trim();
    if (String(patch.poli || '').trim()) next.poli_id = String(patch.poli || '').trim();
    if (status) next.status = status;
  }
  next.updated_at = now;
  return next;
}

function getTransactionPeriodFromRow_(type, row) {
  if (type === 'pendapatan') return toPeriodString_(row.transaction_date);
  if (type === 'biaya') return toPeriodString_(row.expense_date);
  if (type === 'pajak') return toPeriodString_(row.tax_period);
  if (type === 'kunjungan') return toPeriodString_(row.visit_date);
  return Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM');
}

function normalizeTransactionListPeriod_(period) {
  const text = String(period || '').trim();
  if (/^\d{4}-\d{2}$/.test(text)) return text;
  return toPeriodString_(text) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM');
}

function getLatestAvailablePeriodForTransactions_(context) {
  const periods = getAvailableTransactionPeriodsForContext_(context);
  return periods.length ? periods[periods.length - 1] : '';
}

function getAvailableTransactionPeriodsForContext_(context) {
  const values = [];
  getRowsAsObjects_('PENDAPATAN').filter(row => inScope_(row, context.tenantId, context.clinicId)).forEach(row => values.push(toPeriodString_(row.transaction_date)));
  getRowsAsObjects_('BIAYA').filter(row => inScope_(row, context.tenantId, context.clinicId)).forEach(row => values.push(toPeriodString_(row.expense_date)));
  getRowsAsObjects_('PAJAK').filter(row => inScope_(row, context.tenantId, context.clinicId)).forEach(row => values.push(toPeriodString_(row.tax_period)));
  getRowsAsObjects_('KUNJUNGAN').filter(row => inScope_(row, context.tenantId, context.clinicId)).forEach(row => values.push(toPeriodString_(row.visit_date)));
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function transactionRowInScope_(row, context, dateValue, period) {
  return row && row.tenant_id === context.tenantId && row.clinic_id === context.clinicId && toPeriodString_(dateValue) === String(period || '').slice(0, 7);
}
