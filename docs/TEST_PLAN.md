# TEST_PLAN

Status: **Module Test Plan**  
Scope: seluruh module yang sudah ada di `src/` untuk proyek **AI Clinic Owner Copilot**.  
Constraint: dokumen test plan saja; tidak mengubah kode.

---

## 1. Tujuan Test Plan

Dokumen ini mendefinisikan test plan per module dengan empat kategori wajib:

1. **Happy Path** — fungsi berjalan sesuai skenario normal.
2. **Validation Test** — input, permission, schema, dan business rule divalidasi.
3. **Edge Case** — kondisi batas, data kosong, data parsial, periode kosong, nilai nol/negatif.
4. **Error Case** — dependency hilang, runtime error, unauthorized, quota, data corrupt.

Target utama:

- Mencegah regression pada Core Framework.
- Memastikan tenant/clinic scope tidak bocor.
- Memastikan import, finance, KPI, dashboard, dan API tetap traceable.
- Mengantisipasi quota Google Apps Script.
- Menjadi checklist sebelum Sprint 2/3/4/5 lanjut.

---

## 2. Test Strategy

### 2.1 Test Level

| Level | Fokus | Contoh |
|---|---|---|
| Unit Test | Pure function dan service kecil | `asNumber_`, `toPeriodString_`, `assertJournalBalanced_` |
| Integration Test | Alur lintas module | setup sheet → seed fixture → compute KPI → dashboard payload |
| Security Test | Tenant, role, sensitive data | cross-tenant access denied, sensitive field rejected |
| Data Quality Test | Schema, mapping, import row | missing required field, invalid date, duplicate row |
| Performance/Quota Test | Apps Script limits | full-sheet read, import chunk, KPI compute time |
| Smoke Test | Minimum end-to-end health | `smokeTestPhase1()` |

### 2.2 Test Data Fixture

Minimum fixture yang perlu tersedia:

| Fixture | Purpose |
|---|---|
| `tenant_demo / clinic_demo` normal | Happy path dashboard + KPI |
| Tenant B / clinic B | Cross-tenant denial test |
| Empty tenant | Empty result and no-crash test |
| Invalid import rows | Validation and quarantine path |
| Large synthetic dataset | GAS quota/performance path |
| Sensitive payload rows | Privacy redaction/rejection path |
| Incomplete finance dataset | `estimated` / `incomplete` status path |

### 2.3 Acceptance Gate Global

Sebelum release internal:

- [ ] Core symbol smoke test lulus.
- [ ] Setup warehouse lulus di spreadsheet test.
- [ ] Fixture seed lulus.
- [ ] KPI compute lulus untuk periode fixture.
- [ ] Dashboard payload lulus dan tidak membaca sensitive data.
- [ ] Cross-tenant request ditolak.
- [ ] Import duplicate/idempotency behavior jelas.
- [ ] Tidak ada error karena missing constants/function.
- [ ] Test runtime masih di bawah batas Google Apps Script.

---

## 3. Known Test Blockers from Architecture Review

Beberapa test diperkirakan akan gagal sampai stabilization pass dilakukan:

| Blocker | Module Terdampak | Dampak Test |
|---|---|---|
| `ROLES` belum ditemukan | `Security.gs` | role validation test gagal |
| `DATA_STATUS` / `TRACE_STATUS` belum ditemukan | `Security.gs`, Finance | finance traceability test gagal |
| `SHEET_NAME` belum ditemukan | `Logger.gs`, Finance | audit/finance tests gagal |
| `SENSITIVE_KEYS` belum ditemukan | `Logger.gs`, `MappingService.gs` | redaction/privacy tests gagal |
| `getDataWarehouseSchema_()` belum ditemukan | `MappingService.gs`, `ValidationService.gs` | mapping/validation tests gagal |
| `APP_CONFIG.appName` belum ada alias | Dashboard/API | payload app name bisa `undefined` |

Catatan: blocker ini bukan alasan menghapus test. Justru test perlu dibuat untuk mengunci stabilization.

---

## 4. Module Test Plan

## 4.1 `src/API/Api.gs`

Functions: `healthCheck`, `doGet`, `doPost`, `jsonOutput_`

| Category | Test Case |
|---|---|
| Happy Path | `healthCheck()` mengembalikan status OK, environment/schema version, timestamp, dan tidak membuka data tenant sensitif. |
| Happy Path | `doGet()` untuk route health/default mengembalikan JSON response valid. |
| Happy Path | `doPost()` menerima payload valid untuk action yang didukung dan mengembalikan JSON envelope standar. |
| Validation Test | Request tanpa action/route wajib diberi response aman, bukan crash. |
| Validation Test | Payload non-JSON atau field wajib kosong ditolak dengan error terstruktur. |
| Validation Test | Tenant/clinic/action dari client tidak boleh langsung dipercaya tanpa service guardrail. |
| Edge Case | Query parameter kosong, unknown route, dan method tanpa body tetap menghasilkan JSON valid. |
| Edge Case | Response object berisi Date/number/null harus bisa di-serialize konsisten. |
| Error Case | Service dependency melempar error; API tetap return error JSON tanpa stack trace sensitif. |
| Error Case | Unauthorized action ditolak dan tidak menjalankan side effect. |

