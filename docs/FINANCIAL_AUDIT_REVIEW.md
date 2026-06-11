# Financial Audit Review

Status: **Internal Audit Review / Management Accounting Readiness**  
Scope: Jurnal, Buku Besar, Neraca Saldo, dan Laporan Laba Rugi untuk AI Clinic Owner Copilot.  
Comparison baseline: prinsip akuntansi Indonesia untuk entitas privat/klinik, terutama pembukuan berpasangan, basis akrual, konsistensi COA, jejak audit, dan penyajian laporan keuangan sesuai praktik SAK/SAK EMKM/SAK ETAP yang relevan.

> Catatan penting: dokumen ini adalah review desain dan implementasi internal, bukan opini audit independen dan bukan pengganti pemeriksaan akuntan publik.

---

## 1. Executive Summary

Finance Engine sudah mengarah ke fondasi akuntansi yang benar: laporan dibangun dari `journal_entry`, `journal_line`, dan `cfg_coa`, bukan langsung dari dashboard/KPI. Ini sesuai prinsip dasar akuntansi Indonesia: setiap angka laporan harus dapat ditelusuri ke transaksi, dijurnal secara seimbang, diposting ke buku besar, masuk neraca saldo, lalu disajikan dalam laporan keuangan.

Namun untuk dianggap siap produksi/pilot dengan standar audit yang kuat, masih ada beberapa gap penting:

| Area | Audit Verdict | Ringkasan |
|---|---|---|
| Jurnal | **Partially compliant** | Sudah cek debit = credit, tetapi validasi status, COA, source trace, tanggal, dan approval belum cukup kuat. |
| Buku Besar | **Partially compliant** | Dibangun dari jurnal, tetapi belum ada opening balance, running balance, closing process, dan kontrol periode. |
| Neraca Saldo | **Partially compliant** | Diturunkan dari buku besar dan balance check tersedia, tetapi perlakuan saldo negatif/normal balance perlu diperkuat. |
| Laporan Laba Rugi | **Partially compliant** | Formula benar secara manajemen, tetapi klasifikasi COA dan completeness direct cost/opex perlu validasi lebih ketat. |
| Traceability | **Partially compliant** | Dokumen mensyaratkan trace map, tetapi implementasi aktif belum membuktikan semua laporan memakai `finance_trace_map`. |
| Indonesian accounting readiness | **Management-ready, not audit-ready** | Cocok untuk owner BI/management reporting; belum cukup untuk laporan keuangan resmi/audited. |

Kesimpulan: **layak sebagai Management Accounting Engine MVP**, tetapi belum boleh disebut financial statement final sesuai praktik akuntansi Indonesia sampai kontrol jurnal, COA, periode, traceability, dan closing diperkuat.

---

## 2. Indonesian Accounting Principles Used as Review Baseline

Review ini membandingkan engine dengan prinsip umum akuntansi Indonesia berikut:

1. **Pembukuan berpasangan / double-entry accounting**  
   Setiap transaksi harus memiliki debit dan kredit seimbang.

2. **Basis akrual**  
   Pendapatan dan beban diakui saat terjadi/terutang, bukan hanya saat kas diterima/dibayar, kecuali laporan eksplisit memakai basis kas.

3. **Substansi mengungguli bentuk**  
   Klasifikasi akun harus mengikuti substansi ekonomi transaksi, misalnya BPJS receivable sebagai piutang, bukan kas.

4. **Konsistensi dan komparabilitas**  
   COA, kategori biaya, periode, dan mapping harus konsisten antar periode.

5. **Keterlacakan / audit trail**  
   Setiap angka laporan harus dapat ditelusuri ke jurnal, transaksi sumber, import batch, dan dokumen/source row.

6. **Periodisasi / cut-off**  
   Transaksi harus dicatat pada periode yang benar.

7. **Kelengkapan**  
   Seluruh pendapatan, biaya langsung, biaya operasional, piutang, utang, aset, dan ekuitas material harus tercakup.

8. **Penyajian wajar dan konservatif**  
   Jika data belum lengkap atau belum traceable, sistem wajib memberi caveat dan tidak menyebut angka sebagai final.

