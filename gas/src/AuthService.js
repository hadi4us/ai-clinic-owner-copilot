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
  const effectiveFallbackEmail = !email && !boundEmail ? getTrustedEffectiveUserEmail_(effectiveEmail) : '';
  return {
    userId: email || boundEmail || effectiveFallbackEmail,
    email: email || boundEmail || effectiveFallbackEmail,
    effectiveEmail,
    temporaryUserKey,
    actorSource: email ? 'active_user' : (boundEmail ? 'browser_binding' : (effectiveFallbackEmail ? 'effective_user_accessing' : 'none')),
    channel: 'gas_webapp'
  };
}

function getTrustedEffectiveUserEmail_(effectiveEmail) {
  const normalized = String(effectiveEmail || '').trim().toLowerCase();
  if (!normalized) return '';
  if (getManifestWebExecuteAs_() !== 'USER_ACCESSING') return '';
  try {
    const ownerEmail = String(getScriptProperty_('PILOT_OWNER_EMAIL', '') || '').trim().toLowerCase();
    if (ownerEmail && normalized === ownerEmail) return normalized;
    const rows = getRowsAsObjects_('USER_ACCESS').filter(row => userMatchesAccessRow_(normalized, row) && String(row.status || 'active').toLowerCase() === 'active');
    return rows.length ? normalized : '';
  } catch (err) {
    return '';
  }
}

