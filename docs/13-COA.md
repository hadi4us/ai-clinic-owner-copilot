# 13. Chart of Accounts (COA)

## Purpose

COA normalizes finance categories from SIM Klinik exports or external finance sheets into owner-readable reporting groups.

## Phase 1 Minimal COA

### Revenue

- `consultation`
- `procedure`
- `medicine`
- `lab`
- `other_revenue`

### Direct Cost

- `doctor_fee`
- `medicine_cost`
- `lab_cost`
- `medical_supply`
- `other_direct_cost`

### Operating Expense

- `salary`
- `rent`
- `utilities`
- `marketing`
- `admin`
- `maintenance`
- `other_operating_expense`

## Rule

If source data cannot distinguish direct cost from operating expense, mark `data_status` as `estimated` or `incomplete`.
