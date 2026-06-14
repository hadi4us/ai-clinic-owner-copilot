/**
 * COA Assistant MVP.
 * Deterministic, AI-ready classifier that suggests clinic COA accounts and records reviewable decisions.
 * No external AI call here; future LLM output must pass through this same suggestion/review shape.
 */
const COA_REVIEW_THRESHOLD = 0.75;
const COA_AUTO_APPLY_THRESHOLD = 0.88;

function suggestCoaForDefaultContext(entry) {
  const context = resolveRequestContext_({}, {}, 'finance');
  return suggestCoaForContext_(context, entry || {});
}

function previewDefaultCoaSuggestion(entry) {
  const context = resolveRequestContext_({}, {}, 'finance');
  return suggestCoaForContext_(context, entry || {}, { persist: false });
}

function suggestCoaForContext_(context, entry, options) {
  assertTenantScope_(context.tenantId, context.clinicId);
  ensurePhase1WarehouseSheetsNoLock_();
  const normalized = normalizeCoaCandidateInput_(entry || {});
  const suggestion = buildCoaSuggestion_(context, normalized);
  if (options && options.persist === false) return Object.assign({ ok: true, persisted: false }, suggestion);
  const saved = saveCoaSuggestion_(context, normalized, suggestion, 'manual_preview');
  return Object.assign({ ok: true, persisted: true }, suggestion, { suggestionId: saved.suggestion_id, reviewStatus: saved.review_status });
}

function buildCoaSuggestion_(context, normalized) {
  const accounts = getActiveCoaAccounts_(context.tenantId);
  const rules = getCoaMappingRules_(context).concat(getDefaultCoaMappingRules_());
  const scored = rules
    .map(rule => scoreCoaRule_(rule, normalized, accounts))
    .filter(match => match.score > 0 && match.account)
    .sort((a, b) => b.score - a.score || Number(b.rule.priority || 0) - Number(a.rule.priority || 0));

  if (scored.length) return formatCoaSuggestion_(scored[0], normalized, false);

  const fallbackRule = getFallbackCoaRule_(normalized.transactionType);
  const fallbackAccount = findCoaAccount_(accounts, fallbackRule.suggested_account_id);
  return formatCoaSuggestion_({ rule: fallbackRule, account: fallbackAccount, score: fallbackRule.confidence || 0.55, matchedKeywords: [] }, normalized, true);
}

function normalizeCoaCandidateInput_(entry) {
  const transactionType = normalizeHeaderKey_(entry.type || entry.transactionType || entry.kind || 'biaya') || 'biaya';
  return {
    transactionType,
    sourceType: entry.sourceType || 'manual_input',
    sourceId: entry.sourceId || entry.importId || entry.transactionId || '',
    transactionDate: toIsoDateString_((entry.date || entry.transactionDate || entry.expenseDate || '').toString().slice(0, 10)) || '',
    description: String(entry.description || entry.expenseName || entry.itemName || entry.name || '').trim(),
    category: String(entry.category || entry.expenseCategory || entry.revenueType || '').trim(),
    paymentMethod: String(entry.paymentMethod || '').trim(),
    vendorName: String(entry.vendor || entry.vendorName || entry.supplier || '').trim(),
    payerType: String(entry.payerType || '').trim(),
    amount: asNumber_(entry.amount || entry.netAmount || entry.grossAmount, 0),
    raw: entry,
  };
}

function getActiveCoaAccounts_(tenantId) {
  return getRowsAsObjects_('MASTER_COA')
    .filter(row => String(row.tenant_id || '') === tenantId && String(row.status || 'active').toLowerCase() !== 'inactive');
}

function getCoaMappingRules_(context) {
  return getRowsAsObjects_('COA_MAPPING_RULE')
    .filter(row => row.tenant_id === context.tenantId && (row.clinic_id === context.clinicId || row.clinic_id === '*' || row.clinic_id === '') && String(row.status || 'active').toLowerCase() === 'active');
}