function resolveRequestContext_(params, payload, requiredRole) {
  const actor = getCurrentActor_();
  const requestedTenantId = (params && params.tenantId) || (payload && payload.tenantId) || '';
  const requestedClinicId = (params && params.clinicId) || (payload && payload.clinicId) || '';
  if (requestedTenantId) setActiveTenantContext_(requestedTenantId);
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
    actorSource: actor.actorSource || '',
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

function getDefaultUserAccessPayload() {
  const context = resolveRequestContext_({}, {}, 'owner');
  return getUserAccessPayloadForContext_(context);
}

function getUserAccessPayloadForContext_(context) {
  assertTenantScope_(context.tenantId, context.clinicId);
  if (!roleAllows_(context.role, 'owner')) throw new Error('FORBIDDEN: hanya owner/admin yang boleh mengelola USER_ACCESS.');
  const rows = getRowsAsObjects_('USER_ACCESS')
    .filter(row => String(row.tenant_id || '') === context.tenantId)
    .sort((a, b) => String(a.email || a.user_id || '').localeCompare(String(b.email || b.user_id || '')))
    .map(normalizeUserAccessForClient_);
  return {
    ok: true,
    tenantId: context.tenantId,
    clinicId: context.clinicId,
    currentUser: context.userEmail || context.actorId || '',
    rows,
    roles: getUserAccessRoleOptions_(),
    generatedAt: Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
  };
}

function saveDefaultUserAccessEntry(entry) {
  const context = resolveRequestContext_({}, {}, 'owner');
  return saveUserAccessEntryForContext_(context, entry || {});
}

function deactivateDefaultUserAccessEntry(email) {
  const context = resolveRequestContext_({}, {}, 'owner');
  return deactivateUserAccessEntryForContext_(context, email);
}

function saveUserAccessEntryForContext_(context, entry) {
  assertTenantScope_(context.tenantId, context.clinicId);
  if (!roleAllows_(context.role, 'owner')) throw new Error('FORBIDDEN: hanya owner/admin yang boleh mengelola USER_ACCESS.');
  const normalized = normalizeUserAccessInput_(context, entry || {});
  return withTenantClinicLock_('user_access_save', context.tenantId, context.clinicId, function() {
    ensurePhase1WarehouseSheetsNoLock_();
    const rows = getRowsAsObjects_('USER_ACCESS');
    let updated = false;
    const now = new Date();
    const nextRows = rows.map(function(row) {
      if (String(row.tenant_id || '') !== context.tenantId) return row;
      if (!userMatchesAccessRow_(normalized.email, row)) return row;
      if (String(normalized.status || '').toLowerCase() !== 'active' && userMatchesAccessRow_(context.userEmail || context.actorId, row)) {
        throw new Error('USER_ACCESS_SELF_DEACTIVATE_BLOCKED: tidak boleh menonaktifkan akses sendiri.');
      }
      updated = true;
      row.user_id = normalized.email;
      row.user_name = normalized.userName;
      row.email = normalized.email;
      row.role = normalized.role;
      row.clinic_scope = normalized.clinicScope;
      row.status = normalized.status;
      row.updated_at = now;
      return row;
    });
    if (!updated) {
      nextRows.push({
        tenant_id: context.tenantId,
        user_id: normalized.email,
        user_name: normalized.userName,
        email: normalized.email,
        telegram_id: '',
        whatsapp_id: '',
        role: normalized.role,
        clinic_scope: normalized.clinicScope,
        status: normalized.status,
        last_login_at: '',
        created_at: now,
        updated_at: now,
      });
    }
    replaceObjects_('USER_ACCESS', nextRows);
    writeAudit_(context.userEmail || context.actorId || 'owner', context.role || 'owner', updated ? 'user_access_update' : 'user_access_create', 'USER_ACCESS', {
      email: normalized.email,
      role: normalized.role,
      clinicScope: normalized.clinicScope,
      status: normalized.status,
    });
    return getUserAccessPayloadForContext_(context);
  });
}

function deactivateUserAccessEntryForContext_(context, email) {
  assertTenantScope_(context.tenantId, context.clinicId);
  if (!roleAllows_(context.role, 'owner')) throw new Error('FORBIDDEN: hanya owner/admin yang boleh mengelola USER_ACCESS.');
  const normalizedEmail = normalizeEmail_(email);
  if (!normalizedEmail) throw new Error('Email wajib diisi.');
  if (normalizedEmail === normalizeEmail_(context.userEmail || context.actorId)) throw new Error('USER_ACCESS_SELF_DEACTIVATE_BLOCKED: tidak boleh menonaktifkan akses sendiri.');
  return withTenantClinicLock_('user_access_deactivate', context.tenantId, context.clinicId, function() {
    let found = false;
    updateObjectsWhere_('USER_ACCESS', function(row) {
      return String(row.tenant_id || '') === context.tenantId && userMatchesAccessRow_(normalizedEmail, row);
    }, function(row) {
      found = true;
      row.status = 'inactive';
      row.updated_at = new Date();
      return row;
    });
    if (!found) throw new Error('USER_ACCESS_NOT_FOUND: email tidak ditemukan.');
    writeAudit_(context.userEmail || context.actorId || 'owner', context.role || 'owner', 'user_access_deactivate', 'USER_ACCESS', { email: normalizedEmail });
    return getUserAccessPayloadForContext_(context);
  });
}

function repairPilotOwnerUserAccess() {
  const actor = getCurrentActor_();
  const actorEmail = normalizeEmail_(actor && actor.userId);
  const ownerEmail = normalizeEmail_(getScriptProperty_('PILOT_OWNER_EMAIL', ''));
  if (!ownerEmail) throw new Error('PILOT_OWNER_EMAIL belum dikonfigurasi.');
  if (!actorEmail || actorEmail !== ownerEmail) throw new Error('FORBIDDEN: hanya PILOT_OWNER_EMAIL yang boleh repair owner access.');
  const tenantId = APP_CONFIG.defaultTenantId;
  const clinicId = APP_CONFIG.defaultClinicId;
  setActiveTenantContext_(tenantId);
  assertTenantRegistryAllows_(tenantId);
  return withTenantClinicLock_('repair_pilot_owner_access', tenantId, clinicId, function() {
    ensurePhase1WarehouseSheetsNoLock_();
    const now = new Date();
    const rows = getRowsAsObjects_('USER_ACCESS');
    let matched = 0;
    let inserted = false;
    let canonical = null;
    rows.forEach(function(row) {
      if (String(row.tenant_id || '') !== tenantId) return;
      if (!userMatchesAccessRow_(ownerEmail, row)) return;
      matched += 1;
      if (!canonical || normalizeRole_(row.role) === 'owner' || String(row.status || 'active').toLowerCase() === 'active') {
        canonical = row;
      }
    });
    canonical = canonical || {};
    const ownerRow = {
      tenant_id: tenantId,
      user_id: ownerEmail,
      user_name: canonical.user_name || canonical.userName || 'Pilot Owner',
      email: ownerEmail,
      telegram_id: canonical.telegram_id || '',
      whatsapp_id: canonical.whatsapp_id || '',
      role: 'owner',
      clinic_scope: canonical.clinic_scope || clinicId,
      status: 'active',
      last_login_at: canonical.last_login_at || '',
      created_at: canonical.created_at || now,
      updated_at: now,
    };
    const nextRows = [];
    rows.forEach(function(row) {
      const isTarget = String(row.tenant_id || '') === tenantId && userMatchesAccessRow_(ownerEmail, row);
      if (!isTarget) {
        nextRows.push(row);
        return;
      }
      if (!inserted) {
        nextRows.push(ownerRow);
        inserted = true;
      }
    });
    if (!inserted) nextRows.push(ownerRow);
    replaceObjects_('USER_ACCESS', nextRows);
    writeAudit_(ownerEmail, 'owner', 'pilot_owner_access_repair', 'USER_ACCESS', {
      email: ownerEmail,
      role: 'owner',
      status: 'active',
      matchedRows: matched,
      removedDuplicateRows: Math.max(0, matched - 1),
    });
    const context = { actorId: ownerEmail, userEmail: ownerEmail, role: 'owner', tenantId: tenantId, clinicId: clinicId, source: 'PILOT_OWNER_EMAIL_REPAIR' };
    const payload = getUserAccessPayloadForContext_(context);
    payload.repair = {
      ownerEmail: ownerEmail,
      matchedRows: matched,
      removedDuplicateRows: Math.max(0, matched - 1),
    };
    return payload;
  });
}

function normalizeUserAccessInput_(context, entry) {
  const email = normalizeEmail_(entry.email || entry.userId || entry.user_id);
  if (!email) throw new Error('Email user wajib diisi.');
  if (email.indexOf('@') === -1) throw new Error('Email user tidak valid.');
  const role = normalizeRole_(entry.role || 'viewer');
  if (getUserAccessRoleOptions_().map(r => r.value).indexOf(role) === -1) throw new Error('Role tidak valid: ' + role);
  const status = String(entry.status || 'active').trim().toLowerCase();
  if (['active', 'inactive'].indexOf(status) === -1) throw new Error('Status USER_ACCESS harus active atau inactive.');
  return {
    email,
    userName: String(entry.userName || entry.user_name || email).trim() || email,
    role,
    clinicScope: String(entry.clinicScope || entry.clinic_scope || context.clinicId || APP_CONFIG.defaultClinicId).trim() || context.clinicId || APP_CONFIG.defaultClinicId,
    status,
  };
}

function normalizeUserAccessForClient_(row) {
  const role = normalizeRole_(row.role);
  return {
    tenantId: row.tenant_id || '',
    userId: row.user_id || row.email || '',
    userName: row.user_name || row.email || row.user_id || '',
    email: row.email || row.user_id || '',
    role,
    roleLabel: roleLabel_(role),
    clinicScope: row.clinic_scope || '',
    status: row.status || 'active',
    lastLoginAt: formatDateTimeForClient_(row.last_login_at),
    updatedAt: formatDateTimeForClient_(row.updated_at),
  };
}

function getUserAccessRoleOptions_() {
  return [
    { value: 'viewer', label: 'Viewer' },
    { value: 'staff', label: 'Staff' },
    { value: 'finance', label: 'Finance/Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Admin' },
  ];
}

function normalizeEmail_(value) {
  return String(value || '').trim().toLowerCase();
}

function formatDateTimeForClient_(value) {
  if (!value) return '';
  try { return Utilities.formatDate(new Date(value), APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'); } catch (err) { return String(value || ''); }
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
  if (requestedTenantId) assertTenantRegistryAllows_(requestedTenantId);
  const accessRows = getRowsAsObjects_('USER_ACCESS').filter(row => userMatchesAccessRow_(userId, row) && String(row.status || 'active').toLowerCase() === 'active');
  if (!accessRows.length) throw new Error('FORBIDDEN: user belum terdaftar di USER_ACCESS.');
  const allowedRows = accessRows.filter(row => roleAllows_(row.role, requiredRole || 'owner'));
  if (!allowedRows.length) throw new Error('FORBIDDEN: role user tidak cukup untuk action ini.');
  const tenantId = requestedTenantId || allowedRows[0].tenant_id;
  setActiveTenantContext_(tenantId);
  assertTenantRegistryAllows_(tenantId);
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
    manageUsers: roleAllows_(role, 'owner'),
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
