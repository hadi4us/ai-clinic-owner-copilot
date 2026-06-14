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
        expense_date: date || period + '-01', expense_category: entry.category || 'operasional', expense_name: entry.description || 'Biaya manual', account_id: entry.accountId || '',
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
    const computeResult = computePocKpisNoLock_(context.tenantId, context.clinicId, period);
    writeAudit_(context.userEmail || 'owner', 'owner', 'manual_input_' + type, sheetName, { importId, period, targetId: row.revenue_id || row.expense_id || row.tax_id || row.visit_id });
    return { ok: true, type, sheetName, importId, period, rowWritten: 1, compute: computeResult };
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
  return getTransactionListPayloadForContext_(context, type || 'all', period || getLatestAvailablePeriodForContext_(context) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM'), limit || 100);
}

function getTransactionListPayloadForContext_(context, type, period, limit) {
  assertTenantScope_(context.tenantId, context.clinicId);
  const normalizedType = normalizeHeaderKey_(type || 'all');
  const normalizedPeriod = String(period || '').slice(0, 7) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM');
  const maxRows = Math.max(1, Math.min(Number(limit || 100), 300));
  const rows = [];
  const include = name => normalizedType === 'all' || normalizedType === name;
  if (include('pendapatan')) {
    getRowsAsObjects_('PENDAPATAN').filter(row => transactionRowInScope_(row, context, row.transaction_date, normalizedPeriod)).forEach(row => rows.push({
      type: 'pendapatan', date: toIsoDateString_(row.transaction_date), category: row.revenue_type || '', description: row.item_name || '', amount: asNumber_(row.net_amount, 0),
      paymentMethod: row.payment_method || '', payerType: row.payer_type || '', doctor: row.doctor_id || '', poli: row.poli_id || '', status: row.status || '', importId: row.import_id || '', id: row.revenue_id || row.transaction_id || ''
    }));
  }
  if (include('biaya')) {
    getRowsAsObjects_('BIAYA').filter(row => transactionRowInScope_(row, context, row.expense_date, normalizedPeriod)).forEach(row => rows.push({
      type: 'biaya', date: toIsoDateString_(row.expense_date), category: row.expense_category || '', description: row.expense_name || '', amount: -Math.abs(asNumber_(row.amount, 0)),
      paymentMethod: row.payment_method || '', payerType: '', doctor: '', poli: '', status: row.status || '', importId: row.import_id || '', id: row.expense_id || ''
    }));
  }
  if (include('pajak')) {
    getRowsAsObjects_('PAJAK').filter(row => transactionRowInScope_(row, context, row.tax_period, normalizedPeriod)).forEach(row => rows.push({
      type: 'pajak', date: String(row.tax_period || normalizedPeriod).slice(0, 7), category: row.tax_type || '', description: row.notes || row.document_status || 'Rekap pajak', amount: -Math.abs(asNumber_(row.tax_payable, 0)),
      paymentMethod: '', payerType: '', doctor: '', poli: '', status: row.document_status || '', importId: row.import_id || '', id: row.tax_id || ''
    }));
  }
  if (include('kunjungan')) {
    getRowsAsObjects_('KUNJUNGAN').filter(row => transactionRowInScope_(row, context, row.visit_date, normalizedPeriod)).forEach(row => rows.push({
      type: 'kunjungan', date: toIsoDateString_(row.visit_date), category: row.service_category || '', description: row.service_name || '', amount: 0,
      paymentMethod: '', payerType: row.payer_type || row.patient_type || '', doctor: row.doctor_id || '', poli: row.poli_id || '', status: row.status || '', importId: row.import_id || '', id: row.visit_id || '', patientRef: row.patient_ref || ''
    }));
  }
  rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.id || '').localeCompare(String(a.id || '')));
  return { ok: true, tenantId: context.tenantId, clinicId: context.clinicId, period: normalizedPeriod, type: normalizedType, count: Math.min(rows.length, maxRows), totalCount: rows.length, rows: rows.slice(0, maxRows), generatedAt: new Date() };
}

function transactionRowInScope_(row, context, dateValue, period) {
  return row && row.tenant_id === context.tenantId && row.clinic_id === context.clinicId && toPeriodString_(dateValue) === String(period || '').slice(0, 7);
}