---

## 4.2 `src/API/Kode.gs`

Functions: `myFunction`

| Category | Test Case |
|---|---|
| Happy Path | Jika masih placeholder, function bisa dipanggil tanpa side effect berbahaya. |
| Validation Test | Pastikan tidak dipakai sebagai route production tanpa validasi. |
| Edge Case | Function kosong tidak mempengaruhi deployment. |
| Error Case | Jika function tidak diperlukan, test dokumentasikan sebagai deprecated/placeholder. |

Recommendation: tandai module ini sebagai candidate removal atau placeholder non-production.

---

## 4.3 `src/Auth/AuthService.gs`

Functions: `getCurrentUserContext`

| Category | Test Case |
|---|---|
| Happy Path | Mengembalikan context user valid berisi `tenantId`, `clinicId`, role, dan identifier user. |
| Happy Path | Default MVP context mengarah ke tenant/clinic demo yang benar. |
| Validation Test | Context harus menyertakan tenant dan clinic scope. |
| Validation Test | Role harus termasuk role yang valid. |
| Edge Case | User email tidak tersedia di Apps Script runtime; fallback tetap aman. |
| Edge Case | Tenant default belum dikonfigurasi; return error/config warning, bukan data salah. |
| Error Case | `APP_CONFIG` missing/invalid menyebabkan error terstruktur. |
| Error Case | Unauthorized/unknown user tidak boleh mendapat owner context diam-diam. |

---

## 4.4 `src/Auth/SessionManager.gs`

Functions: `getCurrentSession`, `getDefaultTenantSession_`, `getActiveUserEmail_`, `resolveTenantContext_`, `withTenantSession_`

| Category | Test Case |
|---|---|
| Happy Path | `getCurrentSession()` menghasilkan session lengkap untuk tenant/clinic default MVP. |
| Happy Path | `withTenantSession_()` menjalankan callback dengan session valid. |
| Happy Path | `resolveTenantContext_()` menerima input tenant/clinic authorized dan mengembalikan context. |
| Validation Test | Session tanpa tenant/clinic/role ditolak. |
| Validation Test | `clinicId` harus berada dalam `clinicIds` session. |
| Validation Test | `withTenantSession_()` harus menolak callback non-function. |
| Edge Case | Active user email kosong di web app mode; session tetap tidak bocor ke tenant lain. |
| Edge Case | `clinic_id = ALL` hanya diterima untuk role/scope yang boleh agregasi. |
| Error Case | Tenant context tidak ditemukan → error terstruktur dan audit denial bila tersedia. |
| Error Case | Callback melempar error; error dipropagate tanpa swallow diam-diam. |

---

## 4.5 `src/Core/Config.gs`

Constants/functions: `APP_CONFIG`, `PHASE1_FIXTURE`, `getAppConfig`, `getScriptProperty_`, `getConfiguredSpreadsheetId_`

| Category | Test Case |
|---|---|
| Happy Path | `getAppConfig()` return object config lengkap dan immutable enough untuk runtime. |
| Happy Path | `getConfiguredSpreadsheetId_()` membaca Script Properties jika tersedia. |
| Happy Path | Backward-compatible alias seperti `defaultTenantId`, `defaultClinicId`, `spreadsheetId`, `timezone` tersedia. |
| Validation Test | Tidak ada secret/token hardcoded di config. |
| Validation Test | Production/staging harus require spreadsheet ID dari property, bukan fallback hardcoded. |
| Edge Case | Script property missing → fallback hanya valid untuk dev/MVP. |
| Edge Case | Script property empty string → fallback atau error sesuai environment. |
| Error Case | `PropertiesService` error → function memberi fallback/error yang jelas. |
| Error Case | Config object missing nested section menyebabkan smoke test gagal cepat. |

---

## 4.6 `src/Core/Constants.gs`

Constants/functions: `SHEET_SCHEMAS`, `POC_SHEET_NAMES`, `SENSITIVE_SOURCE_KEYS`, `getPhase1SheetNames_`, `getPocSheetNames_`, `getSheetSchema_`

| Category | Test Case |
|---|---|
| Happy Path | `getPhase1SheetNames_()` mengembalikan daftar sheet non-empty. |
| Happy Path | `getSheetSchema_(sheetName)` mengembalikan header untuk semua sheet POC. |
| Happy Path | Setiap schema memiliki `tenant_id` dan `clinic_id` untuk sheet tenant-owned. |
| Validation Test | Semua schema tidak memiliki duplicate column name. |
| Validation Test | Constants yang dipakai module lain harus ada: `ROLES`, `DATA_STATUS`, `TRACE_STATUS`, `SHEET_NAME`, `SENSITIVE_KEYS`. |
| Validation Test | Sheet names sinkron dengan docs schema final atau punya alias mapping jelas. |
| Edge Case | Unknown sheet → return empty array atau error sesuai kontrak; tidak crash ambigu. |
| Edge Case | Sheet schema kosong harus flagged oleh smoke test. |
| Error Case | Missing required constants menyebabkan Core smoke test gagal dengan pesan jelas. |
| Error Case | Schema berubah tanpa update tests menyebabkan test failure. |