9. **Pemisahan laporan manajemen vs laporan resmi**  
   Output MVP boleh menjadi laporan manajemen, tetapi laporan resmi butuh closing, adjustment, rekonsiliasi bank, AR/AP aging, depresiasi, pajak, dan review akuntan.

---

## 3. Scope Pemeriksaan

Pemeriksaan dilakukan terhadap desain dan source yang relevan:

- `docs/FINANCE_ENGINE.md`
- `docs/18-ACCOUNTING-TRACEABILITY.md`
- `docs/17-DATA-QUALITY-RULES.md`
- `docs/SPREADSHEET_SCHEMA_FINAL.md`
- `docs/13-COA.md`
- `src/Finance/JournalService.gs`
- `src/Finance/LedgerService.gs`
- `src/Finance/ProfitLossService.gs`
- `src/Finance/BalanceSheetService.gs`
- `src/Finance/FinanceEngineCommon.gs`
- `src/Finance/AccountingTraceability.gs`
- `src/Finance/DataQualityService.gs`

Requested focus:

1. Jurnal.
2. Buku Besar.
3. Neraca Saldo.
4. Laporan Laba Rugi.

---

## 4. Architecture Review

### 4.1 Expected Accounting Flow

Alur akuntansi yang sesuai prinsip:

```text
Source transaction / import row
→ normalized fact row
→ journal_entry + journal_line
→ buku besar per COA
→ neraca saldo
→ laporan laba rugi / neraca / arus kas
→ dashboard / AI answer
```

### 4.2 Current Finance Engine Flow

Implementasi aktif:

```text
journal_entry + journal_line + cfg_coa
→ getGeneralJournal()
→ getGeneralLedger()
→ getTrialBalance()
→ getProfitLossStatement()
```

Strength:

- Laporan finance dibangun dari jurnal dan line, bukan angka dashboard.
- Jurnal umum punya summary debit/credit dan balance check.
- Buku besar diturunkan dari jurnal.
- Neraca saldo diturunkan dari buku besar.
- Laba rugi diturunkan dari saldo akun buku besar.
- Semua service menerima `tenantId`, `clinicId`, dan `period`.

Risk:

- Fungsi `AccountingTraceability.gs` dan `DataQualityService.gs` masih placeholder yang menunjuk logic masa depan.
- Current service mengasumsikan jurnal sudah ada dan benar.
- Belum ada enforcement kuat terhadap `finance_trace_map` saat laporan dibuat.
- Belum ada closing process, approval workflow, dan adjustment journal.

---

## 5. Jurnal Audit Review

### 5.1 Expected Standard

Jurnal yang sesuai prinsip akuntansi Indonesia minimal harus memenuhi:

| Requirement | Meaning |
|---|---|
| Debit = Kredit per entry | Wajib seimbang. |
| Ada tanggal transaksi | Untuk cut-off periode. |
| Ada periode akuntansi | Untuk reporting period. |
| Ada COA valid pada tiap line | Setiap line harus punya akun resmi. |
| Ada source reference | Bisa ditelusuri ke transaksi sumber. |
| Ada status jurnal | draft/posted/reversed/void harus jelas. |
| Ada narasi transaksi | Memadai untuk review manusia. |
| Ada audit metadata | created_at, created_by, approved_by bila produksi. |
| Ada reversal/adjustment handling | Untuk koreksi tanpa menghapus jejak lama. |

### 5.2 Current Implementation

`getGeneralJournal(tenantId, clinicId, period)`:

- Membaca `journal_entry` sesuai tenant/clinic/period.
- Membaca `journal_line` sesuai tenant/clinic.
- Menggabungkan line ke entry berdasarkan `journal_entry_id`.
- Menambahkan metadata COA dari `cfg_coa`.
- Menghitung `total_debit`, `total_credit`, dan `is_balanced` per entry.
- Summary menghitung total debit, total credit, entry count, dan status.

### 5.3 What Is Good

