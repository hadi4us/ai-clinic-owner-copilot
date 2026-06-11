# ARCHITECTURE_REVIEW_SPRINT_1

Status: **Architecture Review Sprint 1**  
Scope review: Core Framework dan dependency awal di repository **AI Clinic Owner Copilot**.  
Constraint: **Tidak mengubah kode**.

File utama Sprint 1 yang diperiksa:

- `src/Core/Config.gs`
- `src/Core/Constants.gs`
- `src/Core/Helpers.gs`
- `src/Core/Logger.gs`

File pendukung yang relevan karena sudah menjadi dependency Core:

- `src/Core/Security.gs`
- `src/Auth/SessionManager.gs`
- `src/DataWarehouse/SheetRepository.gs`
- `src/DataWarehouse/MappingService.gs`
- `src/DataWarehouse/ValidationService.gs`
- `src/DataWarehouse/ImportService.gs`
- `src/Finance/KpiEngine.gs`
- `src/Dashboard/DashboardService.gs`

---

## 1. Executive Summary

Sprint 1 sudah mengarah ke foundation yang benar: konfigurasi dipusatkan di `Config.gs`, schema berada di `Constants.gs`, utility umum berada di `Helpers.gs`, dan logging berada di `Logger.gs`.

Namun secara arsitektur, Sprint 1 **belum clean enough untuk lanjut ke Sprint 2/3 tanpa rapih-rapih minor**. Ada beberapa risiko penting:

1. `Constants.gs` tidak selaras dengan dokumentasi `docs/GAS_FOUNDATION.md`; beberapa konstanta yang dipakai modul lain belum ada di file yang direview.
2. `Logger.gs` memakai `SENSITIVE_KEYS` dan `SHEET_NAME.LOG_AUDIT`, tetapi di `Constants.gs` yang aktif hanya ada `SENSITIVE_SOURCE_KEYS` dan belum ada `SHEET_NAME`.
3. `MappingService.gs` dan `ValidationService.gs` memakai `getDataWarehouseSchema_()`, tetapi fungsi ini tidak ditemukan dalam `src/Core/Constants.gs`.
4. Ada dua fungsi tenant guardrail yang mirip: `assertTenantScope_()` di `Helpers.gs` dan `requireTenantScope_()` di `Security.gs`.
5. Banyak service sudah langsung membaca seluruh sheet via `getRowsAsObjects_()`; ini aman untuk POC kecil, tapi berisiko quota/performance saat data membesar.
6. `Config.gs` masih menyimpan spreadsheet ID default hardcoded sebagai fallback. Ini nyaman untuk MVP, tapi perlu diketatkan sebelum production.
7. `APP_CONFIG` memiliki alias backward-compatible, tetapi beberapa modul masih mengakses nama lama yang tidak sepenuhnya ada, misalnya `APP_CONFIG.appName`.

Verdict: **Sprint 1 layak sebagai POC foundation, tetapi belum production-ready.** Sebelum lanjut coding lebih jauh, perlu stabilisasi kontrak konstanta, dependency Core, dan repository access pattern.

---

## 2. Review Area: Modularitas Kode

### 2.1 Yang Sudah Baik

| Area | Observasi | Dampak Positif |
|---|---|---|
| Config | `APP_CONFIG` sudah dikelompokkan ke `app`, `runtime`, `storage`, `tenancy`, `security`, `finance`, `logging` | Konfigurasi lebih mudah dicari dan dikembangkan |
| Schema | `SHEET_SCHEMAS` menjadi pusat definisi kolom | Mengurangi typo header dan membantu setup sheet |
| Helpers | Date/number/string/json utilities dipisah dari service | Reusable dan memudahkan Sprint 2/3 |
| Logger | Logging structured dan punya redaction recursive | Lebih aman untuk debugging data klinik |
| Security | Ada file `Security.gs` untuk tenant/role/finance guardrail | Arah modularitas security sudah benar |
| Repository | `SheetRepository.gs` mulai menjadi gateway spreadsheet | Fondasi Sprint 2 sudah ada |

