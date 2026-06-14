/**
 * Session/tenant guardrail for Phase 1 pilot.
 * Tenant and clinic context must come from verified USER_ACCESS rows, not arbitrary query params.
 */
function getCurrentActor_() {
  let email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (err) { email = ''; }
  let effectiveEmail = '';
  try { effectiveEmail = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase(); } catch (err) { effectiveEmail = ''; }
  let temporaryUserKey = '';
  try { temporaryUserKey = String(Session.getTemporaryActiveUserKey() || '').trim(); } catch (err) { temporaryUserKey = ''; }
  const boundEmail = !email && temporaryUserKey ? getBrowserSessionEmail_(temporaryUserKey) : '';
  // Security note: never fall back to effectiveEmail as actor. For web apps executing as deployer,
  // effectiveEmail is the deployer and would turn every visitor into the deployer.
  return { userId: email || boundEmail, email: email || boundEmail, effectiveEmail, temporaryUserKey, channel: 'gas_webapp' };
}

function resolveRequestContext_(params, payload, requiredRole) {
  const actor = getCurrentActor_();
  const requestedTenantId = (params && params.tenantId) || (payload && payload.tenantId) || '';
  const requestedClinicId = (params && params.clinicId) || (payload && payload.clinicId) || '';
  return requireClinicAccess_(actor, requestedTenantId, requestedClinicId, requiredRole || 'owner');
}

function getDefaultAuthState() {
  const actor = getCurrentActor_();
  const userId = actor && actor.userId ? String(actor.userId).trim().toLowerCase() : '';
  if (!userId) return {
    ok: false,
    authenticated: false,
    requiresBrowserLogin: true,
    hasTemporaryUserKey: !!(actor && actor.temporaryUserKey),
    error: 'UNAUTHENTICATED',
    message: 'Google session belum mengirim email. Bind browser ini ke email USER_ACCESS dengan kode login pilot.'
  };
  const rows = getRowsAsObjects_('USER_ACCESS').filter(row => userMatchesAccessRow_(userId, row) && String(row.status || 'active').toLowerCase() === 'active');
  if (!rows.length) return { ok: false, authenticated: true, authorized: false, email: userId, effectiveEmail: actor.effectiveEmail || '', error: 'FORBIDDEN', message: 'Akun ini belum terdaftar di USER_ACCESS.' };
  const contexts = rows.map(row => {
    const role = normalizeRole_(row.role);
    return {
      tenantId: row.tenant_id || '',
      clinicScope: row.clinic_scope || '',
      clinicId: resolveDefaultClinicForTenant_([row], row.tenant_id || '') || row.clinic_scope || '',
      role,
      roleLabel: roleLabel_(role),
      permissions: permissionsForRole_(role),
      userName: row.user_name || row.email || userId,
      email: row.email || userId,
    };
  });
  const primary = contexts[0];
  updateLastLoginForUser_(userId);
  return {
    ok: true,
    authenticated: true,
    authorized: true,
    email: primary.email || userId,
    userName: primary.userName || userId,
    effectiveEmail: actor.effectiveEmail || '',
    tenantId: primary.tenantId,
    clinicId: primary.clinicId,
    clinicScope: primary.clinicScope,
    role: primary.role,
    roleLabel: primary.roleLabel,
    permissions: primary.permissions,
    contexts,
  };
}


function bindDefaultBrowserSession(email, code) {
  const actor = getCurrentActor_();
  const temporaryUserKey = actor && actor.temporaryUserKey ? String(actor.temporaryUserKey).trim() : '';
  if (!temporaryUserKey) throw new Error('UNAUTHENTICATED: browser belum punya Google temporary user key. Pastikan membuka web app saat login Google.');
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Email wajib diisi.');
  const providedCode = String(code || '').trim();
  const expectedHash = getScriptProperty_('PILOT_BROWSER_LOGIN_CODE_SHA256', '') || '07ef0098e3dac5a4441d16e18234eb3ab1c669e384181a342739b9821acd5e95';
  if (!expectedHash) throw new Error('PILOT_BROWSER_LOGIN_CODE_SHA256 belum dikonfigurasi.');
  if (sha256Hex_(providedCode) !== String(expectedHash).trim().toLowerCase()) throw new Error('Kode login pilot salah.');
  const rows = getRowsAsObjects_('USER_ACCESS').filter(row => userMatchesAccessRow_(normalizedEmail, row) && String(row.status || 'active').toLowerCase() === 'active');
  if (!rows.length) throw new Error('FORBIDDEN: email belum terdaftar aktif di USER_ACCESS.');
  setBrowserSessionEmail_(temporaryUserKey, normalizedEmail);
  return getDefaultAuthState();
}

function clearDefaultBrowserSession() {
  const actor = getCurrentActor_();
  if (actor && actor.temporaryUserKey) clearBrowserSessionEmail_(actor.temporaryUserKey);
  return getDefaultAuthState();
}

function getBrowserSessionEmail_(temporaryUserKey) {
  if (!temporaryUserKey) return '';
  return getScriptProperty_('BROWSER_SESSION_EMAIL_' + hashBrowserSessionKey_(temporaryUserKey), '');
}

function setBrowserSessionEmail_(temporaryUserKey, email) {
  PropertiesService.getScriptProperties().setProperty('BROWSER_SESSION_EMAIL_' + hashBrowserSessionKey_(temporaryUserKey), String(email || '').trim().toLowerCase());
}

function clearBrowserSessionEmail_(temporaryUserKey) {
  try { PropertiesService.getScriptProperties().deleteProperty('BROWSER_SESSION_EMAIL_' + hashBrowserSessionKey_(temporaryUserKey)); } catch (err) {}
}