- Ada double-entry check per journal entry.
- Ada total debit/credit report-level.
- Output menampilkan `source_type`, `source_id`, `source_row_id`, dan `sync_id`.
- Jurnal menjadi sumber utama laporan finance.
- Response membawa `data_status`, `trace_status`, dan caveat.

### 5.4 Audit Findings

| Finding ID | Severity | Finding | Risk | Recommendation |
|---|---|---|---|---|
| JRN-01 | Critical | `trace_status` summary menjadi `traceable` jika entry ada, tanpa memverifikasi semua entry punya `source_row_id`, `sync_id`, dan trace map. | Laporan bisa terlihat traceable padahal source lineage belum lengkap. | Hitung trace status dari completeness `source_row_id`, `sync_id`, `finance_trace_map`, dan status journal line. |
| JRN-02 | High | `entry_status` tidak difilter; draft/void/reversed bisa ikut jika ada. | Laporan dapat memasukkan jurnal yang belum diposting atau sudah dibatalkan. | Hanya include `posted`/valid status; treat draft/void/reversed sesuai rule. |
| JRN-03 | High | Tidak ada validasi bahwa setiap line memakai COA aktif/valid. | Salah mapping akun dapat merusak laporan. | Validasi `coa_id`/`account_id` terhadap `cfg_coa.active = true`. |
| JRN-04 | High | `journal_line` tidak difilter period langsung; mengandalkan entry join. | Aman jika join benar, tetapi orphan line tidak terdeteksi. | Tambahkan orphan-line validation dan DQ warning. |
| JRN-05 | Medium | Perbandingan debit/credit menggunakan strict equality angka floating. | Risiko false mismatch karena decimal/rounding. | Gunakan currency integer minor unit atau tolerance `0.01`. |
| JRN-06 | Medium | Belum ada created_by/approved_by/posting workflow. | Sulit memenuhi audit trail operasional. | Tambahkan posting lifecycle: draft → posted → reversed, dengan audit log. |
| JRN-07 | Medium | Belum ada reversal/adjustment journal policy. | Koreksi data bisa menghapus/mengubah jejak lama. | Larang edit posted journal; koreksi via reversal/adjustment. |

### 5.5 Compliance Verdict

**Partially compliant** untuk management reporting.

Double-entry check sudah ada, tetapi belum cukup untuk disebut audit-ready karena traceability, posted status, COA validity, orphan line detection, dan journal lifecycle belum enforced.

---

## 6. Buku Besar Audit Review

### 6.1 Expected Standard

Buku Besar yang baik harus:

- Berasal dari jurnal posted.
- Dikelompokkan per akun COA.
- Menampilkan mutasi debit/kredit.
- Menampilkan saldo awal, mutasi periode, dan saldo akhir.
- Menjaga normal balance sesuai jenis akun.
- Bisa drilldown dari akun ke journal line dan transaksi sumber.
- Tidak mengandung orphan line atau line tanpa COA valid.

### 6.2 Current Implementation

`getGeneralLedger(tenantId, clinicId, period)`:

- Memanggil `getGeneralJournal()`.
- Mengelompokkan journal lines berdasarkan `coa_id`.
- Menghitung total debit, total credit, dan ending balance.
- Mengambil `normal_balance` dari COA atau infer dari `coa_type`.
- Menghasilkan account-level entries.

### 6.3 What Is Good

- Buku besar diturunkan dari jurnal, bukan dari fakta/dashboard langsung.
- Entry per akun menyimpan `journal_entry_id`, `journal_line_id`, description, debit, credit, source_type, dan source_id.
- Normal balance dipertimbangkan.
- Summary mengecek total debit = total credit.

### 6.4 Audit Findings

