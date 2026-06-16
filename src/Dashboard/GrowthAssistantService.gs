/**
 * GrowthAssistantService.js
 * Rule-based AI growth companion for owner clinic follow-up/campaign planning.
 * It works on anonymized warehouse data and never requires replacing SIM Klinik.
 */
function getGrowthAssistantPayloadForContext_(context, period) {
  const resolvedPeriod = period || getLatestAvailablePeriodForContext_(context) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM');
  const cached = getGrowthAssistantPayloadFromCache_(context.tenantId, context.clinicId, resolvedPeriod);
  if (cached) return cached;
  const payload = getGrowthAssistantPayload(context.tenantId, context.clinicId, resolvedPeriod);
  putGrowthAssistantPayloadCache_(context.tenantId, context.clinicId, resolvedPeriod, payload);
  return payload;
}

function getDefaultGrowthAssistantPayload(period) {
  const context = resolveRequestContext_({}, {}, 'viewer');
  return getGrowthAssistantPayloadForContext_(context, period);
}

function getGrowthAssistantPayload(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  const patientProfiles = buildGrowthPatientProfiles_(tenantId, clinicId, period);
  const segments = buildGrowthSegments_(patientProfiles, period);
  const campaigns = buildGrowthCampaigns_(segments, period);
  const ownerBrief = buildGrowthOwnerBrief_(segments, campaigns);
  const dataStatus = determineGrowthDataStatus_(patientProfiles, segments);

  return {
    ok: true,
    tenantId: tenantId,
    clinicId: clinicId,
    period: period,
    generatedAt: Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
    basis: 'rule_based_growth_ai',
    positioning: 'Pendamping SIM Klinik, bukan pengganti SIM.',
    dataStatus: dataStatus.status,
    confidence: dataStatus.confidence,
    summary: {
      totalPatients: patientProfiles.length,
      activePatients: segments.active.length,
      newPatients: segments.newPatients.length,
      followupDue: segments.followupDue.length,
      dormantPatients: segments.dormant.length,
      highValuePatients: segments.highValue.length,
      receivablePatients: segments.receivable.length,
    },
    segments: {
      active: segments.active.slice(0, 30).map(normalizeGrowthPatientForClient_),
      newPatients: segments.newPatients.slice(0, 30).map(normalizeGrowthPatientForClient_),
      followupDue: segments.followupDue.slice(0, 30).map(normalizeGrowthPatientForClient_),
      dormant: segments.dormant.slice(0, 30).map(normalizeGrowthPatientForClient_),
      highValue: segments.highValue.slice(0, 30).map(normalizeGrowthPatientForClient_),
      receivable: segments.receivable.slice(0, 30).map(normalizeGrowthPatientForClient_),
    },
    campaigns: campaigns,
    ownerBrief: ownerBrief,
    guardrails: [
      'Tidak mengganti SIM Klinik dan tidak membuat double entry.',
      'Pasien ditampilkan sebagai patient_ref anonim.',
      'Draft pesan perlu approval manusia sebelum dikirim.',
      'Jangan masukkan diagnosis, rekam medis, NIK, alamat, atau nomor HP ke modul ini.',
    ],
  };
}

