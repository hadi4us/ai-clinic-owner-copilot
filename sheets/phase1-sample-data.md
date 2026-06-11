# Phase 1 Sample Data

## Purpose

This file defines synthetic sample data for Phase 1 pipeline testing when real SIM Klinik exports are not available yet.

Synthetic data is only for development. Real implementation must adapt mapping to actual SIM Klinik export from MasBro.

## Tenant Fixture

### cfg_tenant

```csv
tenant_id,tenant_name,status,timezone,currency,created_at,updated_at
klinik_001,Klinik Sehat Sentosa,active,Asia/Jakarta,IDR,2026-06-01T00:00:00+07:00,2026-06-01T00:00:00+07:00
```

### cfg_clinic

```csv
tenant_id,clinic_id,clinic_name,clinic_type,status
klinik_001,clinic_001,Klinik Sehat Sentosa,pratama,active
```

## Revenue Fixture

### stg_revenue

```csv
tenant_id,clinic_id,sync_id,source_row_id,source_transaction_id,transaction_date,source_visit_id,source_doctor_id,source_poli_id,payer_type,revenue_category,amount,validation_status,validation_notes
klinik_001,clinic_001,sync_202606_001,rev_001,TRX001,2026-06-01,V001,D001,P001,cash,consultation,250000,valid,
klinik_001,clinic_001,sync_202606_001,rev_002,TRX002,2026-06-01,V002,D002,P001,cash,consultation,300000,valid,
klinik_001,clinic_001,sync_202606_001,rev_003,TRX003,2026-06-02,V003,D001,P001,bpjs,procedure,750000,valid,
klinik_001,clinic_001,sync_202606_001,rev_004,TRX004,2026-06-02,V004,D003,P002,cash,medicine,150000,valid,
klinik_001,clinic_001,sync_202606_001,rev_005,TRX005,2026-06-03,V005,D001,P001,cash,lab,500000,valid,
```

## Visit Fixture

### stg_visit

```csv
tenant_id,clinic_id,sync_id,source_row_id,visit_date,source_visit_id,source_doctor_id,source_poli_id,patient_ref,visit_type,status,validation_status,validation_notes
klinik_001,clinic_001,sync_202606_001,visit_001,2026-06-01,V001,D001,P001,patient_hash_001,umum,completed,valid,
klinik_001,clinic_001,sync_202606_001,visit_002,2026-06-01,V002,D002,P001,patient_hash_002,umum,completed,valid,
klinik_001,clinic_001,sync_202606_001,visit_003,2026-06-02,V003,D001,P001,patient_hash_003,bpjs,completed,valid,
klinik_001,clinic_001,sync_202606_001,visit_004,2026-06-02,V004,D003,P002,patient_hash_004,umum,completed,valid,
klinik_001,clinic_001,sync_202606_001,visit_005,2026-06-03,V005,D001,P001,patient_hash_005,umum,completed,valid,
```

## Cost Fixture

### fact_cost

```csv
tenant_id,clinic_id,cost_id,cost_date,visit_id,doctor_id,poli_id,cost_category,amount,allocation_method,sync_id,created_at
klinik_001,clinic_001,cost_001,2026-06-01,visit_001,doc_001,poli_001,doctor_fee,100000,direct,sync_202606_001,2026-06-03T10:00:00+07:00
klinik_001,clinic_001,cost_002,2026-06-01,visit_002,doc_002,poli_001,doctor_fee,120000,direct,sync_202606_001,2026-06-03T10:00:00+07:00
klinik_001,clinic_001,cost_003,2026-06-02,visit_003,doc_001,poli_001,lab_cost,200000,direct,sync_202606_001,2026-06-03T10:00:00+07:00
klinik_001,clinic_001,cost_004,2026-06-02,visit_004,doc_003,poli_002,cogs_medicine,90000,direct,sync_202606_001,2026-06-03T10:00:00+07:00
klinik_001,clinic_001,cost_005,2026-06-03,visit_005,doc_001,poli_001,lab_cost,150000,direct,sync_202606_001,2026-06-03T10:00:00+07:00
```

## Expense Fixture

### stg_expense

```csv
tenant_id,clinic_id,sync_id,source_row_id,source_expense_id,expense_date,expense_category,amount,allocation_target,validation_status,validation_notes
klinik_001,clinic_001,sync_202606_001,exp_001,EXP001,2026-06-01,salary,1000000,shared,valid,
klinik_001,clinic_001,sync_202606_001,exp_002,EXP002,2026-06-02,rent,500000,shared,valid,
klinik_001,clinic_001,sync_202606_001,exp_003,EXP003,2026-06-03,utilities,250000,shared,valid,
```

## Expected KPI From Fixture

### Revenue

```text
total_revenue = 250,000 + 300,000 + 750,000 + 150,000 + 500,000
              = 1,950,000
```

### Visits

```text
total_visits = 5
```

### Direct Cost

```text
direct_cost = 100,000 + 120,000 + 200,000 + 90,000 + 150,000
            = 660,000
```

### Operating Expense

```text
operating_expense = 1,000,000 + 500,000 + 250,000
                  = 1,750,000
```

### Gross Profit

```text
gross_profit = 1,950,000 - 660,000
             = 1,290,000
```

### Net Profit

```text
net_profit = 1,290,000 - 1,750,000
           = -460,000
```

### Profit Margin

```text
profit_margin = -460,000 / 1,950,000
              = -0.2359
```

## Why This Fixture Has Negative Profit

This is intentional for test coverage. It proves the dashboard can show:

- loss condition.
- negative profit margin.
- operating expense impact.
- warning/action state.

A larger complete-profit fixture should be added later for normal monthly scenario.