function hashBrowserSessionKey_(temporaryUserKey) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(temporaryUserKey || ''), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}

function setPilotBrowserLoginCodeHash(code) {
  const value = String(code || '').trim();
  if (!value || value.length < 8) throw new Error('Browser login code minimal 8 karakter.');
  PropertiesService.getScriptProperties().setProperty('PILOT_BROWSER_LOGIN_CODE_SHA256', sha256Hex_(value));
  return { ok: true, property: 'PILOT_BROWSER_LOGIN_CODE_SHA256', length: value.length };
}

function sha256Hex_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || ''), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}

function requireClinicAccess_(actor, requestedTenantId, requestedClinicId, requiredRole) {
  const userId = actor && actor.userId ? String(actor.userId).trim().toLowerCase() : '';
  if (!userId) throw new Error('UNAUTHENTICATED: Google session tidak terdeteksi. Gunakan akses web app terbatas, bukan anonymous, untuk data pilot.');
  const accessRows = getRowsAsObjects_('USER_ACCESS').filter(row => userMatchesAccessRow_(userId, row) && String(row.status || 'active').toLowerCase() === 'active');
  if (!accessRows.length) throw new Error('FORBIDDEN: user belum terdaftar di USER_ACCESS.');
  const allowedRows = accessRows.filter(row => roleAllows_(row.role, requiredRole || 'owner'));
  if (!allowedRows.length) throw new Error('FORBIDDEN: role user tidak cukup untuk action ini.');
  const tenantId = requestedTenantId || allowedRows[0].tenant_id;
  if (!tenantId) throw new Error('FORBIDDEN: tenant context tidak tersedia.');
  const tenantRows = allowedRows.filter(row => row.tenant_id === tenantId);
  if (!tenantRows.length) throw new Error('FORBIDDEN: actor tidak boleh mengakses tenant ini.');
  const clinicId = requestedClinicId || resolveDefaultClinicForTenant_(tenantRows, tenantId);
  if (!clinicId) throw new Error('FORBIDDEN: clinic context tidak tersedia.');
  const clinicRows = tenantRows.filter(row => clinicScopeAllows_(row.clinic_scope, clinicId));
  if (!clinicRows.length) throw new Error('FORBIDDEN: actor tidak boleh mengakses clinic ini.');
  return {
    actorId: userId,
    userEmail: userId,
    role: normalizeRole_(clinicRows[0].role),
    tenantId,
    clinicId,
    source: 'USER_ACCESS',
  };
}

function userMatchesAccessRow_(userId, row) {
  return [row.user_id, row.email, row.telegram_id, row.whatsapp_id]
    .filter(Boolean)
    .map(value => String(value).trim().toLowerCase())
    .indexOf(userId) !== -1;
}

function roleAllows_(actualRole, requiredRole) {
  const rank = { viewer: 1, staff: 2, finance: 3, manager: 4, owner: 5, admin: 6 };
  return (rank[normalizeRole_(actualRole)] || 0) >= (rank[normalizeRole_(requiredRole)] || 5);
}

function normalizeRole_(role) {
  return String(role || '').trim().toLowerCase();
}

function clinicScopeAllows_(clinicScope, clinicId) {
  const scope = String(clinicScope || '').trim();
  if (!scope || scope === '*') return true;
  return scope.split(',').map(item => item.trim()).indexOf(clinicId) !== -1;
}

function resolveDefaultClinicForTenant_(rows, tenantId) {
  const wildcard = (rows || []).find(row => clinicScopeAllows_(row.clinic_scope, APP_CONFIG.defaultClinicId) && row.tenant_id === tenantId);
  if (wildcard) return APP_CONFIG.defaultClinicId;
  const first = (rows || []).find(row => row.tenant_id === tenantId && String(row.clinic_scope || '').trim() && String(row.clinic_scope || '').trim() !== '*');
  return first ? String(first.clinic_scope).split(',')[0].trim() : '';
}

function assertContextScope_(context, tenantId, clinicId) {
  if (!context) throw new Error('Missing verified tenant context.');
  if (context.tenantId !== tenantId || context.clinicId !== clinicId) throw new Error('FORBIDDEN: request context scope mismatch.');
}

function permissionsForRole_(role) {
  role = normalizeRole_(role);
  return {
    viewDashboard: roleAllows_(role, 'viewer'),
    viewReports: roleAllows_(role, 'finance'),
    viewQuality: roleAllows_(role, 'finance'),
    viewAlerts: roleAllows_(role, 'manager'),
    uploadData: roleAllows_(role, 'finance'),
    manualInput: roleAllows_(role, 'finance'),
    manageSettings: roleAllows_(role, 'owner'),
    setup: roleAllows_(role, 'owner'),
    resetData: roleAllows_(role, 'owner'),
    manageUsers: roleAllows_(role, 'admin'),
  };
}

function roleLabel_(role) {
  const labels = { viewer: 'Viewer', staff: 'Staff', finance: 'Finance/Admin', manager: 'Manager', owner: 'Owner', admin: 'Admin' };
  return labels[normalizeRole_(role)] || 'Unknown';
}

function updateLastLoginForUser_(userId) {
  try {
    const now = new Date();
    updateObjectsWhere_('USER_ACCESS', row => userMatchesAccessRow_(userId, row), row => {
      row.last_login_at = now;
      row.updated_at = now;
      return row;
    });
  } catch (err) {
    // Auth state must not fail just because audit metadata cannot be updated.
  }
}