function buildGrowthPatientProfiles_(tenantId, clinicId, period) {
  const patients = {};
  const patientRefs = getScopedRows_('PASIEN_REF', tenantId, clinicId);
  const visits = getScopedRows_('KUNJUNGAN', tenantId, clinicId);
  const revenues = getScopedRows_('PENDAPATAN', tenantId, clinicId);
  const visitPatientMap = {};

  patientRefs.forEach(row => {
    const ref = String(row.patient_ref || row.source_patient_id_hash || '').trim();
    if (!ref) return;
    patients[ref] = makeGrowthPatientProfile_(ref, row.first_visit_date, row.last_visit_date, row.status);
    patients[ref].ageBucket = row.age_bucket || '';
    patients[ref].gender = row.gender || '';
  });

  visits.forEach(row => {
    const ref = String(row.patient_ref || '').trim();
    if (!ref) return;
    const profile = patients[ref] || makeGrowthPatientProfile_(ref, '', '', '');
    const date = toIsoDateString_(row.visit_date);
    profile.visitCount += 1;
    profile.currentPeriodVisits += toPeriodString_(date) === period ? 1 : 0;
    profile.firstVisitDate = minGrowthDate_(profile.firstVisitDate, date);
    profile.lastVisitDate = maxGrowthDate_(profile.lastVisitDate, date);
    profile.lastService = row.service_name || row.service_category || profile.lastService || '';
    profile.lastPayerType = row.payer_type || row.patient_type || profile.lastPayerType || '';
    profile.lastDoctorId = row.doctor_id || profile.lastDoctorId || '';
    profile.lastPoliId = row.poli_id || profile.lastPoliId || '';
    profile.status = row.status || profile.status || '';
    if (row.visit_id) visitPatientMap[String(row.visit_id)] = ref;
    patients[ref] = profile;
  });

  revenues.forEach(row => {
    const ref = resolveGrowthRevenuePatientRef_(row, visitPatientMap);
    if (!ref) return;
    const profile = patients[ref] || makeGrowthPatientProfile_(ref, '', '', '');
    const date = toIsoDateString_(row.transaction_date);
    const amount = asNumber_(row.net_amount, 0);
    const receivable = asNumber_(row.receivable_amount, 0);
    profile.revenue += amount;
    profile.currentPeriodRevenue += toPeriodString_(date) === period ? amount : 0;
    profile.receivable += receivable;
    profile.transactionCount += 1;
    profile.firstVisitDate = minGrowthDate_(profile.firstVisitDate, date);
    profile.lastVisitDate = maxGrowthDate_(profile.lastVisitDate, date);
    profile.lastService = row.item_name || row.revenue_type || profile.lastService || '';
    profile.lastPayerType = row.payer_type || row.payment_method || profile.lastPayerType || '';
    profile.lastDoctorId = row.doctor_id || profile.lastDoctorId || '';
    profile.lastPoliId = row.poli_id || profile.lastPoliId || '';
    patients[ref] = profile;
  });

  return Object.keys(patients).map(ref => patients[ref]).filter(profile => profile.patientRef);
}

function makeGrowthPatientProfile_(patientRef, firstVisitDate, lastVisitDate, status) {
  return {
    patientRef: patientRef,
    firstVisitDate: toIsoDateString_(firstVisitDate),
    lastVisitDate: toIsoDateString_(lastVisitDate),
    status: status || '',
    ageBucket: '',
    gender: '',
    visitCount: 0,
    currentPeriodVisits: 0,
    transactionCount: 0,
    revenue: 0,
    currentPeriodRevenue: 0,
    receivable: 0,
    lastService: '',
    lastPayerType: '',
    lastDoctorId: '',
    lastPoliId: '',
    segmentReason: '',
    priorityScore: 0,
  };
}

function resolveGrowthRevenuePatientRef_(row, visitPatientMap) {
  if (row.patient_ref) return String(row.patient_ref).trim();
  if (row.visit_id && visitPatientMap && visitPatientMap[String(row.visit_id)]) return visitPatientMap[String(row.visit_id)];
  if (row.visit_id) return 'visit_' + String(row.visit_id).replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  if (row.transaction_id) return 'trx_' + String(row.transaction_id).replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  return '';
}

