/**
 * CashflowService.gs
 *
 * Builds Arus Kas from journal-derived cash/bank account movements.
 */
function getCashflowStatement(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  const journal = getGeneralJournal(tenantId, clinicId, period).data || [];
  const coaById = getChartOfAccountsById_(tenantId);
  const rows = [];

  journal.forEach(function (entry) {
    (entry.lines || []).forEach(function (line) {
      const coa = coaById[line.coa_id] || {};
      if (isCashAccount_(coa, line)) {
        const inflow = asNumber_(line.debit, 0);
        const outflow = asNumber_(line.credit, 0);
        rows.push({
          tenant_id: tenantId,
          clinic_id: clinicId,
          period: entry.period,
          entry_date: entry.entry_date,
          journal_entry_id: entry.journal_entry_id,
          coa_id: line.coa_id,
          coa_code: line.coa_code,
          coa_name: line.coa_name,
          activity_type: classifyCashflowActivity_(entry, line, coa),
          description: entry.description,
          cash_inflow: inflow,
          cash_outflow: outflow,
          net_cashflow: inflow - outflow,
        });
      }
    });
  });

  const operating = filterCashflowByActivity_(rows, 'operating');
  const investing = filterCashflowByActivity_(rows, 'investing');
  const financing = filterCashflowByActivity_(rows, 'financing');
  const data = {
    tenant_id: tenantId,
    clinic_id: clinicId,
    period: period || '',
    operating: buildCashflowSection_('Operating Activities', operating),
    investing: buildCashflowSection_('Investing Activities', investing),
    financing: buildCashflowSection_('Financing Activities', financing),
    net_cashflow: sumField_(rows, 'net_cashflow'),
    rows: rows,
  };
  const summary = {
    cash_inflow: sumField_(rows, 'cash_inflow'),
    cash_outflow: sumField_(rows, 'cash_outflow'),
    net_cashflow: sumField_(rows, 'net_cashflow'),
    data_status: rows.length > 0 ? DATA_STATUS.COMPLETE : DATA_STATUS.INCOMPLETE,
    trace_status: journal.length > 0 ? TRACE_STATUS.TRACEABLE : TRACE_STATUS.NOT_APPLICABLE,
  };
  return buildFinanceReportResponse_('Arus Kas', tenantId, clinicId, period, data, summary);
}

function isCashAccount_(coa, line) {
  const text = [coa.coa_id, coa.coa_code, coa.coa_name, line.coa_id, line.coa_name].join(' ').toLowerCase();
  return text.indexOf('cash') !== -1 || text.indexOf('kas') !== -1 || text.indexOf('bank') !== -1 || text.indexOf('receivable') !== -1 || text.indexOf('payable') !== -1;
}

function classifyCashflowActivity_(entry, line, coa) {
  const text = [entry.source_type, entry.description, coa.category, coa.coa_type, line.coa_name].join(' ').toLowerCase();
  if (text.indexOf('asset purchase') !== -1 || text.indexOf('investment') !== -1 || text.indexOf('investing') !== -1) return 'investing';
  if (text.indexOf('loan') !== -1 || text.indexOf('capital') !== -1 || text.indexOf('equity') !== -1 || text.indexOf('financing') !== -1) return 'financing';
  return 'operating';
}

function filterCashflowByActivity_(rows, activityType) {
  return (rows || []).filter(function (row) { return row.activity_type === activityType; });
}

function buildCashflowSection_(label, rows) {
  return {
    label: label,
    rows: rows || [],
    cash_inflow: sumField_(rows || [], 'cash_inflow'),
    cash_outflow: sumField_(rows || [], 'cash_outflow'),
    net_cashflow: sumField_(rows || [], 'net_cashflow'),
  };
}