| Finding ID | Severity | Finding | Risk | Recommendation |
|---|---|---|---|---|
| LED-01 | High | Tidak ada opening balance. | Saldo akhir akun balance sheet tidak akurat lintas periode. | Tambahkan `opening_balance` per akun dan period roll-forward. |
| LED-02 | High | Tidak ada running balance per akun. | Sulit audit mutasi transaksi per akun secara kronologis. | Urutkan entries by `entry_date` + id, lalu hitung running balance. |
| LED-03 | High | Ledger mengikuti trace/status jurnal yang belum kuat. | Ledger bisa disebut traceable walau jurnal belum fully traceable. | Propagate weakest status dari jurnal dan line-level validation. |
| LED-04 | Medium | Sorting account hanya by `coa_id`, bukan `coa_code`. | Penyajian kurang sesuai urutan COA akuntansi. | Sort by `coa_code`, fallback `coa_id`. |
| LED-05 | Medium | Tidak ada period lock/closing check. | Data periode tertutup bisa berubah tanpa audit trail. | Tambahkan close period dan lock posted period. |
| LED-06 | Medium | COA inference dapat menyembunyikan COA metadata hilang. | Salah normal balance jika `coa_type` tidak valid. | Jangan silently infer untuk production; buat DQ warning `missing_coa_mapping`. |

### 6.5 Compliance Verdict

**Partially compliant**.

Buku besar sudah benar secara arah desain karena berasal dari jurnal, tetapi belum memenuhi kebutuhan audit penuh tanpa opening balance, running balance, period close, dan COA validation.

---

## 7. Neraca Saldo Audit Review

### 7.1 Expected Standard

Neraca Saldo harus:

- Diturunkan dari saldo akhir buku besar.
- Menampilkan debit balance dan credit balance per akun.
- Total debit balance harus sama dengan total credit balance.
- Menjadi dasar laporan laba rugi dan neraca.
- Menggunakan saldo normal akun dengan benar.
- Menandai abnormal balance untuk review.

### 7.2 Current Implementation

`getTrialBalance(tenantId, clinicId, period)`:

- Memanggil `getGeneralLedger()`.
- Mengubah ending balance menjadi debit balance atau credit balance berdasarkan normal balance.
- Menghitung total debit balance dan credit balance.
- Menandai complete jika rows ada dan total debit balance = total credit balance.

### 7.3 What Is Good

- Neraca saldo diturunkan dari buku besar.
- Ada balance check.
- Output menyimpan COA metadata, normal balance, total debit, total credit.
- Status incomplete jika tidak balance.

### 7.4 Audit Findings

| Finding ID | Severity | Finding | Risk | Recommendation |
|---|---|---|---|---|
| TB-01 | Critical | Debit/credit balance memakai normal balance tanpa menangani saldo negatif/abnormal. | Akun dengan saldo berlawanan normal bisa salah disajikan dan balance check bisa misleading. | Jika ending balance negatif, tempatkan di sisi lawan atau tampilkan abnormal balance flag. |
| TB-02 | High | Tidak ada adjusted trial balance. | Laporan belum memasukkan adjustment accrual, depresiasi, prepaid, tax accrual, allowance. | Tambahkan unadjusted TB, adjustments, adjusted TB. |
| TB-03 | High | Tidak ada closing entry untuk revenue/expense. | Laba rugi periode dan retained earnings lintas periode belum proper. | Tambahkan closing process untuk tutup buku. |
| TB-04 | Medium | Tidak ada materiality/tolerance untuk currency. | Mismatch kecil bisa membuat status incomplete atau sebaliknya. | Gunakan tolerance dan currency precision. |
| TB-05 | Medium | Tidak ada abnormal balance warning. | Kesalahan posting akun bisa tidak terlihat. | Tambahkan DQ rule: `abnormal_account_balance`. |

### 7.5 Compliance Verdict

**Partially compliant, needs correction before audit-ready**.

Neraca saldo memiliki fondasi yang benar, tetapi treatment saldo negatif/abnormal balance harus diperbaiki karena ini dapat memengaruhi validitas balance check dan penyajian.

---

## 8. Laporan Laba Rugi Audit Review

### 8.1 Expected Standard

Laporan Laba Rugi sesuai prinsip akuntansi harus:

- Berasal dari akun revenue dan expense yang sudah diposting ke buku besar.
- Memisahkan pendapatan, beban pokok/direct cost, dan beban operasional.
- Menggunakan basis akrual jika ditujukan sebagai laporan keuangan.
- Menggunakan COA mapping konsisten.
- Tidak mencampur kas masuk dengan pendapatan akrual.
- Menampilkan caveat jika ada biaya/pendapatan belum lengkap.