function buildGrowthSegments_(profiles, period) {
  const referenceDate = getGrowthReferenceDate_(period);
  const avgRevenue = profiles.length ? profiles.reduce((sum, p) => sum + Number(p.revenue || 0), 0) / profiles.length : 0;
  const active = [];
  const newPatients = [];
  const followupDue = [];
  const dormant = [];
  const highValue = [];
  const receivable = [];

  profiles.forEach(profile => {
    const daysSinceLast = getGrowthDaysBetween_(profile.lastVisitDate, referenceDate);
    const firstPeriod = toPeriodString_(profile.firstVisitDate);
    const lastPeriod = toPeriodString_(profile.lastVisitDate);
    profile.daysSinceLastVisit = daysSinceLast;
    profile.priorityScore = calculateGrowthPriorityScore_(profile, daysSinceLast, avgRevenue);

    if (lastPeriod === period || profile.currentPeriodVisits > 0 || profile.currentPeriodRevenue > 0) {
      profile.segmentReason = 'Aktif pada periode ini.';
      active.push(Object.assign({}, profile));
    }
    if (firstPeriod === period) {
      const item = Object.assign({}, profile);
      item.segmentReason = 'Pasien baru periode ini; cocok untuk welcome follow-up.';
      newPatients.push(item);
    }
    if (daysSinceLast >= 7 && daysSinceLast <= 45 && (lastPeriod === period || profile.currentPeriodRevenue > 0 || profile.currentPeriodVisits > 0)) {
      const item = Object.assign({}, profile);
      item.segmentReason = 'Sudah lewat ' + daysSinceLast + ' hari sejak kunjungan/transaksi terakhir.';
      followupDue.push(item);
    }
    if (daysSinceLast > 60 && (profile.visitCount > 0 || profile.revenue > 0)) {
      const item = Object.assign({}, profile);
      item.segmentReason = 'Tidak kembali lebih dari 60 hari.';
      dormant.push(item);
    }
    if ((avgRevenue && profile.revenue >= avgRevenue * 1.5) || profile.visitCount >= 3) {
      const item = Object.assign({}, profile);
      item.segmentReason = 'Kontribusi revenue/kunjungan lebih tinggi dari rata-rata.';
      highValue.push(item);
    }
    if (profile.receivable > 0) {
      const item = Object.assign({}, profile);
      item.segmentReason = 'Masih ada piutang/claim outstanding.';
      receivable.push(item);
    }
  });

  return {
    active: sortGrowthProfiles_(active),
    newPatients: sortGrowthProfiles_(newPatients),
    followupDue: sortGrowthProfiles_(followupDue),
    dormant: sortGrowthProfiles_(dormant),
    highValue: sortGrowthProfiles_(highValue),
    receivable: sortGrowthProfiles_(receivable),
  };
}

function buildGrowthCampaigns_(segments, period) {
  const campaigns = [];
  if (segments.followupDue.length) {
    campaigns.push(makeGrowthCampaign_(
      'followup_due',
      'Follow-up pasca kunjungan',
      segments.followupDue.length,
      'Pasien sudah lewat 7-45 hari sejak kunjungan/transaksi terakhir.',
      'Halo, kami dari Klinik. Semoga kondisi Bapak/Ibu semakin baik. Jika perlu kontrol atau konsultasi lanjutan, kami siap bantu jadwalkan waktu yang nyaman.',
      'Naikkan repeat visit dan tutup peluang pasien lupa kontrol.'
    ));
  }
  if (segments.dormant.length) {
    campaigns.push(makeGrowthCampaign_(
      'reactivate_dormant',
      'Aktivasi pasien dormant',
      segments.dormant.length,
      'Pasien tidak kembali lebih dari 60 hari.',
      'Halo, kami dari Klinik. Sudah cukup lama sejak kunjungan terakhir. Jika Bapak/Ibu ingin cek kondisi atau butuh layanan lanjutan, kami bisa bantu atur jadwal.',
      'Menghidupkan kembali database lama tanpa mencari pasien baru dari nol.'
    ));
  }
  if (segments.newPatients.length) {
    campaigns.push(makeGrowthCampaign_(
      'welcome_new_patient',
      'Welcome follow-up pasien baru',
      segments.newPatients.length,
      'Pasien baru perlu pengalaman follow-up yang rapi.',
      'Halo, terima kasih sudah berkunjung ke Klinik. Jika ada pertanyaan setelah kunjungan atau ingin jadwal kontrol, tim kami siap membantu.',
      'Meningkatkan trust dan peluang kunjungan kedua.'
    ));
  }
  if (segments.highValue.length) {
    campaigns.push(makeGrowthCampaign_(
      'high_value_care',
      'Retention pasien high-value',
      segments.highValue.length,
      'Pasien dengan revenue/kunjungan tinggi perlu dipertahankan.',
      'Halo, kami ingin memastikan layanan terakhir berjalan baik. Bila Bapak/Ibu ingin reservasi prioritas atau jadwal lanjutan, kami siap bantu.',
      'Menjaga pasien bernilai tinggi agar tidak pindah ke kompetitor.'
    ));
  }
  if (segments.receivable.length) {
    campaigns.push(makeGrowthCampaign_(
      'receivable_followup',
      'Follow-up piutang/claim',
      segments.receivable.length,
      'Ada transaksi dengan piutang atau klaim outstanding.',
      'Halo, kami dari Klinik ingin mengonfirmasi administrasi kunjungan sebelumnya. Mohon hubungi admin bila perlu bantuan kelengkapan data.',
      'Mempercepat collection tanpa membuka detail klinis.'
    ));
  }
  return campaigns.slice(0, 5).map(function(campaign, index) {
    campaign.priority = index + 1;
    campaign.period = period;
    return campaign;
  });
}

