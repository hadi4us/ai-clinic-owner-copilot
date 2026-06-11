# PILOT_MODE

Status: **Pilot Operating Guide**  
Tujuan: menguji AI Clinic Owner Copilot pada **3 klinik nyata** sebelum masuk fase SaaS/multitenant penuh.  
Prinsip utama: **tidak mengganti SIM Klinik, tidak membuat double entry, dan semua insight harus berasal dari data yang sudah ada**.

---

## 1. Tujuan Pilot

Pilot Mode digunakan untuk membuktikan bahwa aplikasi dapat memberi nilai bisnis nyata untuk owner klinik dengan data riil.

Pilot harus menjawab empat pertanyaan utama:

1. Apakah data dari klinik bisa diimpor dan dipetakan tanpa input ulang?
2. Apakah KPI utama bisa dihitung dengan akurat dan traceable?
3. Apakah owner merasa dashboard/AI insight membantu keputusan bisnis?
4. Apakah bug/data gap yang muncul cukup terkendali untuk lanjut ke pilot berbayar atau SaaS MVP?

---

## 2. Target Pilot: 3 Klinik

Pilot dilakukan pada 3 tipe klinik agar variasi data dan use case cukup luas.

| Klinik | Tipe | Fokus Validasi |
|---|---|---|
| Klinik 1 | Klinik pratama / umum | Omzet, profit, dokter, poli, biaya operasional, piutang umum |
| Klinik 2 | Klinik gigi / spesialis | Tindakan, dokter, margin layanan, stok bahan/obat |
| Klinik 3 | Klinik BPJS / perusahaan | Klaim, piutang BPJS/perusahaan, aging receivable, laporan owner |

Jika tipe klinik berbeda, tetap pilih 3 klinik dengan variasi berikut:

- 1 klinik dengan transaksi umum cukup banyak.
- 1 klinik dengan variasi dokter/tindakan tinggi.
- 1 klinik dengan klaim/piutang signifikan.

---

## 3. Prinsip Pelaksanaan Pilot

1. **Data riil, bukan dummy**  
   Minimal menggunakan 3 bulan data historis dari masing-masing klinik.

2. **Zero double entry**  
   Staff klinik tidak boleh diminta input ulang transaksi ke aplikasi ini.

3. **SIM Klinik tetap source of truth**  
   Aplikasi hanya membaca export/API/rekap yang sudah ada.

4. **Owner-first**  
   Pilot dinilai dari apakah owner bisa memahami bisnisnya lebih cepat, bukan dari banyaknya fitur.

5. **Traceability wajib**  
   Angka finance dan KPI harus bisa ditelusuri ke source row/import file/transaksi sumber.

6. **Status data harus jujur**  
   Jika data belum lengkap, tampilkan sebagai `estimated`, `partial`, `incomplete`, atau `not_traceable`.

---

## 4. Durasi dan Tahapan Pilot

Rekomendasi durasi: **4 minggu**.

| Minggu | Tahap | Output |
|---|---|---|
| Minggu 0 | Persiapan | Klinik terpilih, PIC, NDA/izin data, daftar sumber data |
| Minggu 1 | Data Discovery & Import | Data masuk warehouse, mapping awal, gap data |
| Minggu 2 | KPI Validation | KPI dihitung, dibandingkan dengan laporan klinik, traceability dicek |
| Minggu 3 | Owner Review | Dashboard diuji owner, feedback form dikumpulkan |
| Minggu 4 | Bug Fix & Go/No-Go | Bug prioritas ditutup, pilot scorecard, keputusan lanjut |

---

## 5. Data yang Diperlukan

### 5.1 Minimum Data Wajib