---

## 4.7 `src/Core/Helpers.gs`

Functions: `assertTenantScope_`, `inScope_`, `asNumber_`, `sumByField_`, `sumAmount_`, `toIsoDateString_`, `toPeriodString_`, `isInPeriod_`, `normalizeId_`, `normalizeDoctorId_`, `normalizePoliId_`, `safeJsonParse_`, `safeJsonStringify_`, `normalizeHeaderKey_`, `rowHasSensitiveKeys_`, `writeAudit_`

| Category | Test Case |
|---|---|
| Happy Path | `asNumber_()` mengubah `Rp1.250.000`, `1,250,000`, number, dan empty fallback dengan benar. |
| Happy Path | `toIsoDateString_()` dan `toPeriodString_()` menghasilkan format `YYYY-MM-DD` dan `YYYY-MM`. |
| Happy Path | `inScope_()` true untuk row tenant/clinic yang cocok. |
| Happy Path | `sumByField_()` menghitung total field numeric. |
| Happy Path | `normalizeDoctorId_()` / `normalizePoliId_()` menghasilkan ID stabil dari nama. |
| Validation Test | `assertTenantScope_()` menolak tenant/clinic kosong. |
| Validation Test | `rowHasSensitiveKeys_()` mendeteksi NIK, diagnosis, phone, medical note, token/password. |
| Validation Test | `safeJsonParse_()` return fallback untuk JSON invalid. |
| Edge Case | `asNumber_()` untuk `null`, `undefined`, `''`, `-1000`, format lokal Indonesia. |
| Edge Case | Date input berupa Date object, ISO string, serial spreadsheet date, invalid text. |
| Edge Case | `normalizeId_()` untuk string dengan spasi, slash, tanda baca, aksen. |
| Error Case | `writeAudit_()` gagal karena repository/spreadsheet unavailable; tidak boleh menghentikan flow kritis tanpa keputusan eksplisit. |
| Error Case | Circular object pada stringify harus ditangani jika helper digunakan untuk log. |

---

## 4.8 `src/Core/Logger.gs`

Functions: `logDebug_`, `logInfo_`, `logWarn_`, `logError_`, `logStructured_`, `sanitizeForLog_`, `isSensitiveKey_`, `auditLog_`

| Category | Test Case |
|---|---|
| Happy Path | `logInfo_()` menulis structured log tanpa throw. |
| Happy Path | `sanitizeForLog_()` meredact key sensitif nested object. |
| Happy Path | `auditLog_()` menulis audit row sesuai schema audit. |
| Validation Test | Key seperti `token`, `secret`, `password`, `nik`, `patient_phone` wajib redacted. |
| Validation Test | Audit log tidak boleh menyimpan payload pasien mentah. |
| Validation Test | Constants dependency `SENSITIVE_KEYS` dan `SHEET_NAME.LOG_AUDIT` harus tersedia. |
| Edge Case | Metadata kosong, array nested, number, boolean, null. |
| Edge Case | Error object sebagai metadata harus tetap bisa disanitasi. |
| Error Case | Spreadsheet audit write gagal; logger tidak menyebabkan infinite failure loop. |
| Error Case | Missing constants menghasilkan test failure jelas. |

---

## 4.9 `src/Core/Security.gs`

Functions: `requireTenantScope_`, `requireSession_`, `requireRole_`, `requireOwnerOrManager_`, `canAccessClinic_`, `requireClinicAccess_`, `assertTenantScopedRow_`, `assertNoSensitivePatientFields_`, `assertFinanceTraceability_`, `sanitizeOutput_`

| Category | Test Case |
|---|---|
| Happy Path | Valid owner session bisa melewati tenant/role/clinic guard. |
| Happy Path | `assertTenantScopedRow_()` menerima row tenant/clinic yang sesuai. |
| Happy Path | Finance metric `complete + traceable` diterima. |
| Validation Test | Tenant/clinic kosong ditolak. |
| Validation Test | Role staff ditolak untuk owner-only action. |
| Validation Test | Row tenant berbeda ditolak. |
| Validation Test | Sensitive fields seperti diagnosis/NIK/patient phone ditolak. |
| Edge Case | Session memiliki banyak clinic IDs; akses clinic kedua valid. |
| Edge Case | `clinic_id = ALL` diuji untuk role boleh/tidak boleh. |
| Error Case | `ROLES`, `DATA_STATUS`, `TRACE_STATUS` missing → smoke test gagal. |
| Error Case | Finance metric incomplete/estimated/not traceable tidak boleh dianggap final. |

---

## 4.10 `src/DataWarehouse/SheetRepository.gs`

Functions: `getWarehouseSpreadsheet_`, `getOrCreateSheet_`, `setHeader_`, `ensureSheet_`, `clearDataKeepHeader_`, `clearSheetDataByName_`, `appendRows_`, `appendObjects_`, `replaceObjects_`, `getRowsAsObjects_`, `setupFinalWarehouseSheets`