### 8.2 Current Implementation

`getProfitLossStatement(tenantId, clinicId, period)`:

- Memanggil `getGeneralLedger()`.
- Revenue: akun dengan type `revenue` atau `income`.
- Direct cost: akun dengan category/type `direct_cost`, `cogs`, `cost_of_goods_sold`.
- Operating expense: akun dengan type `expense` atau `operating_expense`.
- Formula:

```text
total_revenue = sum revenue accounts
direct_cost = sum direct cost / COGS accounts
gross_profit = total_revenue - direct_cost
operating_expense = sum operating expense accounts
net_profit = gross_profit - operating_expense
profit_margin = net_profit / total_revenue
```

### 8.3 What Is Good

- Laba rugi berasal dari buku besar/jurnal.
- Formula laba kotor, laba bersih, dan margin sudah benar untuk management reporting.
- Direct cost dan operating expense dipisahkan.
- Margin menjadi `null` jika revenue nol.
- Output membawa caveat/status.

### 8.4 Audit Findings

| Finding ID | Severity | Finding | Risk | Recommendation |
|---|---|---|---|---|
| PL-01 | High | `data_status = complete` hanya mensyaratkan revenue tidak nol. | Laba rugi bisa complete walau direct cost/opex kosong. | Complete hanya jika revenue, direct cost, opex, COA mapping, dan trace complete. |
| PL-02 | High | Klasifikasi akun bergantung pada `coa_type`/`category`; COAService masih placeholder. | Salah klasifikasi akun dapat salah menghitung laba. | Implementasikan validasi COA mapping dan category wajib. |
| PL-03 | High | Belum ada accrual adjustment. | Beban/pendapatan belum tentu matching dengan periode. | Tambahkan adjustment journal untuk accrual/prepaid/deferred revenue. |
| PL-04 | Medium | Tidak ada explicit distinction antara revenue cash vs accrual. | Pendapatan BPJS/piutang bisa salah dianggap kas. | Tegaskan basis laporan dan gunakan akun AR untuk BPJS receivable. |
| PL-05 | Medium | Tidak ada comparative period / YTD untuk laporan formal. | Analisis owner terbatas; bukan blocker audit inti. | Tambahkan comparative period dan YTD setelah core valid. |
| PL-06 | Medium | Tidak ada materiality/caveat berbasis DQ rule aktif. | Caveat terlalu generik. | Integrasikan `metric_data_quality`/DQ rules ke report summary. |

### 8.5 Compliance Verdict

**Partially compliant**.

Formula dan sumber sudah benar secara arah, tetapi status `complete` harus diperketat. Untuk prinsip akuntansi Indonesia, laba rugi final butuh kelengkapan direct cost, operating expense, accrual adjustment, COA mapping valid, dan traceability.

---

## 9. Comparison With Indonesian Accounting Principles

| Principle | Current Alignment | Gap |
|---|---|---|
| Double-entry | Ada debit/credit balance check. | Belum enforce posted status, COA valid, orphan line, trace map. |
| Accrual basis | Bisa mendukung via journal. | Belum ada accrual adjustment, prepaid/deferred handling, AR/AP aging. |
| Cut-off period | Ada `period` dan `entry_date`. | Belum validasi mismatch tanggal vs period. |
| Audit trail | Ada source fields. | Trace map belum enforced; created_by/approved_by belum ada. |
| COA consistency | Ada `cfg_coa`. | COAService masih placeholder; mapping validation belum kuat. |
| Completeness | Revenue/cost can be computed. | Tidak ada checklist completeness untuk semua komponen material. |
| Conservatism | Caveat tersedia. | Beberapa status terlalu optimistis, terutama journal trace and profit loss completeness. |
| Financial statement chain | Jurnal → ledger → TB → P&L sudah ada. | Closing, adjustment, balance sheet completeness belum cukup. |
| Indonesian reporting readiness | Sesuai arah management accounting. | Belum cukup untuk SAK/SAK EMKM/SAK ETAP final/audited statements. |

---

## 10. Key Control Tests Required

### 10.1 Journal Control Tests