| Data | Wajib? | Tujuan | Contoh Kolom |
|---|---:|---|---|
| Master klinik | Ya | Tenant/clinic scope | `clinic_id`, `clinic_name`, `address`, `timezone` |
| Master dokter | Ya | KPI dokter | `doctor_id`, `doctor_name`, `specialty`, `status` |
| Master layanan/tindakan | Ya | Revenue dan margin layanan | `service_id`, `service_name`, `category`, `base_price` |
| Transaksi/billing | Ya | Revenue, visit, doctor performance | `transaction_id`, `date`, `patient_id`, `doctor_id`, `service_id`, `gross_amount`, `discount`, `net_amount`, `payment_status` |
| Pembayaran | Ya | Cash/paid revenue, AR | `payment_id`, `transaction_id`, `payment_date`, `method`, `paid_amount`, `payer_type` |
| Biaya operasional | Ya untuk profit final | Net profit | `expense_id`, `expense_date`, `category`, `amount`, `vendor`, `payment_status` |
| Biaya langsung/HPP | Ya untuk margin final | Gross profit/margin | `cost_id`, `transaction_id/item_id`, `cost_type`, `amount` |
| BPJS/klaim | Jika klinik pakai BPJS | BPJS receivable | `claim_id`, `claim_period`, `claim_amount`, `approved_amount`, `paid_amount`, `outstanding_amount`, `claim_status` |
| Stok obat/bahan | Jika klinik punya farmasi/stok | Inventory risk | `item_id`, `item_name`, `stock_qty`, `unit_cost`, `expiry_date`, `batch_no` |

### 5.2 Data Traceability Wajib

Setiap file/export/import wajib memiliki metadata:

| Field | Keterangan |
|---|---|
| `tenant_id` | ID tenant/owner |
| `clinic_id` | ID klinik |
| `source_system` | Nama SIM Klinik / Excel / API |
| `import_id` atau `sync_id` | ID batch import |
| `source_file_name` | Nama file sumber jika dari export |
| `source_row_id` | Nomor/ID baris sumber |
| `imported_at` | Waktu import |
| `data_status` | `complete`, `partial`, `incomplete`, `invalid` |
| `trace_status` | `traceable`, `partially_traceable`, `not_traceable` |

Tanpa `source_row_id` dan `import_id/sync_id`, angka tidak boleh diberi label final.

### 5.3 Data Pembanding

Untuk validasi, tiap klinik perlu menyediakan minimal satu sumber pembanding:

| KPI | Pembanding Ideal |
|---|---|
| Revenue / omzet | Laporan omzet dari SIM Klinik / kasir / finance |
| Profit | Laporan keuangan internal / rekap biaya owner |
| Margin | Rekap HPP/biaya langsung / komisi dokter / biaya obat |
| BPJS receivable | Rekap klaim BPJS / VClaim / laporan keuangan |
| Inventory risk | Stock opname / laporan stok expired |

---

## 6. KPI Keberhasilan Pilot

Pilot sukses jika aplikasi terbukti akurat, cepat, dipercaya owner, dan bug kritikal terkendali.

### 6.1 KPI Akurasi Data

| KPI | Target Lulus | Cara Ukur |
|---|---:|---|
| Revenue accuracy | Selisih <= 3% jika data lengkap | Bandingkan sistem vs laporan SIM/finance |
| Profit accuracy | Selisih <= 5-10% tergantung kelengkapan biaya | Bandingkan sistem vs laporan owner/finance |
| BPJS receivable accuracy | Selisih <= 5% jika status klaim lengkap | Bandingkan sistem vs laporan klaim/BPJS |
| Doctor performance ranking | Disetujui owner/staff | Sampling transaksi dokter dan revenue/profit |
| Inventory expired risk | >= 95% item risiko terdeteksi | Sampling stok dan expiry date |
| Traceability | >= 95% baris KPI utama traceable | Drilldown KPI ke source row/import |

Jika data sumber memang tidak lengkap, status boleh `partial` atau `estimated`, tetapi gap harus terdokumentasi.

### 6.2 KPI Kecepatan

| Aktivitas | Target |
|---|---:|
| Import data bulanan per klinik | < 30 menit setelah format mapping siap |
| Hitung KPI setelah data tersedia | < 1 menit untuk dataset pilot |
| Load dashboard owner | < 5 detik |
| Jawab pertanyaan KPI utama | < 10 detik setelah data tersedia |
| Buat ringkasan owner | < 30 detik |

### 6.3 KPI Owner Value

| KPI | Target |
|---|---:|
| Kemudahan memahami dashboard | >= 4/5 |
| Trust terhadap angka | >= 4/5 jika traceable |
| Relevansi insight | >= 4/5 |
| Kemungkinan dipakai mingguan | >= 4/5 |
| Waktu rekap manual berkurang | >= 80% |
| Owner ingin lanjut setelah pilot | Ya / conditional yes |

### 6.4 KPI Stabilitas Produk

