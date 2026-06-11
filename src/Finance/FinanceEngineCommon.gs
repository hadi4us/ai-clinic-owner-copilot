/**
 * FinanceEngineCommon.gs
 *
 * Shared helpers for spreadsheet-backed Finance Engine services.
 */
function readFinanceSheetRows_(sheetName, tenantId, clinicId) {
  const session = getCurrentSession();
  const options = clinicId ? { clinicId: clinicId } : {};
  if (typeof readWarehouseRows_ === 'function') {
    try {
      return readWarehouseRows_(session, sheetName, options).filter(function (row) {
        return row.tenant_id === tenantId && (!clinicId || !row.clinic_id || row.clinic_id === clinicId);
      });
    } catch (err) {
      // Fallback to legacy lowercase sheet repository if canonical DW schema does not include the sheet.
    }
  }
  const sheet = openWarehouseSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) return [];
  return readSheetAsObjects_(sheet).filter(function (row) {
    return row.tenant_id === tenantId && (!clinicId || !row.clinic_id || row.clinic_id === clinicId);
  });
}

function getChartOfAccountsById_(tenantId) {
  const rows = readFinanceSheetRows_(SHEET_NAME.CFG_COA, tenantId, '');
  return rows.reduce(function (acc, row) {
    acc[row.coa_id] = row;
    return acc;
  }, {});
}

function groupRowsBy_(rows, key) {
  return (rows || []).reduce(function (acc, row) {
    const value = row[key] || '';
    if (!acc[value]) acc[value] = [];
    acc[value].push(row);
    return acc;
  }, {});
}

function sumField_(rows, fieldName) {
  return (rows || []).reduce(function (total, row) {
    return total + asNumber_(row[fieldName], 0);
  }, 0);
}

function calculateAccountBalance_(totalDebit, totalCredit, normalBalance) {
  if (normalBalance === 'credit') return asNumber_(totalCredit, 0) - asNumber_(totalDebit, 0);
  return asNumber_(totalDebit, 0) - asNumber_(totalCredit, 0);
}

function inferNormalBalance_(coaType) {
  const type = String(coaType || '').toLowerCase();
  if (type === 'revenue' || type === 'income' || type === 'liability' || type === 'equity') return 'credit';
  return 'debit';
}

function buildFinanceReportResponse_(reportName, tenantId, clinicId, period, data, summary) {
  return {
    ok: true,
    report_name: reportName,
    tenant_id: tenantId,
    clinic_id: clinicId,
    period: period || '',
    generated_at: nowIso_(),
    data_status: summary && summary.data_status ? summary.data_status : DATA_STATUS.INCOMPLETE,
    trace_status: summary && summary.trace_status ? summary.trace_status : TRACE_STATUS.NOT_APPLICABLE,
    summary: summary || {},
    data: data,
    caveat: buildFinanceCaveat_(summary || {}),
  };
}

function buildFinanceCaveat_(summary) {
  if (summary.data_status === DATA_STATUS.COMPLETE && summary.trace_status === TRACE_STATUS.TRACEABLE) {
    return 'Angka berasal dari jurnal dan buku besar yang traceable untuk kebutuhan management reporting.';
  }
  return 'Angka belum boleh dianggap final karena data_status/trace_status belum complete dan traceable.';
}

function filterAccountsByType_(accounts, types) {
  const allowed = (types || []).map(function (type) { return String(type).toLowerCase(); });
  return (accounts || []).filter(function (account) {
    return allowed.indexOf(String(account.coa_type || '').toLowerCase()) !== -1;
  });
}

function filterAccountsByCategoryOrType_(accounts, categories, types) {
  const allowedCategories = (categories || []).map(function (category) { return String(category).toLowerCase(); });
  const allowedTypes = (types || []).map(function (type) { return String(type).toLowerCase(); });
  return (accounts || []).filter(function (account) {
    return allowedCategories.indexOf(String(account.category || '').toLowerCase()) !== -1 || allowedTypes.indexOf(String(account.coa_type || '').toLowerCase()) !== -1;
  });
}

function sumAccountBalances_(accounts) {
  return (accounts || []).reduce(function (total, account) {
    return total + Math.abs(asNumber_(account.ending_balance, 0));
  }, 0);
}

function buildStatementSection_(label, accounts) {
  const rows = (accounts || []).map(function (account) {
    return {
      coa_id: account.coa_id,
      coa_code: account.coa_code,
      coa_name: account.coa_name,
      amount: Math.abs(asNumber_(account.ending_balance, 0)),
    };
  });
  return { label: label, rows: rows, total: sumField_(rows, 'amount') };
}

function buildBalanceSheetSection_(label, trialBalanceRows, coaTypes) {
  const allowed = (coaTypes || []).map(function (type) { return String(type).toLowerCase(); });
  const accounts = (trialBalanceRows || []).filter(function (row) {
    return allowed.indexOf(String(row.coa_type || '').toLowerCase()) !== -1;
  }).map(function (row) {
    return {
      coa_id: row.coa_id,
      coa_code: row.coa_code,
      coa_name: row.coa_name,
      amount: Math.max(asNumber_(row.debit_balance, 0), asNumber_(row.credit_balance, 0)),
    };
  });
  return { label: label, accounts: accounts, total: sumField_(accounts, 'amount') };
}