| Category | Test Case |
|---|---|
| Happy Path | `setupFinalWarehouseSheets()` membuat semua sheet dan header sesuai schema. |
| Happy Path | `appendObjects_()` menulis object sesuai urutan header. |
| Happy Path | `getRowsAsObjects_()` membaca row menjadi object dengan header benar. |
| Happy Path | `replaceObjects_()` mengganti data tanpa menghapus header. |
| Validation Test | Unknown sheet ditolak atau menghasilkan schema kosong sesuai kontrak. |
| Validation Test | Append object dengan extra field tidak merusak sheet. |
| Validation Test | Missing required tenant/clinic sebaiknya ditangkap oleh service sebelum append. |
| Edge Case | Sheet kosong hanya header → return `[]`. |
| Edge Case | Data row dengan blank cells tetap mapping ke field kosong. |
| Edge Case | Banyak rows append dalam batch tidak row-by-row. |
| Error Case | Spreadsheet ID invalid / permission denied → error jelas. |
| Error Case | `autoResizeColumns()` quota/performance issue pada setup besar perlu diukur. |
| Error Case | Concurrent append/setup harus diuji dengan LockService di implementasi berikutnya. |

---

## 4.11 `src/DataWarehouse/ImportService.gs`

Functions: `uploadPocFile`, `importUploadedBlob_`, `importCsvBlob_`, `importExcelBlob_`, `tableValuesToObjects_`, `importObjectRowsToFinalSheet_`, `mapGenericRowToFinalSheet_`, `normalizeSourceRowKeys_`, `getFirst_`, `detectTargetSheetFromHeaders_`, `validateFinalRow_`, `appendValidationLog_`, `inferImportPeriod_`

| Category | Test Case |
|---|---|
| Happy Path | CSV valid dengan header dikenal masuk ke target sheet benar dan menghasilkan import summary. |
| Happy Path | XLSX valid dikonversi/import sesuai target sheet. |
| Happy Path | `normalizeSourceRowKeys_()` mengubah header lokal menjadi normalized key. |
| Happy Path | `inferImportPeriod_()` menemukan periode dari rows transaksi. |
| Validation Test | File tanpa header wajib ditolak. |
| Validation Test | Sensitive source keys wajib ditolak atau dicatat validation error. |
| Validation Test | Row missing tenant/clinic/source row/date/amount sesuai schema wajib invalid. |
| Validation Test | Duplicate file/source row harus punya expected behavior. |
| Edge Case | CSV dengan delimiter/quote/newline dalam cell. |
| Edge Case | Empty file, hanya header, unknown header, mixed date format. |
| Edge Case | Large file mendekati batas GAS. |
| Error Case | XLSX conversion gagal atau temp file tidak bisa dibuka. |
| Error Case | Import partial tidak boleh mempengaruhi KPI sebagai completed batch. |
| Error Case | Spreadsheet quota/timeout saat append; batch harus bisa didiagnosis via log. |

---

## 4.12 `src/DataWarehouse/MappingService.gs`

Functions: `mapSourceRowsToWarehouse_`, `normalizeWarehouseValue_`, `buildMappingTemplate_`, `assertMappingDoesNotExposeSensitiveFields_`

| Category | Test Case |
|---|---|
| Happy Path | Source rows mapped ke target schema dengan field mapping valid. |
| Happy Path | Number/date/period normalized sesuai target field. |
| Happy Path | `buildMappingTemplate_()` membuat mapping awal dari matching headers. |
| Validation Test | Mapping berisi sensitive field ditolak. |
| Validation Test | Required target field missing menghasilkan warning/error di validation layer. |
| Validation Test | `getDataWarehouseSchema_()` tersedia atau wrapper ke `getSheetSchema_()` tersedia. |
| Edge Case | Source field kosong, null, typo header, field extra. |
| Edge Case | Amount format lokal, date invalid, period partial. |
| Error Case | Unknown target sheet/schema harus error jelas. |
| Error Case | Missing `SENSITIVE_KEYS` menyebabkan privacy test gagal. |

---

## 4.13 `src/DataWarehouse/ValidationService.gs`

Functions: `validateWarehouseRows_`, `validateWarehouseRow_`, `validateNoBlockedPatientData_`, `validateWarehouseTypes_`, `makeValidationError_`

| Category | Test Case |
|---|---|
| Happy Path | Rows valid sesuai schema menghasilkan no error. |
| Happy Path | Validation output mengandung row index dan message saat ada issue. |
| Validation Test | Missing required tenant/clinic/source/date/amount ditandai invalid. |
| Validation Test | Blocked patient data ditolak. |
| Validation Test | Type validation date/number/status berjalan. |
| Edge Case | Empty rows → valid empty result atau warning sesuai kontrak. |
| Edge Case | Row dengan extra columns tidak crash. |
| Edge Case | Multiple errors di satu row tetap dilaporkan lengkap. |
| Error Case | Missing schema helper `getDataWarehouseSchema_()` harus gagal cepat. |
| Error Case | Validation function tidak boleh menulis data jika hanya mode validate. |

---

## 4.14 `src/Finance/AccountingTraceability.gs`

No functions detected yet.

| Category | Test Case |
|---|---|
| Happy Path | Jika module masih placeholder, tidak mempengaruhi deployment. |
| Validation Test | Saat diisi nanti, wajib memvalidasi source → journal → KPI lineage. |
| Edge Case | Source row tanpa journal harus diberi `not_traceable` / `partially_traceable`. |
| Error Case | Missing trace map tidak boleh menghasilkan finance KPI final. |