| KPI | Target |
|---|---:|
| Critical bug terbuka di akhir pilot | 0 |
| High bug terbuka di akhir pilot | <= 3, semua punya workaround/ETA |
| Data import gagal tanpa pesan jelas | 0 kasus |
| Cross-tenant data leak | 0, wajib blocker |
| KPI final padahal data incomplete | 0, wajib blocker |

---

## 7. Pilot Scorecard

Setiap klinik diberi skor 0-100.

| Area | Bobot | Kriteria |
|---|---:|---|
| Data readiness | 20% | Data tersedia, bisa dipetakan, traceable |
| KPI accuracy | 30% | KPI sesuai pembanding atau gap jelas |
| Owner usefulness | 25% | Dashboard/insight membantu keputusan owner |
| Operational fit | 15% | Tidak menambah kerja staff, no double entry |
| Product stability | 10% | Bug terkendali, tidak ada blocker |

Status akhir:

| Score | Status | Arti |
|---:|---|---|
| >= 80 | Pass | Siap lanjut pilot berbayar/SaaS MVP |
| 65-79 | Conditional Pass | Value terbukti, perlu perbaikan mapping/fitur/bug |
| < 65 | Fail | Value belum cukup atau data tidak memadai |

---

## 8. Feedback Form

Feedback form dikumpulkan dari owner dan minimal 1 PIC operasional/finance per klinik.

### 8.1 Identitas Responden

```text
Nama Klinik:
Nama Responden:
Role: Owner / Finance / Admin / Dokter / Lainnya
Tanggal:
Periode Data yang Direview:
```

### 8.2 Skor Kuantitatif

Beri skor 1-5.

| Pertanyaan | Skor 1-5 | Catatan |
|---|---:|---|
| Dashboard mudah dipahami |  |  |
| Angka revenue terasa benar |  |  |
| Angka profit/margin terasa masuk akal |  |  |
| Piutang BPJS/claim membantu dipantau |  |  |
| Insight dokter/layanan membantu keputusan |  |  |
| Informasi stok expired membantu |  |  |
| Status data/traceability mudah dimengerti |  |  |
| Aplikasi mengurangi kerja rekap manual |  |  |
| Aplikasi layak dipakai mingguan |  |  |
| Aplikasi layak dibayar jika otomatis |  |  |

### 8.3 Pertanyaan Terbuka untuk Owner

1. Angka atau insight apa yang paling membantu?
2. Angka apa yang terasa tidak masuk akal?
3. Sebelum aplikasi ini, bagaimana cara mendapatkan angka tersebut?
4. Berapa lama biasanya rekap manual dilakukan?
5. Dashboard ini lebih cocok dibuka harian, mingguan, atau bulanan?
6. Fitur apa yang paling penting untuk ditambahkan?
7. Fitur apa yang tidak penting atau membingungkan?
8. Apakah ada angka yang harus bisa di-drilldown lebih dalam?
9. Jika data berjalan otomatis, apakah Anda bersedia membayar? Kisaran berapa?
10. Apa syarat utama agar klinik mau lanjut memakai aplikasi ini?

### 8.4 Feedback PIC Finance/Admin

1. Data apa yang paling sulit disiapkan?
2. Export dari SIM Klinik mudah atau sulit?
3. Ada field yang tidak konsisten antar bulan?
4. Ada transaksi yang sering salah kategori?
5. Ada proses manual yang bisa dikurangi?
6. Bug/error apa yang paling mengganggu?
7. Apakah aplikasi menambah pekerjaan atau justru mengurangi?

### 8.5 Final Recommendation per Klinik

```text
Status: Pass / Conditional Pass / Fail
Alasan utama:
Top 3 value:
Top 3 masalah:
Syarat lanjut:
PIC klinik setuju lanjut? Ya / Tidak / Belum tahu
```

---

## 9. Bug Tracking

### 9.1 Bug Tracking Board

Gunakan satu board sederhana, misalnya GitHub Issues, Notion, Spreadsheet, Linear, atau Trello. Untuk pilot kecil, spreadsheet sudah cukup.

Minimum kolom bug tracker:

| Field | Wajib | Contoh |
|---|---:|---|
| `bug_id` | Ya | `PILOT-BUG-001` |
| `clinic_id` | Ya | `clinic_001` |
| `reported_by` | Ya | Owner / Finance / Admin |
| `reported_at` | Ya | `2026-06-11 09:34` |
| `module` | Ya | Import / Mapping / KPI / Dashboard / AI / Security |
| `severity` | Ya | Critical / High / Medium / Low |
| `priority` | Ya | P0 / P1 / P2 / P3 |
| `title` | Ya | Revenue total berbeda dari SIM |
| `description` | Ya | Detail masalah |
| `steps_to_reproduce` | Ya jika UI/flow bug | Langkah reproduce |
| `expected_result` | Ya | Angka sesuai laporan SIM |
| `actual_result` | Ya | Angka beda 12% |
| `sample_data_ref` | Ya jika data bug | File/import/source row |
| `owner_impact` | Ya | Owner tidak percaya revenue |
| `status` | Ya | Open / Triaged / In Progress / Fixed / Verified / Won't Fix |
| `assigned_to` | Ya | Nama PIC internal |
| `target_fix_date` | Tidak | ETA |
| `fix_notes` | Tidak | Penyebab dan solusi |
| `verified_by` | Tidak | PIC yang verifikasi |
| `verified_at` | Tidak | Tanggal verifikasi |

### 9.2 Severity Definition

| Severity | Definisi | Contoh | SLA Pilot |
|---|---|---|---:|
| Critical | Menghentikan pilot atau berisiko data/privacy/angka final salah | Cross-tenant data leak, KPI final padahal salah, import corrupt | Fix/mitigate < 24 jam |
| High | KPI utama salah atau flow penting gagal | Revenue/profit/BPJS beda besar karena mapping bug | Fix < 3 hari |
| Medium | Mengganggu tapi ada workaround | Tampilan kurang jelas, filter tidak nyaman | Fix selama pilot jika sempat |
| Low | Cosmetic/usability minor | Label kurang rapi | Backlog |

### 9.3 Priority Definition

| Priority | Meaning |
|---|---|
| P0 | Harus selesai sebelum pilot lanjut/demo berikutnya |
| P1 | Harus selesai sebelum final pilot review |
| P2 | Penting tapi bisa masuk iterasi setelah pilot |
| P3 | Nice to have |

### 9.4 Bug Lifecycle

```text
Open
→ Triaged
→ In Progress
→ Fixed
→ Verified
→ Closed
```

Alternative statuses:

- `Duplicate`
- `Cannot Reproduce`
- `Won't Fix`
- `Data Issue`
- `Mapping Issue`
- `Expected Behavior`

### 9.5 Triage Rules

1. Semua Critical langsung dibahas hari yang sama.
2. Bug data/angka harus menyimpan `source_file`, `import_id/sync_id`, dan `source_row_id`.
3. Bug yang memengaruhi trust owner dinaikkan minimal ke High.
4. Bug privacy/security selalu Critical.
5. Mapping issue dicatat sebagai bug jika menyebabkan KPI salah.
6. Data source issue dicatat sebagai `Data Issue`, bukan ditutup tanpa dokumentasi.

---

## 10. Pilot Operating Checklist

### 10.1 Sebelum Pilot

- [ ] 3 klinik terpilih.
- [ ] PIC owner dan PIC data tiap klinik ditunjuk.
- [ ] Izin penggunaan data pilot disetujui.
- [ ] Daftar SIM Klinik/source system diketahui.
- [ ] Periode data historis disepakati, minimal 3 bulan.
- [ ] Template export/data request dikirim.
- [ ] Bug tracker dibuat.
- [ ] Feedback form disiapkan.

### 10.2 Saat Data Discovery

- [ ] Data transaksi diterima.
- [ ] Data pembayaran diterima.
- [ ] Data dokter diterima.
- [ ] Data tindakan/layanan diterima.
- [ ] Data biaya/HPP diterima atau gap dicatat.
- [ ] Data BPJS/klaim diterima jika relevan.
- [ ] Data stok/expired diterima jika relevan.
- [ ] Mapping field dibuat.
- [ ] Missing/ambiguous fields dicatat.
- [ ] Source row/import metadata tersedia.

### 10.3 Saat KPI Validation

