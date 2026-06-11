# Mapping Template: default_phase1_v1

## Purpose

Default synthetic Phase 1 mapping template. Replace or extend once real SIM Klinik export is available.

## Visit Mapping

| Source Column | Target Column | Required | Transform |
|---|---|---:|---|
| visit_id | source_visit_id | yes | trim_string |
| visit_date | visit_date | yes | parse_date |
| doctor_id | source_doctor_id | no | trim_string |
| poli_id | source_poli_id | no | trim_string |
| patient_ref | patient_ref | no | hash_or_passthrough_pseudonym |
| visit_type | visit_type | no | normalize_visit_type |
| status | status | yes | normalize_visit_status |

## Revenue Mapping

| Source Column | Target Column | Required | Transform |
|---|---|---:|---|
| transaction_id | source_transaction_id | yes | trim_string |
| transaction_date | transaction_date | yes | parse_date |
| visit_id | source_visit_id | no | trim_string |
| doctor_id | source_doctor_id | no | trim_string |
| poli_id | source_poli_id | no | trim_string |
| payer_type | payer_type | no | normalize_payer_type |
| category | revenue_category | yes | normalize_revenue_category |
| amount | amount | yes | parse_idr_number |

## Expense Mapping

| Source Column | Target Column | Required | Transform |
|---|---|---:|---|
| expense_id | source_expense_id | no | trim_string |
| expense_date | expense_date | yes | parse_date |
| category | expense_category | yes | normalize_expense_category |
| amount | amount | yes | parse_idr_number |
| allocation_target | allocation_target | no | normalize_allocation_target |