function scoreCoaRule_(rule, normalized, accounts) {
  const account = findCoaAccount_(accounts, rule.suggested_account_id || rule.account_id || rule.account_code);
  if (!account) return { rule, account: null, score: 0, matchedKeywords: [] };
  const type = normalizeHeaderKey_(rule.transaction_type || 'all');
  if (type !== 'all' && type !== normalized.transactionType) return { rule, account, score: 0, matchedKeywords: [] };
  const haystack = normalizeCoaSearchText_(normalized);
  const keywords = parseRuleKeywords_(rule.match_text || rule.keywords || '');
  const matched = keywords.filter(keyword => haystack.indexOf(keyword) !== -1);
  if (!matched.length) return { rule, account, score: 0, matchedKeywords: [] };
  const base = Number(rule.confidence || 0.7);
  const coverageBonus = Math.min(0.18, matched.length * 0.04);
  const priorityBonus = Math.min(0.05, Number(rule.priority || 0) / 1000);
  return { rule, account, score: Math.min(0.99, base + coverageBonus + priorityBonus), matchedKeywords: matched };
}

function normalizeCoaSearchText_(normalized) {
  return normalizeHeaderKey_([
    normalized.transactionType,
    normalized.description,
    normalized.category,
    normalized.paymentMethod,
    normalized.vendorName,
    normalized.payerType,
  ].join(' ')).replace(/_/g, ' ');
}

function parseRuleKeywords_(text) {
  return String(text || '').split(/[|,;]/).map(item => normalizeHeaderKey_(item).replace(/_/g, ' ').trim()).filter(Boolean);
}

function findCoaAccount_(accounts, accountRef) {
  const ref = String(accountRef || '').trim();
  if (!ref) return null;
  return (accounts || []).find(row => String(row.account_id || '') === ref || String(row.account_code || '') === ref) || null;
}

function formatCoaSuggestion_(match, normalized, needsReview) {
  const account = match.account || {};
  const rule = match.rule || {};
  const confidence = Number(match.score || rule.confidence || 0.5);
  const reviewStatus = confidence >= COA_AUTO_APPLY_THRESHOLD && !needsReview ? 'auto_suggested' : 'pending_review';
  return {
    transactionType: normalized.transactionType,
    suggestedAccountId: account.account_id || rule.suggested_account_id || '',
    suggestedAccountCode: account.account_code || '',
    suggestedAccountName: account.account_name || '',
    suggestedCategory: rule.suggested_category || normalized.category || inferCategoryFromAccount_(account),
    costType: rule.cost_type || inferCostTypeFromAccount_(account),
    confidence,
    confidenceLabel: confidence >= COA_AUTO_APPLY_THRESHOLD ? 'high' : (confidence >= COA_REVIEW_THRESHOLD ? 'medium' : 'low'),
    needsReview: confidence < COA_REVIEW_THRESHOLD || !!needsReview,
    reviewStatus,
    rationale: buildCoaSuggestionRationale_(rule, account, match.matchedKeywords || [], needsReview),
  };
}

function buildCoaSuggestionRationale_(rule, account, matchedKeywords, needsReview) {
  if (needsReview) return 'Fallback karena belum ada rule/keyword yang cukup kuat. User perlu review sebelum angka dianggap final.';
  const code = [account.account_code, account.account_name].filter(Boolean).join(' - ');
  const reason = matchedKeywords.length ? 'keyword: ' + matchedKeywords.join(', ') : 'rule default';
  return 'Disarankan ke ' + code + ' berdasarkan ' + reason + '.';
}

function inferCategoryFromAccount_(account) {
  const code = String(account && account.account_code || '');
  if (code.indexOf('41') === 0) return 'pendapatan_layanan';
  if (code.indexOf('42') === 0) return 'pendapatan_penjamin';
  if (code.indexOf('51') === 0 || code.indexOf('52') === 0) return 'biaya_langsung';
  if (code.indexOf('6') === 0) return 'operasional';
  return 'review_required';
}

function inferCostTypeFromAccount_(account) {
  const code = String(account && account.account_code || '');
  if (code.indexOf('51') === 0) return 'cogs';
  if (code.indexOf('52') === 0) return 'variable';
  if (code.indexOf('6') === 0) return 'operational';
  return '';
}