---

## 4.15 `src/Finance/BalanceSheetService.gs`

Functions: `getBalanceSheet`

| Category | Test Case |
|---|---|
| Happy Path | Balance sheet valid menghasilkan assets, liabilities, equity untuk periode tenant/clinic. |
| Happy Path | Total assets = liabilities + equity untuk dataset balanced. |
| Validation Test | Tenant/clinic/period wajib ada. |
| Validation Test | Account type harus valid dari COA. |
| Edge Case | Tidak ada journal/account rows → return statement kosong dengan caveat. |
| Edge Case | Negative balances ditampilkan sesuai normal balance. |
| Error Case | Journal imbalance atau COA missing menghasilkan warning/error, bukan angka final palsu. |

---

## 4.16 `src/Finance/COAService.gs`

No functions detected yet.

| Category | Test Case |
|---|---|
| Happy Path | Jika placeholder, tidak ada side effect. |
| Validation Test | Saat diisi nanti, account code/type/normal balance wajib valid. |
| Edge Case | Duplicate account code per tenant/clinic harus ditolak. |
| Error Case | Missing COA harus membuat finance report incomplete, bukan crash mentah. |

---

## 4.17 `src/Finance/CashflowService.gs`

Functions: `getCashflowStatement`, `isCashAccount_`, `classifyCashflowActivity_`, `filterCashflowByActivity_`, `buildCashflowSection_`

| Category | Test Case |
|---|---|
| Happy Path | Cashflow statement menghasilkan operating/investing/financing sections. |
| Happy Path | Cash accounts terdeteksi dari COA/account type/code. |
| Happy Path | Journal lines diklasifikasikan ke activity yang benar. |
| Validation Test | Tenant/clinic/period wajib scoped. |
| Validation Test | Debit/credit cash movement dihitung sesuai normal balance. |
| Edge Case | Tidak ada cash transaction → zero sections dengan status jelas. |
| Edge Case | Unknown account activity → masuk unclassified/caveat. |
| Error Case | Missing COA atau journal lines invalid → report incomplete. |

---

## 4.18 `src/Finance/DataQualityService.gs`

No functions detected yet.

| Category | Test Case |
|---|---|
| Happy Path | Placeholder tidak mempengaruhi deployment. |
| Validation Test | Saat diisi nanti, DQ issue wajib punya severity/status/rule_code/sync_id. |
| Edge Case | Banyak issue pada satu batch tetap dapat diagregasi. |
| Error Case | Critical DQ issue harus mencegah KPI final. |

---

## 4.19 `src/Finance/FinanceEngineCommon.gs`

Functions: `readFinanceSheetRows_`, `getChartOfAccountsById_`, `groupRowsBy_`, `sumField_`, `calculateAccountBalance_`, `inferNormalBalance_`, `buildFinanceReportResponse_`, `buildFinanceCaveat_`, `filterAccountsByType_`, `filterAccountsByCategoryOrType_`, `sumAccountBalances_`, `buildStatementSection_`, `buildBalanceSheetSection_`

| Category | Test Case |
|---|---|
| Happy Path | Read finance rows scoped tenant/clinic/period dengan benar. |
| Happy Path | COA map by account ID benar. |
| Happy Path | Account balance dihitung dari debit/credit sesuai normal balance. |
| Happy Path | Finance report response berisi status/caveat/source trace. |
| Validation Test | Tenant/clinic/period wajib ada. |
| Validation Test | Account tanpa normal balance memakai infer rule yang benar. |
| Validation Test | Finance response incomplete jika source data incomplete. |
| Edge Case | Empty journal lines/accounts. |
| Edge Case | Negative balance dan contra account. |
| Edge Case | Unknown account type/category. |
| Error Case | Missing `SHEET_NAME` constants atau sheet dependency menyebabkan smoke failure. |
| Error Case | Full-sheet reads besar harus diukur untuk quota. |

---

## 4.20 `src/Finance/JournalService.gs`

Functions: `getGeneralJournal`, `summarizeJournal_`, `assertJournalBalanced_`

| Category | Test Case |
|---|---|
| Happy Path | General journal menampilkan entries dan lines untuk tenant/clinic/period. |
| Happy Path | `assertJournalBalanced_()` menerima entry debit = credit. |
| Happy Path | Summary count/total debit/credit benar. |
| Validation Test | Journal entry wajib tenant/clinic scoped. |
| Validation Test | Line tanpa account atau entry ID ditandai invalid. |
| Edge Case | No journal rows → empty result dengan caveat. |
| Edge Case | Rounding small decimal difference sesuai tolerance. |
| Error Case | Debit != credit menghasilkan error/status invalid. |
| Error Case | Missing journal sheet/constants tidak menghasilkan angka final. |

---

## 4.21 `src/Finance/KpiEngine.gs`

Functions: `computePocKpis`, `computePhase1Metrics`, `upsertKpiBulanan_`, `computePocDailyKpis_`, `getFinanceSummary`, `getPreviousMonthlyKpi_`, `sumRevenueByType_`, `determineTraceStatusFromFinal_`, `combineFinalTraceStatuses_`, `determinePocDataStatus_`, `writePocAlerts_`, `makeAlert_`

