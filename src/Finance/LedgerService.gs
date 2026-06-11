/**
 * LedgerService.gs
 *
 * Builds Buku Besar and Neraca Saldo from journal lines.
 */
function getGeneralLedger(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  const journal = getGeneralJournal(tenantId, clinicId, period);
  const accounts = {};

  (journal.data || []).forEach(function (entry) {
    (entry.lines || []).forEach(function (line) {
      const key = line.coa_id;
      if (!accounts[key]) {
        accounts[key] = {
          tenant_id: tenantId,
          clinic_id: clinicId,
          coa_id: line.coa_id,
          coa_code: line.coa_code,
          coa_name: line.coa_name,
          coa_type: line.coa_type,
          entries: [],
          total_debit: 0,
          total_credit: 0,
          ending_balance: 0,
        };
      }
      accounts[key].entries.push({
        entry_date: entry.entry_date,
        period: entry.period,
        journal_entry_id: entry.journal_entry_id,
        journal_line_id: line.journal_line_id,
        description: entry.description,
        debit: line.debit,
        credit: line.credit,
        source_type: entry.source_type,
        source_id: entry.source_id,
      });
      accounts[key].total_debit += asNumber_(line.debit, 0);
      accounts[key].total_credit += asNumber_(line.credit, 0);
    });
  });

  const coaById = getChartOfAccountsById_(tenantId);
  const ledger = Object.keys(accounts).sort().map(function (coaId) {
    const account = accounts[coaId];
    const coa = coaById[coaId] || {};
    account.coa_type = account.coa_type || coa.coa_type || '';
    account.category = coa.category || '';
    account.normal_balance = coa.normal_balance || inferNormalBalance_(account.coa_type);
    account.ending_balance = calculateAccountBalance_(account.total_debit, account.total_credit, account.normal_balance);
    return account;
  });

  const summary = {
    account_count: ledger.length,
    total_debit: sumField_(ledger, 'total_debit'),
    total_credit: sumField_(ledger, 'total_credit'),
    is_balanced: sumField_(ledger, 'total_debit') === sumField_(ledger, 'total_credit'),
    data_status: ledger.length > 0 ? DATA_STATUS.COMPLETE : DATA_STATUS.INCOMPLETE,
    trace_status: ledger.length > 0 ? TRACE_STATUS.TRACEABLE : TRACE_STATUS.NOT_APPLICABLE,
  };
  return buildFinanceReportResponse_('Buku Besar', tenantId, clinicId, period, ledger, summary);
}

function getTrialBalance(tenantId, clinicId, period) {
  const ledger = getGeneralLedger(tenantId, clinicId, period);
  const rows = (ledger.data || []).map(function (account) {
    const normal = account.normal_balance || inferNormalBalance_(account.coa_type);
    const balance = account.ending_balance;
    return {
      tenant_id: tenantId,
      clinic_id: clinicId,
      period: period || '',
      coa_id: account.coa_id,
      coa_code: account.coa_code,
      coa_name: account.coa_name,
      coa_type: account.coa_type,
      normal_balance: normal,
      category: account.category || '',
      debit_balance: normal === 'debit' ? balance : 0,
      credit_balance: normal === 'credit' ? balance : 0,
      total_debit: account.total_debit,
      total_credit: account.total_credit,
    };
  });

  const totalDebitBalance = sumField_(rows, 'debit_balance');
  const totalCreditBalance = sumField_(rows, 'credit_balance');
  const summary = {
    account_count: rows.length,
    total_debit_balance: totalDebitBalance,
    total_credit_balance: totalCreditBalance,
    is_balanced: totalDebitBalance === totalCreditBalance,
    data_status: rows.length > 0 && totalDebitBalance === totalCreditBalance ? DATA_STATUS.COMPLETE : DATA_STATUS.INCOMPLETE,
    trace_status: rows.length > 0 ? TRACE_STATUS.TRACEABLE : TRACE_STATUS.NOT_APPLICABLE,
  };
  return buildFinanceReportResponse_('Neraca Saldo', tenantId, clinicId, period, rows, summary);
}