function makeGrowthCampaign_(type, title, audienceCount, reason, messageTemplate, expectedImpact) {
  return {
    type: type,
    title: title,
    audienceCount: audienceCount,
    reason: reason,
    channel: 'WhatsApp draft',
    messageTemplate: messageTemplate,
    expectedImpact: expectedImpact,
    approvalRequired: true,
  };
}

function buildGrowthOwnerBrief_(segments, campaigns) {
  const actions = [];
  if (segments.followupDue.length) actions.push('Hubungi ' + segments.followupDue.length + ' pasien yang perlu follow-up pasca kunjungan.');
  if (segments.dormant.length) actions.push('Jalankan campaign reaktivasi untuk ' + segments.dormant.length + ' pasien dormant.');
  if (segments.highValue.length) actions.push('Prioritaskan retention untuk ' + segments.highValue.length + ' pasien high-value.');
  if (segments.receivable.length) actions.push('Koordinasikan follow-up administrasi untuk ' + segments.receivable.length + ' pasien/piutang outstanding.');
  if (!actions.length) actions.push('Data growth belum cukup; import/export data kunjungan dan transaksi dari SIM Klinik dulu.');
  return {
    headline: campaigns.length ? 'Ada ' + campaigns.length + ' campaign growth yang siap direview owner.' : 'Belum ada campaign growth yang cukup kuat dari data tersedia.',
    nextActions: actions.slice(0, 4),
  };
}

function determineGrowthDataStatus_(profiles, segments) {
  if (!profiles.length) return { status: 'incomplete', confidence: 'low' };
  if (segments.active.length || segments.followupDue.length || segments.highValue.length) return { status: 'estimated', confidence: 'medium' };
  return { status: 'estimated', confidence: 'low' };
}

function normalizeGrowthPatientForClient_(profile) {
  return {
    patientRef: profile.patientRef,
    firstVisitDate: profile.firstVisitDate || '',
    lastVisitDate: profile.lastVisitDate || '',
    daysSinceLastVisit: profile.daysSinceLastVisit === null || profile.daysSinceLastVisit === undefined ? '' : profile.daysSinceLastVisit,
    visitCount: profile.visitCount || 0,
    currentPeriodVisits: profile.currentPeriodVisits || 0,
    revenue: Number(profile.revenue || 0),
    currentPeriodRevenue: Number(profile.currentPeriodRevenue || 0),
    receivable: Number(profile.receivable || 0),
    lastService: profile.lastService || '',
    lastPayerType: profile.lastPayerType || '',
    reason: profile.segmentReason || '',
    priorityScore: Number(profile.priorityScore || 0),
  };
}