### 2.2 Masalah Modularitas

| ID | Severity | Temuan | Dampak | Rekomendasi |
|---|---|---|---|---|
| MOD-001 | High | `Constants.gs` belum memuat konstanta yang didokumentasikan dan dipakai modul lain: `ROLES`, `DATA_STATUS`, `TRACE_STATUS`, `SHEET_NAME`, `SENSITIVE_KEYS` | Runtime error saat modul `Logger`, `Security`, `Finance`, `Mapping` dipanggil | Jadikan `Constants.gs` source of truth penuh untuk enum/status/sheet alias/sensitive keys |
| MOD-002 | High | `Logger.gs` menulis audit langsung ke SpreadsheetApp, bukan lewat repository | Melanggar isolasi akses spreadsheet dan bikin dependency Core → Spreadsheet langsung | Untuk Sprint 2, arahkan audit write lewat `SheetRepository` atau audit adapter khusus |
| MOD-003 | Medium | `Helpers.gs` memuat `writeAudit_()` yang juga melakukan audit write, sementara `Logger.gs` punya `auditLog_()` | Tanggung jawab audit/logging dobel dan rawan beda format | Gabungkan policy audit ke satu module: idealnya `Logger.gs`/`AuditService`, bukan helper umum |
| MOD-004 | Medium | `Helpers.gs` mengandung tenant guardrail (`assertTenantScope_`) sementara `Security.gs` mengandung guardrail serupa (`requireTenantScope_`) | Boundary helper vs security blur | Tenant/role/security guardrail sebaiknya hanya di `Security.gs`; helper hanya pure utility |
| MOD-005 | Medium | `Config.gs` memuat fixture `PHASE1_FIXTURE` | Fixture bukan core config runtime | Pindahkan fixture ke `FixtureService.gs` atau test fixture layer saat refactor |
| MOD-006 | Medium | `Constants.gs` mencampur schema final, POC sheet list, sensitive keys, dan helper function | File masih wajar untuk Sprint 1, tapi akan makin gemuk | Pisahkan nanti menjadi `SheetConstants`, `EnumConstants`, `SchemaConstants` bila ukuran bertambah |

### 2.3 Rekomendasi Modularitas Sprint 1

Prioritas sebelum lanjut Sprint 2:

1. Lengkapi `Constants.gs` sesuai kontrak yang sudah dipakai modul lain.
2. Putuskan satu nama canonical untuk sheet constants:
   - Bisa `SHEET_SCHEMAS` + `SHEET_NAME`, atau
   - hanya `SHEET_SCHEMAS` dengan helper lookup.
3. Putuskan satu policy audit logging:
   - `auditLog_()` sebagai public/internal API audit, atau
   - `writeAudit_()` sebagai repository-backed audit.
4. Pindahkan security guardrail dari helper ke `Security.gs` agar dependency jelas.
5. Biarkan `Helpers.gs` berisi pure function saja sebanyak mungkin.

---

## 3. Review Area: Dependency Antar Module

### 3.1 Dependency Saat Ini

Dependency yang terlihat:

```text
Config.gs
  → PropertiesService

Constants.gs
  → no external dependency

Helpers.gs
  → APP_CONFIG
  → SENSITIVE_SOURCE_KEYS
  → getWarehouseSpreadsheet_()
  → appendObjects_()

Logger.gs
  → APP_CONFIG
  → SENSITIVE_KEYS
  → SHEET_NAME.LOG_AUDIT
  → getConfiguredSpreadsheetId_()
  → SpreadsheetApp

Security.gs
  → ROLES
  → DATA_STATUS
  → TRACE_STATUS
  → sanitizeForLog_()

SheetRepository.gs
  → APP_CONFIG
  → getSheetSchema_()
  → getPhase1SheetNames_()
  → writeAudit_()

MappingService.gs
  → getDataWarehouseSchema_()
  → asNumber_()
  → toIsoDateString_()
  → SENSITIVE_KEYS
```