function buildCoaSuggestionAuditRow_(context, normalized, suggestion, sourceType) {
  const now = new Date();
  return {
    tenant_id: context.tenantId,
    clinic_id: context.clinicId,
    suggestion_id: 'coa_sug_' + Utilities.getUuid(),
    source_type: sourceType || normalized.sourceType || 'manual_input',
    source_id: normalized.sourceId || '',
    transaction_type: normalized.transactionType,
    transaction_date: normalized.transactionDate,
    description: normalized.description,
    amount: normalized.amount,
    suggested_account_id: suggestion.suggestedAccountId || '',
    suggested_account_code: suggestion.suggestedAccountCode || '',
    suggested_account_name: suggestion.suggestedAccountName || '',
    suggested_category: suggestion.suggestedCategory || '',
    cost_type: suggestion.costType || '',
    confidence: suggestion.confidence,
    rationale: suggestion.rationale || '',
    review_status: suggestion.reviewStatus || 'pending_review',
    approved_account_id: '',
    approved_by: '',
    approved_at: '',
    created_at: now,
  };
}

function saveCoaSuggestion_(context, normalized, suggestion, sourceType) {
  const row = buildCoaSuggestionAuditRow_(context, normalized, suggestion, sourceType);
  appendObjects_('AI_COA_SUGGESTION', [row]);
  return row;
}

function buildImportedCoaSuggestionRow_(context, finalRow, targetSheet) {
  if (targetSheet !== 'BIAYA' && targetSheet !== 'PENDAPATAN') return null;
  const type = targetSheet === 'BIAYA' ? 'biaya' : 'pendapatan';
  const normalized = normalizeCoaCandidateInput_({
    type,
    sourceType: 'import_upload',
    sourceId: finalRow.expense_id || finalRow.revenue_id || finalRow.import_id || '',
    transactionDate: finalRow.expense_date || finalRow.transaction_date || '',
    description: finalRow.expense_name || finalRow.item_name || '',
    category: finalRow.expense_category || finalRow.revenue_type || '',
    paymentMethod: finalRow.payment_method || '',
    vendorName: finalRow.vendor_name || '',
    payerType: finalRow.payer_type || '',
    amount: finalRow.amount || finalRow.net_amount || 0,
  });
  const suggestion = buildCoaSuggestion_(context, normalized);
  return buildCoaSuggestionAuditRow_(context, normalized, suggestion, 'import_upload');
}

function applyCoaSuggestionToFinalRow_(context, finalRow, targetSheet) {
  if (targetSheet !== 'BIAYA') return finalRow;
  if (finalRow.account_id) return finalRow;
  const auditRow = buildImportedCoaSuggestionRow_(context, finalRow, targetSheet);
  if (!auditRow) return finalRow;
  finalRow.expense_category = finalRow.expense_category || auditRow.suggested_category || 'operasional';
  finalRow.cost_type = finalRow.cost_type || auditRow.cost_type || 'operational';
  if (String(auditRow.review_status || '') === 'auto_suggested') finalRow.account_id = auditRow.suggested_account_id || '';
  finalRow._coaSuggestionAudit = auditRow;
  return finalRow;
}

function approveCoaSuggestionForContext_(context, suggestionId, approvedAccountId) {
  assertTenantScope_(context.tenantId, context.clinicId);
  if (!suggestionId) throw new Error('suggestionId wajib diisi.');
  const accounts = getActiveCoaAccounts_(context.tenantId);
  const account = findCoaAccount_(accounts, approvedAccountId);
  if (!account) throw new Error('Akun COA approval tidak ditemukan atau inactive: ' + approvedAccountId);
  let updated = 0;
  updateObjectsWhere_('AI_COA_SUGGESTION', function(row) {
    return row.tenant_id === context.tenantId && row.clinic_id === context.clinicId && row.suggestion_id === suggestionId;
  }, function(row) {
    updated++;
    row.review_status = 'approved';
    row.approved_account_id = account.account_id;
    row.approved_by = context.userEmail || context.actorId || 'owner';
    row.approved_at = new Date();
    return row;
  });
  if (!updated) throw new Error('Saran COA tidak ditemukan: ' + suggestionId);
  return { ok: true, suggestionId, approvedAccountId: account.account_id, approvedAccountCode: account.account_code, approvedAccountName: account.account_name };
}