function calculateGrowthPriorityScore_(profile, daysSinceLast, avgRevenue) {
  var score = 0;
  if (daysSinceLast >= 7 && daysSinceLast <= 45) score += 30;
  if (daysSinceLast > 60) score += 25;
  if (avgRevenue && profile.revenue >= avgRevenue * 1.5) score += 25;
  if (profile.visitCount >= 3) score += 15;
  if (profile.receivable > 0) score += 10;
  return score;
}

function sortGrowthProfiles_(profiles) {
  return (profiles || []).sort(function(a, b) {
    return Number(b.priorityScore || 0) - Number(a.priorityScore || 0) || String(b.lastVisitDate || '').localeCompare(String(a.lastVisitDate || ''));
  });
}

function getGrowthReferenceDate_(period) {
  const text = String(period || '');
  if (/^\d{4}-\d{2}$/.test(text)) {
    return Utilities.formatDate(new Date(Number(text.slice(0, 4)), Number(text.slice(5, 7)), 0), APP_CONFIG.timezone, 'yyyy-MM-dd');
  }
  return Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM-dd');
}

function getGrowthDaysBetween_(fromDate, toDate) {
  if (!fromDate || !toDate) return 9999;
  const from = new Date(String(fromDate).slice(0, 10) + 'T00:00:00Z');
  const to = new Date(String(toDate).slice(0, 10) + 'T00:00:00Z');
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 9999;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86400000));
}

function minGrowthDate_(currentValue, candidateValue) {
  if (!candidateValue) return currentValue || '';
  if (!currentValue) return candidateValue;
  return String(candidateValue) < String(currentValue) ? candidateValue : currentValue;
}

function maxGrowthDate_(currentValue, candidateValue) {
  if (!candidateValue) return currentValue || '';
  if (!currentValue) return candidateValue;
  return String(candidateValue) > String(currentValue) ? candidateValue : currentValue;
}

function getGrowthAssistantPayloadCacheKey_(tenantId, clinicId, period) {
  return ['growth_ai_payload_v1', tenantId, clinicId, period || 'latest'].join(':');
}

function getGrowthAssistantPayloadFromCache_(tenantId, clinicId, period) {
  try {
    const raw = CacheService.getScriptCache().get(getGrowthAssistantPayloadCacheKey_(tenantId, clinicId, period));
    if (!raw) return null;
    const payload = JSON.parse(raw);
    payload.cache = { hit: true, ttlSeconds: APP_CONFIG.dashboardCacheTtlSeconds || 120 };
    return payload;
  } catch (err) {
    return null;
  }
}

function putGrowthAssistantPayloadCache_(tenantId, clinicId, period, payload) {
  try {
    const ttl = APP_CONFIG.dashboardCacheTtlSeconds || 120;
    const clone = JSON.parse(JSON.stringify(payload));
    clone.cache = { hit: false, ttlSeconds: ttl };
    CacheService.getScriptCache().put(getGrowthAssistantPayloadCacheKey_(tenantId, clinicId, period), JSON.stringify(clone), ttl);
  } catch (err) {
    // Best effort. Growth AI should still render if cache is unavailable or payload grows too large.
  }
}

function invalidateGrowthAssistantCache_(tenantId, clinicId, period) {
  try {
    const cache = CacheService.getScriptCache();
    const keys = [];
    if (period) keys.push(getGrowthAssistantPayloadCacheKey_(tenantId, clinicId, period));
    keys.push(getGrowthAssistantPayloadCacheKey_(tenantId, clinicId, Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM')));
    keys.push(getGrowthAssistantPayloadCacheKey_(tenantId, clinicId, getLatestAvailablePeriodForScope_(tenantId, clinicId) || 'latest'));
    cache.removeAll(Array.from(new Set(keys)));
  } catch (err) {
    // Best-effort cache invalidation.
  }
}