### 3.2 Dependency Issues

| ID | Severity | Temuan | Dampak | Rekomendasi |
|---|---|---|---|---|
| DEP-001 | Critical | `Logger.gs` depends on `SENSITIVE_KEYS`, tapi `Constants.gs` aktif hanya mendefinisikan `SENSITIVE_SOURCE_KEYS` | `logStructured_()`/`auditLog_()` bisa gagal runtime saat sanitasi | Alias atau rename konsisten: gunakan satu `SENSITIVE_KEYS` canonical |
| DEP-002 | Critical | `Logger.gs` depends on `SHEET_NAME.LOG_AUDIT`, tetapi `SHEET_NAME` tidak ditemukan di `src/Core/Constants.gs` | `auditLog_()` gagal saat dipanggil | Tambah `SHEET_NAME` atau ubah logger memakai string/schema existing seperti `AUDIT_LOG` |
| DEP-003 | Critical | `Security.gs` depends on `ROLES`, `DATA_STATUS`, `TRACE_STATUS`, tetapi konstanta itu belum ditemukan di `Constants.gs` aktif | Role check dan finance traceability guardrail gagal runtime | Definisikan enum tersebut di `Constants.gs` |
| DEP-004 | Critical | `MappingService.gs` dan `ValidationService.gs` depend pada `getDataWarehouseSchema_()`, tetapi fungsi ini tidak ditemukan | Mapping/validation Sprint 3 berpotensi gagal runtime | Sediakan wrapper ke `getSheetSchema_()` atau rename usage secara konsisten nanti |
| DEP-005 | High | `SheetRepository.gs` membuka spreadsheet via `APP_CONFIG.spreadsheetId`, sementara `Config.gs` juga punya `getConfiguredSpreadsheetId_()` yang membaca PropertiesService | Environment override bisa tidak dipakai repository | Repository sebaiknya memakai `getConfiguredSpreadsheetId_()` sebagai satu pintu config storage |
| DEP-006 | High | `Helpers.gs` memanggil repository function `appendObjects_()` untuk audit | Circular-ish conceptual dependency: Core helper bergantung ke DW repository | Audit harus ada di logger/audit service; helper jangan bergantung ke repository |
| DEP-007 | Medium | `APP_CONFIG` memakai nested config, tetapi banyak service masih akses alias lama (`APP_CONFIG.defaultTenantId`, `APP_CONFIG.timezone`, `APP_CONFIG.appName`) | Backward compatibility rapuh; beberapa alias belum lengkap | Tambahkan alias lengkap sementara, lalu migrasi gradual ke nested config |

### 3.3 Recommended Target Dependency

Target dependency yang lebih sehat:

```text
Constants.gs
  no dependency

Config.gs
  → Constants.gs optional only if needed
  → PropertiesService

Helpers.gs
  → Config.gs only for timezone/locale if unavoidable
  → Constants.gs for static keys
  no SpreadsheetApp write

Logger.gs
  → Constants.gs
  → Config.gs
  → SheetRepository/AuditRepository for persistent audit only

Security.gs
  → Constants.gs
  → Logger.gs optional for denied access audit

SheetRepository.gs
  → Constants.gs
  → Config.gs
  → Logger.gs only for warning/error

Services
  → Security.gs
  → SheetRepository.gs
  → Helpers.gs
```

Prinsipnya: Core boleh dipakai service; Core jangan terlalu banyak tahu detail service.

---

## 4. Review Area: Potensi Duplikasi

### 4.1 Duplikasi Konsep

