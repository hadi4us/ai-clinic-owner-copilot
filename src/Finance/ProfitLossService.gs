/**
 * ProfitLossService.gs
 *
 * Builds Laporan Laba Rugi from Buku Besar / journal-derived account balances.
 */
function getProfitLossStatement(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  const ledger = getGeneralLedger(tenantId, clinicId, period).data || [];

  const revenueAccounts = filterAccountsByType_(ledger, ['revenue', 'income']);
  const directCostAccounts = filterAccountsByCategoryOrType_(ledger, ['direct_cost', 'cogs'], ['cost_of_goods_sold', 'direct_cost', 'cogs']);
  const expenseAccounts = filterAccountsByType_(ledger, ['expense', 'operating_expense']);

  const totalRevenue = sumAccountBalances_(revenueAccounts);
  const directCost = sumAccountBalances_(directCostAccounts);
  const operatingExpense = sumAccountBalances_(expenseAccounts);
  const grossProfit = totalRevenue - directCost;
  const netProfit = grossProfit - operatingExpense;
  const profitMargin = totalRevenue === 0 ? null : netProfit / totalRevenue;

  const data = {
    tenant_id: tenantId,
    clinic_id: clinicId,
    period: period || '',
    revenue: buildStatementSection_('Revenue', revenueAccounts),
    direct_cost: buildStatementSection_('Direct Cost', directCostAccounts),
    operating_expense: buildStatementSection_('Operating Expense', expenseAccounts),
    total_revenue: totalRevenue,
    direct_cost_total: directCost,
    gross_profit: grossProfit,
    operating_expense_total: operatingExpense,
    net_profit: netProfit,
    profit_margin: profitMargin,
  };

  const summary = {
    total_revenue: totalRevenue,
    gross_profit: grossProfit,
    net_profit: netProfit,
    profit_margin: profitMargin,
    data_status: totalRevenue !== 0 ? DATA_STATUS.COMPLETE : DATA_STATUS.INCOMPLETE,
    trace_status: ledger.length > 0 ? TRACE_STATUS.TRACEABLE : TRACE_STATUS.NOT_APPLICABLE,
  };
  return buildFinanceReportResponse_('Laporan Laba Rugi', tenantId, clinicId, period, data, summary);
}
