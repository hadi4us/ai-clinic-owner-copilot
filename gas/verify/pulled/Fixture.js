function seedPhase1FixtureData_() {
  const spreadsheet = getWarehouseSpreadsheet_();
  const now = new Date();

  appendRows_(spreadsheet.getSheetByName('stg_visit'), [
    ['klinik_001', 'clinic_001', 'sync_202606_001', 'visit_001', '2026-06-01', 'V001', 'D001', 'P001', 'patient_hash_001', 'umum', 'completed', 'valid', ''],
    ['klinik_001', 'clinic_001', 'sync_202606_001', 'visit_002', '2026-06-01', 'V002', 'D002', 'P001', 'patient_hash_002', 'umum', 'completed', 'valid', ''],
    ['klinik_001', 'clinic_001', 'sync_202606_001', 'visit_003', '2026-06-02', 'V003', 'D001', 'P001', 'patient_hash_003', 'bpjs', 'completed', 'valid', ''],
    ['klinik_001', 'clinic_001', 'sync_202606_001', 'visit_004', '2026-06-02', 'V004', 'D003', 'P002', 'patient_hash_004', 'umum', 'completed', 'valid', ''],
    ['klinik_001', 'clinic_001', 'sync_202606_001', 'visit_005', '2026-06-03', 'V005', 'D001', 'P001', 'patient_hash_005', 'umum', 'completed', 'valid', ''],
  ]);

  appendRows_(spreadsheet.getSheetByName('stg_revenue'), [
    ['klinik_001', 'clinic_001', 'sync_202606_001', 'rev_001', 'TRX001', '2026-06-01', 'V001', 'D001', 'P001', 'cash', 'consultation', 250000, 'valid', ''],
    ['klinik_001', 'clinic_001', 'sync_202606_001', 'rev_002', 'TRX002', '2026-06-01', 'V002', 'D002', 'P001', 'cash', 'consultation', 300000, 'valid', ''],
    ['klinik_001', 'clinic_001', 'sync_202606_001', 'rev_003', 'TRX003', '2026-06-02', 'V003', 'D001', 'P001', 'bpjs', 'procedure', 750000, 'valid', ''],
    ['klinik_001', 'clinic_001', 'sync_202606_001', 'rev_004', 'TRX004', '2026-06-02', 'V004', 'D003', 'P002', 'cash', 'medicine', 150000, 'valid', ''],
    ['klinik_001', 'clinic_001', 'sync_202606_001', 'rev_005', 'TRX005', '2026-06-03', 'V005', 'D001', 'P001', 'cash', 'lab', 500000, 'valid', ''],
  ]);

  appendRows_(spreadsheet.getSheetByName('stg_expense'), [
    ['klinik_001', 'clinic_001', 'sync_202606_001', 'exp_001', 'EXP001', '2026-06-01', 'salary', 1000000, 'shared', 'valid', ''],
    ['klinik_001', 'clinic_001', 'sync_202606_001', 'exp_002', 'EXP002', '2026-06-02', 'rent', 500000, 'shared', 'valid', ''],
    ['klinik_001', 'clinic_001', 'sync_202606_001', 'exp_003', 'EXP003', '2026-06-03', 'utilities', 250000, 'shared', 'valid', ''],
  ]);

  appendRows_(spreadsheet.getSheetByName('fact_cost'), [
    ['klinik_001', 'clinic_001', 'cost_001', '2026-06-01', 'visit_001', 'doc_001', 'poli_001', 'doctor_fee', 100000, 'direct', 'sync_202606_001', now],
    ['klinik_001', 'clinic_001', 'cost_002', '2026-06-01', 'visit_002', 'doc_002', 'poli_001', 'doctor_fee', 120000, 'direct', 'sync_202606_001', now],
    ['klinik_001', 'clinic_001', 'cost_003', '2026-06-02', 'visit_003', 'doc_001', 'poli_001', 'lab_cost', 200000, 'direct', 'sync_202606_001', now],
    ['klinik_001', 'clinic_001', 'cost_004', '2026-06-02', 'visit_004', 'doc_003', 'poli_002', 'cogs_medicine', 90000, 'direct', 'sync_202606_001', now],
    ['klinik_001', 'clinic_001', 'cost_005', '2026-06-03', 'visit_005', 'doc_001', 'poli_001', 'lab_cost', 150000, 'direct', 'sync_202606_001', now],
  ]);

  buildFactsFromStaging_();
}