| ID | Severity | Duplikasi | Lokasi | Dampak | Rekomendasi |
|---|---|---|---|---|---|
| DUP-001 | High | Tenant scope assertion | `assertTenantScope_()` di `Helpers.gs`, `requireTenantScope_()` di `Security.gs` | Behavior bisa divergen | Pakai `requireTenantScope_()` sebagai canonical security guard |
| DUP-002 | High | Audit logging | `writeAudit_()` di `Helpers.gs`, `auditLog_()` di `Logger.gs` | Dua format audit log, dua dependency path | Satukan ke satu API audit |
| DUP-003 | High | Sensitive key list | `APP_CONFIG.logging.redactKeys`, `SENSITIVE_SOURCE_KEYS`, expected `SENSITIVE_KEYS`, blocked list di `Security.gs` | Redaction/privacy policy tidak konsisten | Satu canonical sensitive key list, turunan untuk source/import/log jika perlu |
| DUP-004 | Medium | Config alias lama vs nested config baru | `APP_CONFIG.defaultTenantId`, `APP_CONFIG.tenancy.defaultTenantId`, `APP_CONFIG.spreadsheetId`, `APP_CONFIG.storage.spreadsheetId` | Bingung memilih pattern | Dokumentasikan masa transisi; pakai nested config di kode baru |
| DUP-005 | Medium | Schema naming antara docs final dan kode aktif | Docs final memakai `CFG_TENANT`, `IMPORT_BATCHES`, `KPI_MONTHLY`; kode aktif memakai `MASTER_TENANT`, `IMPORT_BATCH`, `KPI_BULANAN` | Implementasi bisa melenceng dari arsitektur final | Buat migration decision: pertahankan POC alias atau rename ke final schema sebelum production |
| DUP-006 | Medium | Folder source deployable | `src/` canonical vs `gas/src/` deployable lama | Risiko fix hanya di satu tempat | Tetapkan source of truth deployment sebelum coding lanjut |

### 4.2 Duplikasi Risiko Tinggi: `src/` vs `gas/src/`

Repository punya dua layout yang mirip:

- `src/` berisi modular canonical `.gs`.
- `gas/src/` berisi deployable Apps Script lama `.js`.

Risiko:

- Developer mengubah `src/`, tapi deploy masih dari `gas/src/`.
- Bugfix di `gas/src/` tidak masuk ke canonical `src/`.
- Review arsitektur melihat satu folder, runtime memakai folder lain.

Rekomendasi:

1. Untuk sekarang, dokumentasikan jelas mana yang deployable.
2. Sebelum production, pilih satu source of truth.
3. Jika `gas/src/` masih dipakai clasp, buat sync/migration plan dari `src/` ke `gas/src/`.

---

## 5. Review Area: Potensi Masalah Google Apps Script Quota

### 5.1 Masalah yang Sudah Terlihat

| ID | Severity | Temuan | Lokasi | Risiko GAS | Rekomendasi |
|---|---|---|---|---|---|
| GAS-001 | High | `getRowsAsObjects_()` memakai `sheet.getDataRange().getValues()` | `SheetRepository.gs` | Membaca seluruh sheet setiap query; lambat saat row besar | Tambahkan read by sheet + filter criteria + period/tenant index strategy |
| GAS-002 | High | KPI engine membaca banyak sheet penuh dalam satu compute | `KpiEngine.gs` | Timeout saat data bertambah | Batasi per period, cache header/range, incremental compute |
| GAS-003 | High | Dashboard service membaca `ALERT_LOG`, `KPI_HARIAN`, `PENDAPATAN`, `BIAYA` penuh | `DashboardService.gs` | Dashboard lambat dan kena quota | Dashboard harus baca KPI/precomputed breakdown, bukan raw finance besar |
| GAS-004 | Medium | `ensureSheet_()` selalu `setHeader_()` dan `autoResizeColumns()` | `SheetRepository.gs` | Auto resize mahal jika sering dipanggil saat append | Jangan auto-resize setiap append; lakukan saat setup/schema migration saja |
| GAS-005 | Medium | Audit log memakai `appendRow()` | `Logger.gs` | `appendRow` single-row tidak ideal untuk volume tinggi | Batch audit writes atau append via repository batch untuk event banyak |
| GAS-006 | Medium | Import XLSX membuka temp spreadsheet | `ImportService.gs` | Drive/Spreadsheet conversion bisa berat dan quota-sensitive | Prefer CSV untuk MVP; limit file size/row; cleanup temp file |
| GAS-007 | Medium | Many `.filter()` over full arrays repeatedly | `KpiEngine.gs`, `DashboardService.gs` | CPU runtime boros | Pre-index rows by period/date/type dalam satu pass |
| GAS-008 | Medium | No explicit LockService usage around import/KPI writes | Repository/import/KPI | Concurrent triggers/user actions bisa race/double append | Gunakan lock untuk import batch, setup, KPI recompute |