- [ ] Revenue cocok dengan laporan pembanding atau selisih dijelaskan.
- [ ] Profit/margin cocok atau status `estimated/incomplete` dipakai.
- [ ] BPJS receivable cocok dengan laporan pembanding atau gap dijelaskan.
- [ ] Drilldown KPI ke source row berhasil.
- [ ] `data_status` dan `trace_status` sesuai kondisi data.
- [ ] Tidak ada cross-tenant leakage.
- [ ] Tidak ada KPI final tanpa traceability.

### 10.4 Saat Owner Review

- [ ] Dashboard diuji owner.
- [ ] 5 pertanyaan bisnis utama dijawab.
- [ ] Feedback form diisi.
- [ ] Bug/keluhan dicatat.
- [ ] Willingness to pay atau minat lanjut ditanyakan.

### 10.5 Setelah Pilot

- [ ] Scorecard per klinik selesai.
- [ ] Bug Critical = 0.
- [ ] Top data gap dirangkum.
- [ ] Top feature request dirangkum.
- [ ] Keputusan Pass / Conditional Pass / Fail dibuat.
- [ ] Rekomendasi next milestone ditulis.

---

## 11. Template Ringkasan per Klinik

```markdown
# Pilot Summary - [Nama Klinik]

## Profil
- Clinic ID:
- Tipe klinik:
- SIM/source system:
- Periode data:
- Jumlah transaksi:
- Jumlah dokter:
- PIC owner:
- PIC data:

## Data Readiness
| Data | Tersedia | Format | Status | Catatan |
|---|---|---|---|---|
| Transaksi |  |  |  |  |
| Pembayaran |  |  |  |  |
| Dokter |  |  |  |  |
| Tindakan/layanan |  |  |  |  |
| Biaya/HPP |  |  |  |  |
| BPJS/klaim |  |  |  |  |
| Stok/expired |  |  |  |  |

## KPI Validation
| KPI | Sistem | Pembanding | Selisih | Status | Catatan |
|---|---:|---:|---:|---|---|
| Revenue |  |  |  |  |  |
| Profit |  |  |  |  |  |
| Margin |  |  |  |  |  |
| BPJS Receivable |  |  |  |  |  |
| Doctor Performance |  |  |  |  |  |
| Inventory Risk |  |  |  |  |  |

## Owner Feedback
| Area | Skor 1-5 | Catatan |
|---|---:|---|
| Ease of use |  |  |
| Trust |  |  |
| Relevance |  |  |
| Routine usage |  |  |
| Willingness to pay |  |  |

## Bug Summary
| Severity | Open | Fixed | Verified |
|---|---:|---:|---:|
| Critical |  |  |  |
| High |  |  |  |
| Medium |  |  |  |
| Low |  |  |  |

## Scorecard
| Area | Bobot | Skor | Weighted |
|---|---:|---:|---:|
| Data readiness | 20% |  |  |
| KPI accuracy | 30% |  |  |
| Owner usefulness | 25% |  |  |
| Operational fit | 15% |  |  |
| Product stability | 10% |  |  |

Final Score:
Status: Pass / Conditional Pass / Fail
Recommendation:
```

---

## 12. Go / No-Go Criteria

### Go to Paid Pilot / SaaS MVP if:

- Minimal 2 dari 3 klinik mendapat status Pass atau Conditional Pass.
- Tidak ada Critical bug terbuka.
- Owner minimal 2 klinik menyatakan ingin lanjut atau melihat value jelas.
- Revenue/profit/BPJS KPI punya traceability memadai atau gap data jelas.
- Tidak ada double entry.

### No-Go / Rework if:

- Owner tidak percaya angka utama.
- Data mapping terlalu manual untuk direplikasi.
- Ada privacy/security incident.
- KPI utama tidak bisa ditelusuri ke source transaksi.
- Staff klinik merasa pekerjaan bertambah signifikan.

---

## 13. Final Output Pilot

Di akhir pilot, buat paket hasil:

1. `Pilot Summary` untuk masing-masing klinik.
2. Scorecard 3 klinik.
3. KPI validation report.
4. Data gap report.
5. Bug report dan status fix.
6. Owner feedback summary.
7. Rekomendasi roadmap berikutnya.

Pilot berhasil bukan karena semua angka sempurna, tetapi karena:

```text
owner melihat value nyata,
angka penting traceable,
gap data diketahui,
dan produk bisa diulang ke klinik berikutnya tanpa double entry.
```