- [ ] Every `journal_entry` in report has at least 2 lines.
- [ ] Every entry has total debit = total credit within currency tolerance.
- [ ] Every line has debit >= 0 and credit >= 0.
- [ ] No line has both debit and credit > 0 unless explicitly allowed.
- [ ] No line has both debit and credit = 0.
- [ ] Every line has valid active COA.
- [ ] Only posted/valid entries are included.
- [ ] Every entry has `source_row_id` and `sync_id` unless manual adjustment with approval.
- [ ] Every entry has trace map row or approved manual journal reason.
- [ ] Entry date belongs to the reported period or has approved cut-off reason.

### 10.2 Buku Besar Control Tests

- [ ] Ledger totals equal journal totals.
- [ ] Every ledger entry has `journal_entry_id` and `journal_line_id`.
- [ ] Account balances roll forward: opening + debit/credit movement = ending.
- [ ] Entries are sorted chronologically.
- [ ] Running balance is reproducible.
- [ ] No orphan journal line is excluded silently.
- [ ] COA inactive/deleted accounts are flagged.

### 10.3 Neraca Saldo Control Tests

- [ ] Trial balance derives only from ledger ending balances.
- [ ] Total debit balance equals total credit balance.
- [ ] Negative/abnormal balances are flagged or shown on the opposite side.
- [ ] Unadjusted and adjusted TB are distinguishable.
- [ ] Adjusting entries are traceable and approved.

### 10.4 Laporan Laba Rugi Control Tests

- [ ] Total revenue equals sum of revenue accounts in ledger.
- [ ] Direct cost equals sum of COGS/direct cost accounts.
- [ ] Operating expense equals sum of operating expense accounts.
- [ ] Gross profit = revenue - direct cost.
- [ ] Net profit = gross profit - operating expense.
- [ ] Profit margin = net profit / revenue, or `null` if revenue is zero.
- [ ] Revenue is not confused with cash receipts.
- [ ] BPJS revenue/receivable is recorded according to accrual/claim status policy.
- [ ] `data_status = complete` only when revenue, direct cost, operating expense, COA mapping, and trace are complete.

---

## 11. Data Quality Rules to Add / Enforce

| Rule ID | Severity | Applies To | Condition |
|---|---|---|---|
| `unbalanced_journal_entry` | Critical | Jurnal | Debit != credit per entry. |
| `journal_without_lines` | Critical | Jurnal | Entry has no journal lines. |
| `orphan_journal_line` | Critical | Jurnal/ledger | Line has no matching entry. |
| `missing_coa_mapping` | High | All reports | Journal line account not found in active COA. |
| `invalid_journal_status` | High | Jurnal | Entry included while draft/void/reversed. |
| `missing_source_trace` | Critical | Jurnal | Non-manual entry lacks source row or sync id. |
| `missing_finance_trace_map` | Critical | Traceability | Journal/fact has no trace map. |
| `period_cutoff_mismatch` | High | Jurnal | Entry date does not match accounting period. |
| `abnormal_account_balance` | Medium | Trial balance | Account has balance opposite expected normal side. |
| `missing_opening_balance` | High | Ledger/TB/Balance Sheet | Balance sheet accounts have no opening balance. |
| `profit_component_missing` | High | P&L | Revenue/direct cost/opex component missing. |
| `manual_journal_unapproved` | High | Jurnal | Manual adjustment lacks approval/reason. |

---

## 12. Recommended Fix Priority

### P0 — Must Fix Before Calling Reports Final

1. **Trace status must be evidence-based**  
   Do not set `trace_status = traceable` merely because rows exist. Validate source fields, journal lines, COA, and `finance_trace_map`.

2. **Filter journal entries by valid posted status**  
   Exclude draft/void/reversed unless report explicitly includes them as audit view.

3. **Validate COA for every journal line**  
   Missing/inactive COA must downgrade report status.

4. **Fix Trial Balance abnormal/negative balance handling**  
   Negative ending balances must be shown on opposite side or flagged clearly.

5. **Tighten P&L completeness status**  
   `complete` requires revenue, direct cost, operating expense, COA mapping, and trace completeness.