### 5.2 Quota Risk Assessment

| Scenario | Current Risk | Why |
|---|---|---|
| Single tenant, small synthetic data | Low | Full-sheet reads masih kecil |
| 1 tenant, ribuan transaksi/bulan | Medium | KPI compute masih mungkin, dashboard mulai berat |
| 10 tenant dalam satu spreadsheet | High | Full-sheet scan + tenant filter makin mahal dan leakage risk |
| Drive Sync banyak file | High | Trigger timeout dan duplicate processing |
| Dashboard sering dibuka owner | Medium-High | Setiap load membaca beberapa sheet penuh |

### 5.3 GAS Quota Mitigation Priority

Sebelum data real bertambah:

1. `SheetRepository` perlu method baca dengan batasan period/tenant, atau minimal centralized filter helper.
2. Dashboard jangan membaca `PENDAPATAN`/`BIAYA` raw untuk breakdown; simpan breakdown precomputed ke KPI/summary sheet.
3. Hindari `autoResizeColumns()` pada path append normal.
4. Tambahkan lock/idempotency untuk import dan KPI recompute.
5. Tambahkan threshold row count dan logging durasi proses.

---

## 6. Review Area: Maintainability

### 6.1 Yang Menunjang Maintainability

| Area | Strength |
|---|---|
| File organization | Sudah modular: Core, Auth, DataWarehouse, Finance, Dashboard, MCP, Setup, Tests |
| Naming convention | Banyak function internal pakai suffix `_`, cukup sesuai style GAS |
| Config grouping | `APP_CONFIG` nested lebih mudah dipahami |
| Schema centralization | `SHEET_SCHEMAS` memudahkan setup dan append object |
| Security intent | Guardrail tenant/privacy/finance sudah eksplisit |

### 6.2 Maintainability Problems

| ID | Severity | Temuan | Dampak | Rekomendasi |
|---|---|---|---|---|
| MNT-001 | High | Dokumentasi `GAS_FOUNDATION.md` menyebut constants yang tidak ada di `Constants.gs` aktif | Developer percaya kontrak yang belum benar | Sinkronkan docs dan kode setelah Sprint 1 stabilization |
| MNT-002 | High | Schema docs final dan schema kode memakai nama sheet berbeda | Bingung saat implementasi Sprint 2/3 | Buat mapping POC-to-final atau lakukan rename sebelum production |
| MNT-003 | High | Tidak ada contract test untuk Core constants/function existence | Runtime error baru ketahuan saat feature dipanggil | Tambahkan smoke test/checklist existence di Sprint berikutnya |
| MNT-004 | Medium | Backward-compatible aliases di `APP_CONFIG` ditambah manual satu-satu | Alias mudah lupa seperti `appName` | Dokumentasikan alias deprecation atau tambah helper accessor |
| MNT-005 | Medium | Error message bercampur Indonesia/English | Tidak fatal, tapi bisa tidak konsisten di UI/log | Tetapkan style: internal English, UI Indonesia |
| MNT-006 | Medium | Banyak magic string nama sheet di services | Typo dan refactor susah | Gunakan `SHEET_NAME` constants atau helper centralized |
| MNT-007 | Medium | `Helpers.gs` sudah mulai menampung business/audit concern | Helper bisa jadi dumping ground | Batasi Helpers ke pure utility; pindahkan business concern ke service |
| MNT-008 | Medium | Tidak ada explicit module load/order notes untuk GAS global scope | GAS file order bisa membingungkan saat dependency global | Dokumentasikan load assumptions; hindari init yang butuh runtime dependency |