| Category | Test Case |
|---|---|
| Happy Path | Fixture phase 1 menghasilkan expected KPI: visits, revenue, cost, gross profit, net profit, margin. |
| Happy Path | KPI bulanan upsert tidak menggandakan row periode yang sama. |
| Happy Path | Daily KPI dihitung untuk tanggal dalam periode. |
| Happy Path | Alert dibuat untuk kondisi negatif/risk sesuai rule. |
| Validation Test | Tenant/clinic/period wajib scoped. |
| Validation Test | Profit final hanya jika data complete + traceable. |
| Validation Test | Cancel/refund rows tidak double count. |
| Edge Case | Revenue nol → margin null/0 sesuai kontrak, tidak divide-by-zero. |
| Edge Case | Previous month missing → growth null, bukan angka palsu. |
| Edge Case | Missing cost/expense → data_status estimated/incomplete. |
| Error Case | Full-sheet scan timeout pada data besar. |
| Error Case | Sheet missing/unknown menghasilkan error diagnostik. |

---

## 4.22 `src/Finance/LedgerService.gs`

Functions: `getGeneralLedger`, `getTrialBalance`

| Category | Test Case |
|---|---|
| Happy Path | Ledger grouped by account dengan opening/activity/ending balance. |
| Happy Path | Trial balance debit = credit untuk balanced journal. |
| Validation Test | Tenant/clinic/period required. |
| Validation Test | Account ID harus ada di COA atau ditandai unknown. |
| Edge Case | Account tanpa transaksi tetap muncul/tidak muncul sesuai kontrak. |
| Edge Case | Multi-period opening balance. |
| Error Case | Trial balance tidak balance menghasilkan error/caveat. |
| Error Case | Missing journal line data membuat ledger incomplete. |

---

## 4.23 `src/Finance/ProfitLossService.gs`

Functions: `getProfitLossStatement`

| Category | Test Case |
|---|---|
| Happy Path | P&L menghitung revenue, COGS/direct cost, gross profit, opex, net profit. |
| Happy Path | Output section dan total cocok dengan KPI monthly. |
| Validation Test | Tenant/clinic/period required. |
| Validation Test | Revenue/cost account type harus sesuai COA. |
| Edge Case | Revenue ada tapi cost missing → status incomplete/estimated. |
| Edge Case | Negative revenue/refund. |
| Error Case | COA missing atau journal imbalance tidak boleh menghasilkan final profit. |

---

## 4.24 `src/Dashboard/DashboardService.gs`

Functions: `getDashboardPayload`, `getDefaultDashboardPayload`, `getLatestAvailablePeriod_`, `normalizeSummaryForClient_`, `buildRevenueBreakdown_`, `buildCostBreakdown_`, `groupRowsForBreakdown_`, `normalizeAlertForClient_`, `normalizeDailyTrendForClient_`

| Category | Test Case |
|---|---|
| Happy Path | Dashboard payload untuk fixture berisi summary, breakdown, alerts, trend, generatedAt. |
| Happy Path | Default dashboard memilih latest period yang tersedia. |
| Happy Path | Summary normalization mengubah fields ke client-friendly camelCase. |
| Validation Test | Tenant/clinic required dan cross-tenant tidak bocor. |
| Validation Test | Sensitive fields tidak muncul di payload. |
| Edge Case | Tidak ada KPI/alert/trend → payload tetap valid dengan empty arrays. |
| Edge Case | Period missing → latest period fallback. |
| Edge Case | Profit margin null tidak crash di client payload. |
| Error Case | `APP_CONFIG.appName` undefined harus ketahuan di test. |
| Error Case | Dashboard membaca raw sheets besar → performance test warning/fail. |

---

## 4.25 `src/Dashboard/ExecutiveDashboardService.gs`

Functions: `getExecutiveDashboardPayload`, `getDefaultExecutiveDashboardPayload`, `getExecutiveFinanceSummary_`, `getExecutiveBpjsSummary_`, `getExecutiveInventoryRisk_`, `getExecutiveGrowthTrend_`, `readExecutiveRowsFromAnySheet_`, `sumExecutiveFields_`, `countNoMovementMedicines_`, `classifyInventoryRisk_`, `combineExecutiveDataStatus_`, `buildExecutiveDashboardCaveat_`

| Category | Test Case |
|---|---|
| Happy Path | Executive dashboard menghasilkan finance summary, BPJS, inventory risk, growth trend. |
| Happy Path | Inventory risk classification sesuai days-to-expiry/no-movement rules. |
| Happy Path | Data status digabungkan dengan severity terburuk. |
| Validation Test | Tenant/clinic/period scoped. |
| Validation Test | BPJS outstanding tidak negatif tanpa caveat. |
| Validation Test | Inventory expiry missing → incomplete, bukan no risk. |
| Edge Case | Salah satu source sheet tidak ada; payload tetap memberi caveat. |
| Edge Case | Multiple sheet alternatives di `readExecutiveRowsFromAnySheet_()`. |
| Error Case | Full-sheet scan terlalu besar → performance warning/fail. |
| Error Case | Mixed tenant rows tidak boleh masuk summary. |

