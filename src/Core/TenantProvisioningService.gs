function getDefaultTenantAdminPayload() {
  const context = resolveRequestContext_({}, {}, 'owner');
  return getTenantAdminPayloadForContext_(context);
}

function getTenantAdminPayloadForContext_(context) {
  assertTenantScope_(context.tenantId, context.clinicId);
  if (!roleAllows_(context.role, 'owner')) throw new Error('FORBIDDEN: hanya owner/admin yang boleh melihat tenant registry.');
  const tenants = getTenantRegistry_();
  const rows = Object.keys(tenants).sort().map(function(tenantId) {
    const entry = getTenantRegistryEntry_(tenantId);
    return {
      tenantId: entry.tenantId,
      tenantName: entry.tenantName,
      status: entry.status,
      plan: entry.plan,
      ownerEmail: entry.ownerEmail,
      defaultClinicId: entry.defaultClinicId,
      warehouseSpreadsheetId: entry.warehouseSpreadsheetId,
      warehouseUrl: entry.warehouseSpreadsheetId ? 'https://docs.google.com/spreadsheets/d/' + entry.warehouseSpreadsheetId + '/edit' : '',
      warehouseConfigured: !!entry.warehouseSpreadsheetId,
    };
  });
  return {
    ok: true,
    currentTenantId: context.tenantId,
    rows: rows,
    generatedAt: Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
  };
}

function provisionDefaultTenant(request) {
  const context = resolveRequestContext_({}, {}, 'owner');
  return provisionTenantForContext_(context, request || {});
}

function provisionTenantForContext_(context, request) {
  assertTenantScope_(context.tenantId, context.clinicId);
  if (!roleAllows_(context.role, 'owner')) throw new Error('FORBIDDEN: hanya owner/admin yang boleh provisioning tenant.');
  const spec = normalizeTenantProvisionRequest_(request || {});
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(APP_CONFIG.lockWaitMs || 30000)) throw new Error('Provisioning tenant sedang berjalan. Coba lagi sebentar.');
  try {
    const existing = getTenantRegistryEntry_(spec.tenantId);
    let spreadsheetId = existing && existing.warehouseSpreadsheetId ? existing.warehouseSpreadsheetId : '';
    let createdSpreadsheet = false;
    if (!spreadsheetId) {
      const spreadsheet = SpreadsheetApp.create('AI Clinic Warehouse - ' + spec.tenantName);
      spreadsheetId = spreadsheet.getId();
      createdSpreadsheet = true;
    }
    const registryEntry = upsertTenantRegistryEntry_({
      tenantId: spec.tenantId,
      tenantName: spec.tenantName,
      status: spec.status,
      plan: spec.plan,
      ownerEmail: spec.ownerEmail,
      warehouseSpreadsheetId: spreadsheetId,
      defaultClinicId: spec.clinicId,
    });
    const seed = seedProvisionedTenantWarehouse_(spec, spreadsheetId);
    writeAudit_(context.userEmail || context.actorId || 'owner', context.role || 'owner', 'tenant_provision', 'TENANT_REGISTRY_JSON', {
      tenantId: spec.tenantId,
      tenantName: spec.tenantName,
      ownerEmail: spec.ownerEmail,
      spreadsheetId: spreadsheetId,
      createdSpreadsheet: createdSpreadsheet,
    });
    return {
      ok: true,
      tenantId: spec.tenantId,
      tenantName: spec.tenantName,
      clinicId: spec.clinicId,
      ownerEmail: spec.ownerEmail,
      status: registryEntry.status,
      plan: registryEntry.plan,
      spreadsheetId: spreadsheetId,
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/edit',
      idempotent: !createdSpreadsheet,
      createdSpreadsheet: createdSpreadsheet,
      seed: seed,
      registry: getTenantAdminPayloadForContext_(context),
    };
  } finally {
    lock.releaseLock();
  }
}

