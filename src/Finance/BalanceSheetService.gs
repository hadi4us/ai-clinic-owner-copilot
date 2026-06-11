/**
 * BalanceSheetService.gs
 *
 * Builds Neraca from trial-balance account balances.
 */
function getBalanceSheet(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  const trialBalance = getTrialBalance(tenantId, clinicId, period).data || [];

  const assets = buildBalanceSheetSection_('Asset', trialBalance, ['asset', 'assets']);
  const liabilities = buildBalanceSheetSection_('Liability', trialBalance, ['liability', 'liabilities']);
  const equity = buildBalanceSheetSection_('Equity', trialBalance, ['equity']);
  const profitLoss = getProfitLossStatement(tenantId, clinicId, period).summary || {};
  const retainedEarnings = asNumber_(profitLoss.net_profit, 0);
  const equityWithCurrentProfit = equity.total + retainedEarnings;
  const totalLiabilityEquity = liabilities.total + equityWithCurrentProfit;

  const data = {
    tenant_id: tenantId,
    clinic_id: clinicId,
    period: period || '',
    assets: assets,
    liabilities: liabilities,
    equity: {
      label: equity.label,
      accounts: equity.accounts,
      total: equity.total,
      current_period_profit: retainedEarnings,
      total_with_current_period_profit: equityWithCurrentProfit,
    },
    total_assets: assets.total,
    total_liabilities: liabilities.total,
    total_equity: equityWithCurrentProfit,
    total_liabilities_and_equity: totalLiabilityEquity,
    is_balanced: assets.total === totalLiabilityEquity,
  };

  const summary = {
    total_assets: assets.total,
    total_liabilities: liabilities.total,
    total_equity: equityWithCurrentProfit,
    total_liabilities_and_equity: totalLiabilityEquity,
    is_balanced: data.is_balanced,
    data_status: data.is_balanced ? DATA_STATUS.COMPLETE : DATA_STATUS.ESTIMATED,
    trace_status: trialBalance.length > 0 ? TRACE_STATUS.TRACEABLE : TRACE_STATUS.NOT_APPLICABLE,
  };
  return buildFinanceReportResponse_('Neraca', tenantId, clinicId, period, data, summary);
}