---

## 4.26 `src/MCP/BPJSTools.gs`

No functions detected yet.

| Category | Test Case |
|---|---|
| Happy Path | Saat tool dibuat, authorized owner/manager bisa request BPJS summary. |
| Validation Test | Token/session/tenant scope wajib valid. |
| Edge Case | No BPJS data → answer says no data/incomplete. |
| Error Case | Unauthorized raw claim access ditolak. |

---

## 4.27 `src/MCP/ExecutiveTools.gs`

No functions detected yet.

| Category | Test Case |
|---|---|
| Happy Path | Authorized user bisa meminta executive summary dari KPI, bukan raw data. |
| Validation Test | Prompt/tool args harus tenant-scoped dan role-scoped. |
| Edge Case | KPI incomplete → answer menyebut caveat. |
| Error Case | AI/tool tidak boleh mengakses cross-tenant atau sensitive raw rows. |

---

## 4.28 `src/MCP/FinanceTools.gs`

No functions detected yet.

| Category | Test Case |
|---|---|
| Happy Path | Finance question mengembalikan revenue/profit/P&L dari finance service. |
| Validation Test | Profit final hanya jika traceable; otherwise label estimate/incomplete. |
| Edge Case | Period kosong → latest period atau error jelas sesuai kontrak. |
| Error Case | Staff/non-finance role ditolak untuk sensitive finance answer. |

---

## 4.29 `src/MCP/PharmacyTools.gs`

No functions detected yet.

| Category | Test Case |
|---|---|
| Happy Path | Authorized user bisa request obat expired/stock risk. |
| Validation Test | Inventory data tidak mengandung data pasien. |
| Edge Case | Missing expiry date → incomplete status, bukan aman palsu. |
| Error Case | Unauthorized access atau tenant mismatch ditolak. |

---

## 4.30 `src/MCP/TaxTools.gs`

No functions detected yet.

| Category | Test Case |
|---|---|
| Happy Path | Authorized finance/owner bisa request tax summary jika data tersedia. |
| Validation Test | Tax period dan tenant/clinic required. |
| Edge Case | No tax data → no data/incomplete response. |
| Error Case | Tool tidak memberi advice final bila data tidak traceable atau scope belum jelas. |

---

## 4.31 `src/Setup/FixtureService.gs`

Functions: `seedPocFixtureData_`, `seedPhase1FixtureData_`

| Category | Test Case |
|---|---|
| Happy Path | Fixture seed membuat dataset POC lengkap sesuai expected smoke test. |
| Happy Path | Re-seed menghasilkan data yang sama/idempotent untuk fixture. |
| Validation Test | Fixture rows punya tenant_id/clinic_id/source trace/status. |
| Validation Test | Fixture tidak mengandung real patient PII. |
| Edge Case | Sheet belum ada → setup/seed membuat atau memberi instruksi setup. |
| Edge Case | Existing data fixture lama diganti bersih sesuai kontrak. |
| Error Case | Spreadsheet permission/config invalid → error jelas. |
| Error Case | Seed partial tidak boleh dianggap production data. |

---

## 4.32 `src/Setup/SetupService.gs`

Functions: `setupPhase1Warehouse`, `seedPocConfig_`, `resetPocFixtureData`

| Category | Test Case |
|---|---|
| Happy Path | `setupPhase1Warehouse()` membuat semua sheet/header dan seed config dasar. |
| Happy Path | `resetPocFixtureData()` setup + fixture + KPI menghasilkan result expected. |
| Validation Test | Setup tidak menghapus data production tanpa explicit mode. |
| Validation Test | Seed config tenant/clinic/COA lengkap. |
| Edge Case | Sheet sudah ada dengan header lama; behavior update/overwrite jelas. |
| Edge Case | Empty spreadsheet baru. |
| Error Case | Permission denied, invalid spreadsheet ID, missing schema. |
| Error Case | Setup dipanggil dua kali tidak menggandakan config secara tidak sengaja. |

---

## 4.33 `src/Tests/SmokeTest.gs`

Functions: `smokeTestPhase1`

| Category | Test Case |
|---|---|
| Happy Path | `smokeTestPhase1()` lulus dengan expected fixture: visits 5, revenue 1.950.000, cost 2.060.000, net profit -110.000. |
| Happy Path | Dashboard summary setelah reset cocok dengan KPI fixture. |
| Validation Test | Expected values harus diupdate hanya jika fixture sengaja berubah. |
| Edge Case | Smoke test dijalankan di spreadsheet kosong → harus setup/reset dulu sesuai function. |
| Error Case | Mismatch angka menghasilkan error jelas field mana yang gagal. |
| Error Case | Missing constants/functions membuat smoke test gagal cepat. |

---

## 5. Cross-Module Test Scenarios

### 5.1 End-to-End POC Flow

| Step | Expected |
|---|---|
| Run setup warehouse | Sheets and headers created |
| Seed fixture | Rows written for tenant/clinic demo |
| Compute KPI | KPI monthly and daily generated |
| Get dashboard payload | Summary/trend/alerts valid |
| Run smoke test | Expected fixture totals match |