function seedProvisionedTenantWarehouse_(spec, spreadsheetId) {
  const previousTenantId = getActiveTenantId_();
  setActiveTenantContext_(spec.tenantId);
  try {
    const now = new Date();
    const schema = ensureWarehouseSchemaOnlyNoLock_();
    replaceObjectsWhere_('MASTER_TENANT', function(row) {
      return String(row.tenant_id || '') === spec.tenantId;
    }, [{
      tenant_id: spec.tenantId,
      tenant_name: spec.tenantName,
      owner_name: spec.ownerName || spec.ownerEmail,
      timezone: APP_CONFIG.timezone,
      currency: 'IDR',
      status: spec.status,
      created_at: now,
      updated_at: now,
    }]);
    replaceObjectsWhere_('MASTER_KLINIK', function(row) {
      return String(row.tenant_id || '') === spec.tenantId && String(row.clinic_id || '') === spec.clinicId;
    }, [{
      tenant_id: spec.tenantId,
      clinic_id: spec.clinicId,
      clinic_name: spec.clinicName,
      clinic_type: spec.clinicType,
      city: spec.city,
      address_summary: spec.addressSummary,
      timezone: APP_CONFIG.timezone,
      currency: 'IDR',
      status: 'active',
      created_at: now,
      updated_at: now,
    }]);
    replaceObjectsWhere_('USER_ACCESS', function(row) {
      return String(row.tenant_id || '') === spec.tenantId && userMatchesAccessRow_(spec.ownerEmail, row);
    }, [{
      tenant_id: spec.tenantId,
      user_id: spec.ownerEmail,
      user_name: spec.ownerName || 'Tenant Owner',
      email: spec.ownerEmail,
      telegram_id: '',
      whatsapp_id: '',
      role: 'owner',
      clinic_scope: spec.clinicId,
      status: 'active',
      last_login_at: '',
      created_at: now,
      updated_at: now,
    }]);
    seedDefaultCoaForTenant_(spec.tenantId, now);
    writeAudit_(spec.ownerEmail, 'owner', 'tenant_seed', 'tenant_warehouse', {
      tenantId: spec.tenantId,
      clinicId: spec.clinicId,
      spreadsheetId: spreadsheetId,
    });
    return {
      schemaSheets: schema.sheetsCreatedOrUpdated,
      tenantSeeded: true,
      clinicSeeded: true,
      ownerAccessSeeded: true,
      coaSeeded: true,
    };
  } finally {
    setActiveTenantContext_(previousTenantId);
  }
}

function seedDefaultCoaForTenant_(tenantId, now) {
  const existingKeys = getRowsAsObjects_('MASTER_COA')
    .filter(function(row) { return String(row.tenant_id || '') === tenantId; })
    .reduce(function(acc, row) {
      if (row.account_id) acc[String(row.account_id)] = true;
      if (row.account_code) acc['code:' + String(row.account_code)] = true;
      return acc;
    }, {});
  const missing = getDefaultClinicCoaRows_(tenantId, now).filter(function(row) {
    return !existingKeys[String(row.account_id)] && !existingKeys['code:' + String(row.account_code)];
  });
  if (missing.length) appendObjects_('MASTER_COA', missing);
  return missing.length;
}

function normalizeTenantProvisionRequest_(request) {
  const tenantName = String(request.tenantName || request.tenant_name || '').trim();
  const clinicName = String(request.clinicName || request.clinic_name || tenantName || '').trim();
  const ownerEmail = normalizeEmail_(request.ownerEmail || request.owner_email || request.email);
  if (!tenantName) throw new Error('Nama tenant wajib diisi.');
  if (!clinicName) throw new Error('Nama klinik wajib diisi.');
  if (!ownerEmail || ownerEmail.indexOf('@') === -1) throw new Error('Email owner tenant tidak valid.');
  const tenantId = sanitizeProvisionId_(request.tenantId || request.tenant_id || tenantName, 'tenant');
  const clinicId = sanitizeProvisionId_(request.clinicId || request.clinic_id || clinicName, 'clinic');
  const status = String(request.status || 'trial').trim().toLowerCase();
  if (['trial', 'active'].indexOf(status) === -1) throw new Error('Status tenant provisioning harus trial atau active.');
  return {
    tenantId: tenantId,
    tenantName: tenantName,
    clinicId: clinicId,
    clinicName: clinicName,
    clinicType: String(request.clinicType || request.clinic_type || 'pratama').trim() || 'pratama',
    city: String(request.city || '').trim(),
    addressSummary: String(request.addressSummary || request.address_summary || '').trim(),
    ownerEmail: ownerEmail,
    ownerName: String(request.ownerName || request.owner_name || 'Tenant Owner').trim() || 'Tenant Owner',
    status: status,
    plan: String(request.plan || 'trial').trim().toLowerCase() || 'trial',
  };
}

function sanitizeProvisionId_(value, prefix) {
  const slug = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return slug || prefix + '_' + Utilities.getUuid().slice(0, 8);
}