---

## 7. Module-by-Module Notes

### 7.1 `Config.gs`

Strengths:

- Struktur nested config jelas.
- `Object.freeze` membantu menghindari mutation tidak sengaja.
- Ada `getScriptProperty_()` untuk secret/config runtime.
- Ada alias backward compatibility untuk modul lama.

Issues:

| Severity | Note |
|---|---|
| High | `storage.spreadsheetId` hardcoded sebagai fallback. Ini harus dianggap dev/MVP fallback, bukan production-safe. |
| Medium | `APP_CONFIG.appName` dipakai modul lain, tapi tidak ada alias untuk itu; yang ada `APP_CONFIG.app.name`. |
| Medium | Fixture `PHASE1_FIXTURE` bukan runtime config murni. |
| Low | `environment: 'mvp'` perlu diganti via deploy-time config di staging/production. |

Recommendation:

- Untuk production, require `WAREHOUSE_SPREADSHEET_ID` dari Script Properties.
- Tambahkan accessor/helper agar service tidak langsung tahu detail nested config.
- Pindahkan fixture ke setup/test layer.

### 7.2 `Constants.gs`

Strengths:

- `SHEET_SCHEMAS` sangat berguna untuk setup dan append object.
- `POC_SHEET_NAMES` membantu scope MVP.
- `getSheetSchema_()` defensive terhadap unknown sheet.

Issues:

| Severity | Note |
|---|---|
| Critical | `ROLES`, `DATA_STATUS`, `TRACE_STATUS`, `SHEET_NAME`, `SENSITIVE_KEYS` belum ditemukan padahal dipakai/didokumentasikan. |
| High | Nama sheet belum selaras dengan dokumen final yang baru dibuat. |
| Medium | Sensitive key canonical belum jelas antara `SENSITIVE_SOURCE_KEYS`, config redact keys, dan expected `SENSITIVE_KEYS`. |

Recommendation:

- Jadikan `Constants.gs` kontrak paling stabil sebelum service lain bertambah.
- Tambahkan enum/status/sheet name constants yang dipakai semua modul.
- Jika masih mempertahankan POC schema, tulis alias/mapping ke final schema.

### 7.3 `Helpers.gs`

Strengths:

- Utility number/date/period/json/id normalization cukup praktis.
- `rowHasSensitiveKeys_()` membantu import guardrail.
- `asNumber_()` sudah menangani format Rupiah umum.

Issues:

| Severity | Note |
|---|---|
| Medium | `assertTenantScope_()` overlap dengan `requireTenantScope_()` di `Security.gs`. |
| Medium | `writeAudit_()` bukan helper pure; dia membuka path ke repository/spreadsheet. |
| Medium | `toIsoDateString_()` fallback parse `new Date(text)` bisa ambiguous untuk format lokal tertentu. |
| Low | `normalizeId_()` menghapus karakter non-alnum dan lowercase; collision mungkin terjadi untuk nama mirip. |

Recommendation:

- Pindahkan audit/security concern keluar dari Helpers.
- Pertahankan date/number/json/string helper sebagai pure utility.
- Untuk import real, parsing tanggal harus strict per mapping template/source locale.

### 7.4 `Logger.gs`

Strengths:

- Structured JSON log bagus.
- Recursive sanitization sudah benar arahnya.
- Error/warn/info sudah diarahkan ke console appropriate methods.