### 5.2 Import to KPI Flow

| Step | Expected |
|---|---|
| Upload valid CSV | Import summary ok |
| Validate rows | Invalid/sensitive rows rejected |
| Append normalized rows | Rows scoped tenant/clinic |
| Compute KPI | KPI only uses valid completed rows |
| Dashboard reads KPI | No raw sensitive data exposed |

### 5.3 Finance Traceability Flow

| Step | Expected |
|---|---|
| Revenue/cost rows imported | Finance rows traceable to source |
| Journal generated | Debit equals credit |
| Ledger/P&L computed | Totals match journal/KPI |
| Profit requested | Final only when complete + traceable |

### 5.4 Tenant Isolation Flow

| Step | Expected |
|---|---|
| Tenant A user requests Tenant A | Allowed |
| Tenant A user requests Tenant B | Denied |
| Tenant A dashboard payload | Contains only Tenant A rows |
| Audit denied attempt | Logged without sensitive data |

### 5.5 GAS Quota Flow

| Scenario | Expected |
|---|---|
| 10k rows per finance sheet | KPI compute within acceptable runtime or emits performance warning |
| 50k rows per raw sheet | Dashboard must not scan raw sheet live |
| Large import file | Chunk/limit behavior clear |
| Repeated dashboard loads | No excessive sheet mutations like auto-resize/write during read |

---

## 6. Minimum Test Case IDs

| ID | Area | Scenario |
|---|---|---|
| TP-CORE-001 | Core | All required constants/functions exist |
| TP-CORE-002 | Core | Helpers parse number/date/period correctly |
| TP-CORE-003 | Core | Logger redacts sensitive fields |
| TP-SEC-001 | Security | Cross-tenant access denied |
| TP-SEC-002 | Security | Role access denied |
| TP-SEC-003 | Security | Finance incomplete not final |
| TP-REPO-001 | Repository | Setup sheets and headers |
| TP-REPO-002 | Repository | Append/read/replace objects |
| TP-IMP-001 | Import | Valid CSV import |
| TP-IMP-002 | Import | Sensitive field rejected |
| TP-IMP-003 | Import | Duplicate import behavior |
| TP-MAP-001 | Mapping | Source row to warehouse row |
| TP-VAL-001 | Validation | Missing required field invalid |
| TP-FIN-001 | Finance | Journal balanced |
| TP-FIN-002 | Finance | P&L totals correct |
| TP-FIN-003 | Finance | Ledger/trial balance balanced |
| TP-KPI-001 | KPI | Fixture KPI expected totals |
| TP-KPI-002 | KPI | Missing cost creates incomplete/estimated status |
| TP-DASH-001 | Dashboard | Payload from fixture valid |
| TP-DASH-002 | Dashboard | Empty data payload safe |
| TP-API-001 | API | Health returns JSON |
| TP-MCP-001 | MCP | Unauthorized tool access denied |
| TP-SETUP-001 | Setup | Reset fixture idempotent |
| TP-PERF-001 | Performance | Dashboard does not perform raw full scan in production path |

---

## 7. Recommended Execution Order

1. **Core existence tests**
   - constants
   - config aliases
   - helper functions
   - logger sanitizer

2. **Security tests**
   - tenant scope
   - role scope
   - sensitive payload
   - finance traceability

3. **Repository/setup tests**
   - create sheets
   - header schema
   - append/read/replace

4. **Fixture smoke test**
   - setup
   - seed
   - KPI
   - dashboard

5. **Import/mapping/validation tests**
   - CSV/XLSX
   - invalid row
   - sensitive row
   - duplicate row

6. **Finance service tests**
   - journal
   - ledger
   - P&L
   - balance sheet
   - cashflow

7. **Dashboard/API/MCP tests**
   - owner payload
   - AI/tool response
   - unauthorized response

8. **Performance/quota tests**
   - large fixture
   - repeated dashboard load
   - import size limit
   - KPI recompute duration

---

## 8. Pass/Fail Criteria

### Pass

A module passes if:

- Happy path returns expected result.
- Validation rejects invalid input without side effects.
- Edge cases return safe/explicit result.
- Error cases return structured error or controlled exception.
- No tenant leakage.
- No sensitive patient data leakage.

### Fail

A module fails if:

- It reads/writes wrong tenant/clinic data.
- It returns final finance metrics without complete/traceable data.
- It logs PII/secrets.
- It crashes with undefined symbols in normal path.
- It performs unbounded full-sheet scan in dashboard/API production path.
- It mutates spreadsheet during read-only operations unexpectedly.

---

## 9. Final Recommendation

Buat test implementation bertahap:

1. Mulai dari **Core smoke test** untuk mengunci missing constants/function issue.
2. Lanjutkan dengan **fixture E2E smoke test** yang sudah ada (`smokeTestPhase1`).
3. Tambahkan security tests sebelum import/finance diperbesar.
4. Tambahkan performance tests sebelum data real masuk.

Urutan ini paling aman karena masalah terbesar saat ini ada di foundation contract. Kalau Core stabil, Sprint 2 Repository dan Sprint 3 Import Engine akan jauh lebih gampang dites dan dirawat.