### P1 — Needed for Pilot-Grade Accounting Controls

1. Add opening balance and period roll-forward.
2. Add running balance in ledger.
3. Add period close/lock.
4. Add adjustment/reversal journal policy.
5. Add cut-off validation between `entry_date` and `period`.
6. Add DQ integration into report summary and caveat.
7. Add source drilldown from P&L → ledger → journal → source row.

### P2 — Needed for Formal Financial Statement Readiness

1. Add adjusted trial balance.
2. Add depreciation, accrual, prepaid, deferred revenue, AR/AP aging.
3. Add bank reconciliation.
4. Add tax reconciliation.
5. Add retained earnings roll-forward.
6. Add export package for accountant review.

---

## 13. Suggested Implementation Changes

### 13.1 Journal Summary Trace Calculation

Current behavior should be replaced with a validation-driven summary:

```text
traceable only if:
- every included entry has source_row_id and sync_id, or approved manual journal metadata
- every included entry has at least one matching finance_trace_map row, unless approved manual
- every line has active COA
- every entry is balanced
- no orphan line exists
```

### 13.2 Trial Balance Debit/Credit Placement

Use signed balance placement:

```text
if ending_balance >= 0:
  place on normal side
else:
  place abs(ending_balance) on opposite side
  flag abnormal_balance = true
```

### 13.3 Profit Loss Data Status

Use stricter status:

```text
complete = revenue exists
        + direct cost exists or explicit not_applicable policy
        + operating expense exists
        + all related accounts have valid COA
        + source/journal trace complete
        + no critical DQ rule

estimated = main components exist but non-critical gaps remain
incomplete = missing material component or critical DQ exists
```

### 13.4 Manual Journal Policy

Manual journal should be allowed only with:

- `source_type = manual_adjustment`
- `adjustment_reason`
- `created_by`
- `approved_by`
- `approved_at`
- supporting note/document reference
- no deletion after posted; correction through reversal.

---

## 14. Acceptance Criteria

Financial Audit Review is passed for management reporting when:

1. Jurnal umum includes only valid posted entries or approved manual adjustments.
2. Every journal entry is balanced.
3. Every journal line maps to an active COA.
4. Every non-manual journal traces to source row/import/sync and trace map.
5. Buku besar totals reconcile exactly to journal totals.
6. Buku besar provides opening balance, movement, ending balance, and drilldown.
7. Neraca saldo derives from buku besar and debit balance equals credit balance.
8. Abnormal balances are detected and flagged.
9. Laporan laba rugi derives from ledger accounts, not dashboard formulas.
10. Revenue, direct cost, operating expense, gross profit, net profit, and margin formulas reconcile.
11. `data_status` and `trace_status` are conservative and evidence-based.
12. Dashboard/API/AI never present report numbers as final unless status is complete and traceable.

Financial Audit Review is passed for formal accounting readiness only after:

- adjusted trial balance exists,
- period close/lock exists,
- opening balances and retained earnings roll-forward exist,
- bank/AR/AP/tax reconciliation exists,
- manual journal approval and reversal controls exist,
- accountant review/export process exists.

---

## 15. Final Verdict

The current Finance Engine design is directionally correct and suitable for **MVP management accounting** because it follows the core reporting chain:

```text
Jurnal → Buku Besar → Neraca Saldo → Laporan Laba Rugi
```

It also aligns with the most important principle: dashboard finance numbers should come from journal-backed data, not untraceable formulas.

But compared with Indonesian accounting principles, the current implementation is **not yet audit-ready**. The main reasons are:

- traceability is documented but not fully enforced in report generation,
- journal lifecycle and approval controls are missing,
- COA validation is incomplete,
- ledger lacks opening/running balances,
- trial balance needs abnormal balance handling,
- P&L completeness status is too optimistic,
- accrual/adjustment/closing controls are not implemented.

Recommended label for current output:

```text
Management Accounting Report — preliminary/traceable where supported, not official audited financial statement.
```

Recommended next milestone:

```text
Harden journal + COA + traceability controls first, then add period close and adjusted trial balance.
```