function getFallbackCoaRule_(transactionType) {
  if (transactionType === 'pendapatan') return { rule_id: 'fallback_revenue_other', transaction_type: 'pendapatan', suggested_account_id: 'coa_revenue_other', suggested_category: 'lainnya', confidence: 0.58, priority: 1 };
  return { rule_id: 'fallback_opex_other', transaction_type: 'biaya', suggested_account_id: 'coa_opex_other', suggested_category: 'operasional_lainnya', cost_type: 'operational', confidence: 0.58, priority: 1 };
}

function getDefaultCoaMappingRules_() {
  const r = (rule_id, transaction_type, match_text, suggested_account_id, suggested_category, cost_type, confidence, priority) => ({ rule_id, transaction_type, match_text, suggested_account_id, suggested_category, cost_type, confidence, priority, status: 'active' });
  return [
    r('rev_consultation', 'pendapatan', 'konsultasi|pemeriksaan|dokter umum|dokter gigi|visite', 'coa_revenue_consultation', 'konsultasi', '', 0.86, 90),
    r('rev_procedure', 'pendapatan', 'tindakan|prosedur|minor|jahit|cabut|scaling|nebulizer|injeksi|suntik', 'coa_revenue_procedure', 'tindakan', '', 0.85, 85),
    r('rev_medicine', 'pendapatan', 'obat|farmasi|resep|apotik', 'coa_revenue_medicine', 'obat', '', 0.88, 90),
    r('rev_lab', 'pendapatan', 'lab|laboratorium|rontgen|usg|penunjang', 'coa_revenue_lab', 'laboratorium', '', 0.84, 80),
    r('rev_admin', 'pendapatan', 'admin|administrasi|registrasi|surat|materai', 'coa_revenue_admin', 'administrasi', '', 0.84, 80),
    r('rev_bpjs', 'pendapatan', 'bpjs|kapitasi|klaim bpjs', 'coa_revenue_bpjs', 'bpjs', '', 0.9, 95),
    r('rev_insurance', 'pendapatan', 'asuransi|insurance|perusahaan|corporate', 'coa_revenue_insurance', 'asuransi_perusahaan', '', 0.86, 80),

    r('exp_doctor_fee', 'biaya', 'jasa dokter|fee dokter|honor dokter|dokter|dr ', 'coa_doctor_fee', 'jasa_dokter', 'variable', 0.9, 95),
    r('exp_medical_staff_fee', 'biaya', 'perawat|bidan|terapis|tenaga medis|honor medis', 'coa_medical_staff_fee', 'fee_tenaga_medis', 'variable', 0.86, 85),
    r('exp_cogs_medicine', 'biaya', 'hpp obat|obat|farmasi|pembelian obat|supplier obat', 'coa_cogs', 'hpp_obat', 'cogs', 0.84, 88),
    r('exp_cogs_bmhp', 'biaya', 'bmhp|alkes habis pakai|kasa|spuit|syringe|handscoon|reagen|masker medis', 'coa_cogs_bmhp', 'hpp_bmhp', 'cogs', 0.84, 86),
    r('exp_lab_cost', 'biaya', 'lab rujukan|laboratorium rujukan|penunjang langsung|fee lab', 'coa_lab_cost', 'biaya_lab_langsung', 'cogs', 0.87, 85),
    r('exp_salary', 'biaya', 'gaji|payroll|honor admin|staff non medis|karyawan|thr|bonus', 'coa_salary', 'gaji', 'fixed', 0.86, 82),
    r('exp_rent', 'biaya', 'sewa|kontrak ruko|rental', 'coa_rent', 'sewa', 'fixed', 0.9, 90),
    r('exp_utilities', 'biaya', 'listrik|pln|air|pdam|internet|wifi|telepon|telkom|indihome', 'coa_utilities', 'utilitas', 'operational', 0.9, 90),
    r('exp_cleaning_security', 'biaya', 'kebersihan|cleaning|security|satpam|laundry', 'coa_cleaning_security', 'fasilitas', 'operational', 0.84, 75),
    r('exp_maintenance', 'biaya', 'maintenance|servis|service alat|perbaikan|kalibrasi|renovasi', 'coa_maintenance', 'maintenance', 'operational', 0.85, 82),
    r('exp_license', 'biaya', 'izin|perizinan|str|sip|akreditasi|oss', 'coa_license_permit', 'perizinan', 'operational', 0.86, 80),
    r('exp_office_supply', 'biaya', 'atk|kertas|tinta|printer|perlengkapan kantor', 'coa_office_supply', 'atk', 'operational', 0.84, 72),
    r('exp_software', 'biaya', 'software|sim klinik|hosting|domain|subscription|langganan|saas', 'coa_software', 'software', 'operational', 0.88, 84),
    r('exp_bank_fee', 'biaya', 'biaya bank|admin bank|edc|qris|payment gateway|mdr|transfer fee', 'coa_bank_fee', 'biaya_bank', 'operational', 0.9, 88),
    r('exp_marketing', 'biaya', 'marketing|promosi|iklan|ads|spanduk|brosur|instagram|facebook', 'coa_marketing', 'marketing', 'operational', 0.86, 82),
    r('exp_training', 'biaya', 'training|pelatihan|seminar|workshop', 'coa_training', 'training', 'operational', 0.84, 70),
    r('exp_transport', 'biaya', 'transport|kurir|ojek|grab|gojek|bensin|parkir|tol', 'coa_transport', 'transportasi', 'operational', 0.84, 75),
    r('exp_professional', 'biaya', 'akuntan|pajak|konsultan|legal|notaris|pengacara', 'coa_professional_fee', 'jasa_profesional', 'operational', 0.88, 82),
    r('exp_tax', 'biaya', 'beban pajak|pajak daerah|pbb|pajak', 'coa_tax_expense', 'beban_pajak', 'operational', 0.78, 45),
    r('exp_interest', 'biaya', 'bunga pinjaman|bunga bank|administrasi pinjaman', 'coa_interest_expense', 'beban_bunga', 'non_operational', 0.86, 75),
  ];
}

