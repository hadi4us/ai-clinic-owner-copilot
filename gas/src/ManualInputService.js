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
        quantity: asNumber_(entry.quantity, 1), unit_price: asNumber_(entry.unitPrice, asNumber_(entry.amount, 0)), gross_amount: asNumber_(entry.grossAmount, asNumber_(entry.amount, 0)),
        discount_amount: asNumber_(entry.discountAmount, 0), net_amount: asNumber_(entry.amount, 0), paid_amount: asNumber_(entry.paidAmount, asNumber_(entry.amount, 0)),
        receivable_amount: asNumber_(entry.receivableAmount, 0), payment_method: entry.paymentMethod || '', payer_type: entry.payerType || '', cashier: '', status: 'paid', trace_status: 'manual_trace', created_at: now,
      };
    } else if (type === 'biaya') {
      sheetName = 'BIAYA';
      row = {
        tenant_id: context.tenantId, clinic_id: context.clinicId, expense_id: 'exp_' + importId, import_id: importId, source_row_id: 'manual_1',
        expense_date: date || period + '-01', expense_category: entry.category || 'operasional', expense_name: entry.description || 'Biaya manual', account_id: '',
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
        visit_date: date || period + '-01', registration_time: '', patient_ref: entry.patientRef || '', patient_type: entry.patientType || 'umum', payer_type: entry.payerType || '',
        doctor_id: normalizeDoctorId_(entry.doctor || ''), poli_id: normalizePoliId_(entry.poli || ''), service_category: entry.category || 'rawat_jalan', service_name: entry.description || 'Kunjungan manual',
        status: 'completed', data_status: 'manual', created_at: now, updated_at: now,
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
  const context = resolveRequestContext_({}, {}, 'owner');
  return saveManualClinicEntryForContext_(context, entry || {});
}