Issues:

| Severity | Note |
|---|---|
| Critical | `SENSITIVE_KEYS` belum ditemukan di constants aktif. |
| Critical | `SHEET_NAME.LOG_AUDIT` belum ditemukan di constants aktif. |
| High | `auditLog_()` langsung memakai `SpreadsheetApp.openById()`, bypass repository. |
| Medium | `auditLog_()` row shape tidak terlihat cocok dengan schema `AUDIT_LOG` di `SHEET_SCHEMAS` aktif. Schema aktif: `tenant_id, audit_id, user_id, action, target_sheet, target_id, before_json, after_json, ip_or_channel, created_at`, sementara logger row menaruh `role` sebagai kolom ke-4. |
| Medium | Jika metadata punya circular reference, `JSON.stringify(payload)` bisa gagal. Biasanya aman untuk object biasa, tapi tetap risiko. |

Recommendation:

- Fix constants dependency dulu.
- Samakan row audit logger dengan `AUDIT_LOG` schema.
- Untuk persistence, gunakan repository method yang batch-safe.

---

## 8. Critical Runtime Breakpoints Found

Berikut titik yang kemungkinan menyebabkan error saat fungsi dipanggil:

| ID | Breakpoint | Evidence | Impact |
|---|---|---|---|
| RUN-001 | `SENSITIVE_KEYS` undefined | Dipakai di `Logger.gs` dan `MappingService.gs`, tidak ditemukan definisinya di grep source | Log sanitization/mapping privacy check gagal |
| RUN-002 | `SHEET_NAME` undefined | Dipakai di `Logger.gs`, `JournalService.gs`, `FinanceEngineCommon.gs`; tidak ditemukan definisi source | Audit/finance service gagal |
| RUN-003 | `ROLES` undefined | Dipakai `Security.gs`; tidak ditemukan definisi source | Role guard gagal |
| RUN-004 | `DATA_STATUS`/`TRACE_STATUS` undefined | Dipakai `Security.gs`; tidak ditemukan definisi source | Finance trace guard gagal |
| RUN-005 | `getDataWarehouseSchema_()` undefined | Dipakai `MappingService.gs`, `ValidationService.gs`; tidak ditemukan definisi source | Mapping/validation gagal |
| RUN-006 | `APP_CONFIG.appName` undefined | Dipakai dashboard/api, config hanya punya `APP_CONFIG.app.name` | UI title/appName bisa `undefined` |

Catatan: review ini tidak menjalankan Apps Script runtime, jadi temuan runtime berbasis static inspection. Namun pola undefined symbol cukup kuat dan perlu dibereskan sebelum fitur Sprint berikutnya.

---

## 9. Risk Register Sprint 1

| Risk ID | Area | Severity | Failure Mode | Mitigation |
|---|---|---|---|---|
| S1-R001 | Dependency | Critical | Undefined constants menyebabkan runtime error | Lengkapi `Constants.gs` dan buat smoke test existence |
| S1-R002 | Dependency | Critical | Schema helper name mismatch (`getDataWarehouseSchema_`) | Sediakan wrapper/rename konsisten |
| S1-R003 | Modularitas | High | Logger/audit bypass repository | Pusatkan spreadsheet write di repository/audit adapter |
| S1-R004 | Security | High | Sensitive keys tidak canonical | Satu daftar sensitive keys dan satu sanitizer policy |
| S1-R005 | Multi Tenant | High | Default tenant/clinic dipakai luas | Di production, TenantContext wajib; default hanya dev/demo |
| S1-R006 | Config | High | Spreadsheet ID hardcoded fallback dipakai production | Require Script Properties untuk prod/staging |
| S1-R007 | Quota | High | Full-sheet read untuk dashboard/KPI | Repository filter/chunk/index dan KPI precompute |
| S1-R008 | Quota | Medium | `autoResizeColumns()` di path ensure/append | Jalankan hanya saat setup/migration |
| S1-R009 | Maintainability | High | `src/` vs `gas/src/` drift | Tetapkan deploy source of truth |
| S1-R010 | Maintainability | Medium | POC schema vs final schema divergence | Buat migration/alias map |
| S1-R011 | Audit | Medium | Audit row shape mismatch | Samakan `auditLog_()` dengan `AUDIT_LOG` schema |
| S1-R012 | Data Quality | Medium | Date parsing terlalu permissive | Strict parser per source/mapping |
| S1-R013 | Concurrency | Medium | Tidak ada lock pada import/setup/KPI | Gunakan LockService pada write jobs |
| S1-R014 | Duplication | Medium | Tenant guardrail dan audit function dobel | Pilih canonical API dan deprecate sisanya |
| S1-R015 | Performance | Medium | Repeated array filters over same large rows | Pre-index rows dalam satu pass |

