/**
 * JournalService.gs
 *
 * Spreadsheet-backed journal service for Finance Engine.
 * Source tables: journal_entry, journal_line, cfg_coa.
 */
function getGeneralJournal(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  const session = getCurrentSession();
  requireClinicAccess_(session, clinicId);

  const entries = readFinanceSheetRows_(SHEET_NAME.JOURNAL_ENTRY, tenantId, clinicId)
    .filter(function (entry) { return !period || entry.period === period; });
  const lines = readFinanceSheetRows_(SHEET_NAME.JOURNAL_LINE, tenantId, clinicId);
  const coaById = getChartOfAccountsById_(tenantId);
  const linesByEntryId = groupRowsBy_(lines, 'journal_entry_id');

  const journal = entries.map(function (entry) {
    const entryLines = (linesByEntryId[entry.journal_entry_id] || []).map(function (line) {
      const coa = coaById[line.coa_id] || {};
      return {
        tenant_id: line.tenant_id,
        clinic_id: line.clinic_id,
        journal_line_id: line.journal_line_id,
        journal_entry_id: line.journal_entry_id,
        coa_id: line.coa_id,
        coa_code: coa.coa_code || '',
        coa_name: coa.coa_name || line.coa_id,
        coa_type: coa.coa_type || '',
        debit: asNumber_(line.debit, 0),
        credit: asNumber_(line.credit, 0),
        line_memo: line.line_memo || '',
      };
    });
    const totalDebit = sumField_(entryLines, 'debit');
    const totalCredit = sumField_(entryLines, 'credit');
    return {
      tenant_id: entry.tenant_id,
      clinic_id: entry.clinic_id,
      journal_entry_id: entry.journal_entry_id,
      period: entry.period,
      entry_date: toIsoDateString_(entry.entry_date),
      source_type: entry.source_type || '',
      source_id: entry.source_id || '',
      source_row_id: entry.source_row_id || '',
      sync_id: entry.sync_id || '',
      description: entry.description || '',
      entry_status: entry.entry_status || '',
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: totalDebit === totalCredit,
      lines: entryLines,
    };
  });

  const summary = summarizeJournal_(journal);
  return buildFinanceReportResponse_('Jurnal Umum', tenantId, clinicId, period, journal, summary);
}

function summarizeJournal_(journal) {
  const entries = journal || [];
  const totalDebit = entries.reduce(function (total, entry) { return total + asNumber_(entry.total_debit, 0); }, 0);
  const totalCredit = entries.reduce(function (total, entry) { return total + asNumber_(entry.total_credit, 0); }, 0);
  return {
    entry_count: entries.length,
    total_debit: totalDebit,
    total_credit: totalCredit,
    is_balanced: totalDebit === totalCredit,
    data_status: entries.length > 0 && totalDebit === totalCredit ? DATA_STATUS.COMPLETE : DATA_STATUS.INCOMPLETE,
    trace_status: entries.length > 0 ? TRACE_STATUS.TRACEABLE : TRACE_STATUS.NOT_APPLICABLE,
  };
}

function assertJournalBalanced_(journalResponse) {
  const summary = journalResponse && journalResponse.summary ? journalResponse.summary : {};
  if (summary.total_debit !== summary.total_credit) {
    throw new Error('Journal is not balanced. debit=' + summary.total_debit + ', credit=' + summary.total_credit);
  }
  return true;
}