function testCoaSuggestionClassifierStatic() {
  const accounts = getDefaultClinicCoaRows_(APP_CONFIG.defaultTenantId, new Date());
  const context = { tenantId: APP_CONFIG.defaultTenantId, clinicId: APP_CONFIG.defaultClinicId };
  const originalGetRows = getRowsAsObjects_;
  getRowsAsObjects_ = function(sheetName) {
    if (sheetName === 'MASTER_COA') return accounts;
    if (sheetName === 'COA_MAPPING_RULE') return [];
    return [];
  };
  try {
    const util = buildCoaSuggestion_(context, normalizeCoaCandidateInput_({ type: 'biaya', description: 'Bayar tagihan PLN klinik', amount: 1200000 }));
    if (util.suggestedAccountId !== 'coa_utilities' || util.confidence < COA_REVIEW_THRESHOLD) throw new Error('PLN expense should suggest utilities COA.');
    const doctor = buildCoaSuggestion_(context, normalizeCoaCandidateInput_({ type: 'biaya', description: 'Fee dokter dr Andi', amount: 500000 }));
    if (doctor.suggestedAccountId !== 'coa_doctor_fee') throw new Error('Doctor fee should suggest doctor fee COA.');
    const unknown = buildCoaSuggestion_(context, normalizeCoaCandidateInput_({ type: 'biaya', description: 'Biaya aneh tanpa pola', amount: 500000 }));
    if (unknown.suggestedAccountId !== 'coa_opex_other' || !unknown.needsReview) throw new Error('Unknown expense should fall back to opex other with review.');
    return { ok: true };
  } finally {
    getRowsAsObjects_ = originalGetRows;
  }
}