---

## 10. Recommended Fix Order Before Sprint 2

Walaupun laporan ini tidak mengubah kode, urutan perbaikannya sebaiknya begini:

### Priority 0 — Must Fix Before Any More Feature Work

1. Define missing constants in `Constants.gs`:
   - `ROLES`
   - `DATA_STATUS`
   - `TRACE_STATUS`
   - `SHEET_NAME`
   - `SENSITIVE_KEYS`
2. Provide or rename `getDataWarehouseSchema_()`.
3. Add `APP_CONFIG.appName` alias or migrate usage to `APP_CONFIG.app.name`.
4. Make `Logger.gs` audit row match `AUDIT_LOG` schema.

### Priority 1 — Must Fix Before Real Data Import

1. Move audit writes behind repository/audit service.
2. Remove direct spreadsheet access outside repository except controlled import conversion.
3. Make `getWarehouseSpreadsheet_()` use `getConfiguredSpreadsheetId_()`.
4. Add import/KPI lock and idempotency guard.
5. Avoid full-sheet scan in dashboard path.

### Priority 2 — Must Fix Before Production Pilot

1. Remove production dependency on hardcoded spreadsheet ID.
2. Settle `src/` vs `gas/src/` deployment source of truth.
3. Align schema names with final docs or provide explicit POC alias map.
4. Add Core smoke test for constants/functions existence.
5. Add row count/performance threshold monitoring.

---

## 11. Sprint 1 Acceptance Criteria Recommendation

Sprint 1 should not be considered architecturally complete until these are true:

- [ ] All constants referenced by Core/Auth/DataWarehouse/Finance modules exist.
- [ ] `Logger.gs` can sanitize and audit-log without undefined symbols.
- [ ] `Security.gs` can enforce roles/status without undefined symbols.
- [ ] `Helpers.gs` contains mostly pure utilities; audit/security duplication has a clear owner.
- [ ] `SheetRepository.gs` is the preferred spreadsheet access layer.
- [ ] `APP_CONFIG` has a documented dev/prod config strategy.
- [ ] No dashboard/API service depends on undefined `APP_CONFIG` aliases.
- [ ] There is a clear statement whether `src/` or `gas/src/` is deploy source of truth.
- [ ] A smoke check exists for core foundation symbols.

---

## 12. Final Verdict

Sprint 1 has a good architectural direction, but the implementation contract is not yet stable.

The biggest blockers are not business logic; they are **foundation contract mismatches**:

- missing constants,
- duplicate guardrail functions,
- audit/logging split,
- schema helper naming mismatch,
- full-sheet read patterns that will hurt GAS quota later.

Recommendation: before proceeding deep into Sprint 2 and Sprint 3, spend one short stabilization pass on Core Framework. That pass should not add features; it should make the foundation symbols, module boundaries, and repository access rules unambiguous.

If these issues are fixed early, the project has a much better chance of surviving Google Apps Script constraints during import, KPI computation, and dashboard usage.
