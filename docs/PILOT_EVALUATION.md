# Pilot Evaluation Framework

## Tujuan Pilot

Pilot bertujuan memvalidasi AI Clinic Owner Copilot menggunakan data riil klinik sebelum produk dikembangkan sebagai SaaS.

Fokus pilot bukan menambah fitur SIM Klinik, melainkan membuktikan bahwa owner klinik bisa mendapatkan insight bisnis penting dari data yang sudah ada.

## Prinsip Pilot

1. **Sebelum SaaS**  
   Produk harus terbukti berguna di klinik nyata sebelum masuk fase SaaS/multitenant penuh.

2. **Data riil, bukan asumsi**  
   Evaluasi menggunakan export Excel/CSV/API dari SIM Klinik yang benar-benar dipakai klinik.

3. **Tidak ada double entry**  
   Staff klinik tidak boleh diminta input ulang data ke sistem baru.

4. **Owner-first**  
   Pilot dinilai dari kemampuan menjawab pertanyaan owner, bukan dari banyaknya fitur.

5. **Accounting traceability**  
   Angka finance harus bisa ditelusuri ke source row, periode, tenant, clinic, dan status kelengkapan data.

## Target Klinik Pilot

Pilot awal dilakukan pada 3 tipe klinik:

| Tipe Klinik | Tujuan Validasi |
|---|---|
| 1 klinik pratama | Validasi pola pendapatan umum, biaya operasional, dokter, poli, dan piutang |
| 1 klinik gigi | Validasi variasi tindakan, dokter, margin layanan, dan inventory bahan/obat |
| 1 klinik perusahaan | Validasi skenario kontrak/perusahaan, klaim, piutang, dan laporan owner/manajemen |

## Pertanyaan Bisnis yang Harus Dijawab

Pilot dianggap relevan jika sistem bisa menjawab pertanyaan berikut dari data riil:

1. Berapa omzet klinik saya?
2. Berapa laba klinik saya?
3. Dokter mana yang paling menguntungkan?
4. Berapa piutang BPJS / klaim yang belum cair?
5. Obat atau stok apa yang berisiko expired dan menjadi kerugian?

## Scope Pilot

### In Scope

- Import data dari SIM Klinik melalui export Excel/CSV atau API bila tersedia.
- Mapping data ke spreadsheet warehouse.
- Perhitungan KPI utama:
  - omzet
  - laba / estimasi laba
  - profit per dokter
  - piutang BPJS / klaim outstanding
  - stok obat mendekati expired
- Dashboard mobile-first untuk owner.
- Ringkasan insight yang bisa dibaca owner dalam waktu singkat.
- Validasi manual bersama owner/staff untuk membandingkan angka sistem dengan laporan existing.

### Out of Scope

- Mengganti SIM Klinik.
- Input transaksi operasional baru.
- Rekam medis elektronik.
- Sistem kasir atau billing baru.
- SaaS billing dan self-service onboarding penuh.
- Integrasi kompleks yang belum diperlukan untuk membuktikan value pilot.

## Metrik Evaluasi

### 1. Akurasi Laporan

Mengukur apakah angka yang dihasilkan sistem sesuai dengan data sumber dan laporan existing klinik.

| Indikator | Cara Ukur | Target Pilot |
|---|---|---|
| Akurasi omzet | Bandingkan total omzet sistem vs laporan SIM/laporan internal | Selisih <= 3% jika data lengkap |
| Akurasi laba | Bandingkan laba/estimasi laba dengan laporan owner/keuangan | Selisih <= 5-10%, bergantung kelengkapan HPP/expense |
| Akurasi profit dokter | Sampling transaksi dokter dan alokasi biaya/komisi | Ranking dokter masuk akal dan disetujui owner |
| Akurasi piutang BPJS | Bandingkan outstanding claim vs laporan klaim/BPJS | Selisih <= 5% jika status klaim tersedia |
| Akurasi risiko expired | Sampling stok dan tanggal expired | >= 95% item berisiko terdeteksi dari data stok valid |

Catatan: jika data belum lengkap/auditable, hasil wajib diberi status `estimated`, `incomplete`, atau `untraceable` sesuai kondisi data.

### 2. Kecepatan Analisis

Mengukur waktu yang dibutuhkan owner untuk mendapatkan jawaban bisnis.

| Indikator | Baseline Manual | Target Pilot |
|---|---:|---:|
| Waktu mengetahui omzet bulanan | 30-120 menit | < 10 detik setelah data tersedia |
| Waktu mengetahui laba/estimasi laba | 1-3 hari | < 10 detik setelah data tersedia |
| Waktu ranking dokter menguntungkan | 2-8 jam | < 10 detik |
| Waktu cek piutang BPJS | 30-120 menit | < 10 detik |
| Waktu cek obat risiko expired | 30-180 menit | < 10 detik |

### 3. Kepuasan Owner

Mengukur persepsi owner terhadap usefulness, trust, dan kemudahan penggunaan.

| Indikator | Cara Ukur | Target Pilot |
|---|---|---|
| Kemudahan memahami dashboard | Skor 1-5 dari owner | >= 4 |
| Kepercayaan terhadap angka | Skor 1-5 dari owner | >= 4 jika data traceable |
| Relevansi insight | Skor 1-5 dari owner | >= 4 |
| Kemungkinan dipakai rutin | Skor 1-5 dari owner | >= 4 |
| Willingness to pay | Interview owner | Ada sinyal bayar atau lanjut pilot berbayar |

Pertanyaan interview owner:

- Angka mana yang paling membantu keputusan bisnis?
- Apakah ada angka yang terasa tidak masuk akal?
- Sebelum sistem ini, bagaimana cara mendapatkan angka tersebut?
- Apakah dashboard ini cukup sederhana untuk dibuka harian/mingguan?
- Jika sistem ini berjalan otomatis, apakah layak dibayar? Di kisaran berapa?

### 4. Pengurangan Pekerjaan Manual

Mengukur dampak terhadap waktu kerja owner/staff/keuangan.

| Indikator | Cara Ukur | Target Pilot |
|---|---|---|
| Waktu rekap laporan owner | Before-after interview | Berkurang >= 80% |
| Jumlah file manual yang digabung | Hitung file/sheet sebelum vs sesudah | Berkurang signifikan |
| Jumlah input ulang | Observasi proses | Tetap 0 double entry |
| Frekuensi tanya staff untuk angka bisnis | Interview owner/staff | Berkurang >= 50% |
| Waktu cek stok expired | Before-after interview | Berkurang >= 80% |

## Desain Pelaksanaan Pilot

### Tahap 1 — Seleksi Klinik

Kriteria klinik pilot:

- Sudah memakai SIM Klinik atau minimal punya data transaksi digital.
- Bersedia memberikan export data terbatas untuk periode pilot.
- Owner bersedia ikut sesi validasi angka.
- Ada minimal 3 bulan data historis.
- Memiliki salah satu atau lebih data berikut:
  - transaksi/billing
  - dokter/poli/tindakan
  - pembayaran/kas
  - klaim BPJS
  - stok obat dan tanggal expired

### Tahap 2 — Data Discovery

Output tahap ini:

- Daftar sumber data.
- Format export yang tersedia.
- Mapping field awal.
- Gap data untuk finance, BPJS, dokter, dan inventory.
- Status data: `complete`, `partial`, atau `insufficient`.

Checklist data:

- Data transaksi pasien.
- Data pembayaran.
- Data dokter.
- Data tindakan/layanan.
- Data obat/stok.
- Data klaim BPJS.
- Data expense/HPP jika tersedia.

### Tahap 3 — Implementasi Pilot

Aktivitas:

1. Import data ke spreadsheet warehouse.
2. Mapping field sesuai format klinik.
3. Jalankan KPI engine.
4. Tampilkan dashboard owner.
5. Tandai status data dan traceability.
6. Buat insight ringkas untuk 5 pertanyaan utama.

### Tahap 4 — Validasi Angka

Validasi dilakukan bersama owner/staff terkait.

Untuk setiap angka utama, catat:

- nilai dari sistem
- nilai pembanding dari SIM/laporan manual
- selisih absolut
- selisih persentase
- penyebab selisih
- status akhir: accepted / needs mapping fix / data missing / not comparable

### Tahap 5 — Evaluasi Owner

Lakukan sesi interview 30-60 menit per klinik.

Output:

- skor metrik
- pain point sebelum pilot
- keputusan yang terbantu
- fitur yang tidak penting
- blocker adopsi
- sinyal willingness to pay

## Pilot Scorecard

| Area | Bobot | Kriteria Lulus |
|---|---:|---|
| Akurasi laporan | 35% | Angka utama sesuai target selisih atau punya alasan data gap yang jelas |
| Kecepatan analisis | 20% | Pertanyaan owner terjawab < 10 detik setelah data tersedia |
| Kepuasan owner | 25% | Rata-rata skor owner >= 4/5 |
| Pengurangan pekerjaan manual | 20% | Waktu rekap turun >= 80% tanpa double entry |

### Status Hasil Pilot

| Status | Definisi |
|---|---|
| Pass | Mayoritas metrik lulus dan owner ingin lanjut memakai |
| Conditional Pass | Value terbukti, tetapi ada gap data/mapping yang perlu diperbaiki |
| Fail | Owner tidak melihat value atau data tidak cukup untuk menjawab pertanyaan utama |

## Template Ringkasan Evaluasi per Klinik

```markdown
# Pilot Evaluation - [Nama Klinik]

## Profil Klinik
- Tipe klinik:
- SIM Klinik yang digunakan:
- Periode data:
- Jumlah dokter:
- Jumlah transaksi:

## Data Source
| Data | Tersedia | Format | Status | Catatan |
|---|---|---|---|---|
| Transaksi |  |  |  |  |
| Pembayaran |  |  |  |  |
| Dokter |  |  |  |  |
| BPJS |  |  |  |  |
| Stok/Expired |  |  |  |  |
| Expense/HPP |  |  |  |  |

## KPI Validation
| KPI | Sistem | Pembanding | Selisih | Status | Catatan |
|---|---:|---:|---:|---|---|
| Omzet |  |  |  |  |  |
| Laba |  |  |  |  |  |
| Dokter paling menguntungkan |  |  |  |  |  |
| Piutang BPJS |  |  |  |  |  |
| Obat risiko expired |  |  |  |  |  |

## Owner Feedback
- Skor kemudahan:
- Skor trust:
- Skor relevansi:
- Skor kemungkinan dipakai rutin:
- Willingness to pay:

## Manual Work Reduction
- Proses manual sebelum pilot:
- Estimasi waktu sebelum:
- Estimasi waktu sesudah:
- Pengurangan waktu:

## Decision
- Status: Pass / Conditional Pass / Fail
- Alasan:
- Next action:
```

## Kriteria Lanjut ke SaaS

Produk baru layak masuk fase SaaS apabila minimal:

1. 2 dari 3 klinik pilot mendapat status **Pass** atau **Conditional Pass**.
2. Semua klinik bisa menjawab minimal 3 dari 5 pertanyaan utama.
3. Tidak ada kebutuhan double entry.
4. Ada pola mapping data yang bisa digeneralisasi.
5. Minimal 1 owner menunjukkan willingness to pay yang jelas.
6. Gap data dan traceability sudah terdokumentasi.

## Risiko Pilot dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Export SIM Klinik tidak lengkap | KPI tidak akurat | Tandai status data, minta export tambahan, jangan klaim angka final |
| Format data tiap klinik berbeda | Mapping lambat | Buat mapping template per sumber data |
| Owner tidak punya laporan pembanding | Sulit validasi akurasi | Gunakan sampling transaksi dan rekonsiliasi manual terbatas |
| Data expense/HPP tidak tersedia | Laba tidak final | Tampilkan estimasi laba dan jelaskan asumsi |
| Stok expired tidak dicatat rapi | Risiko inventory tidak terdeteksi | Validasi hanya untuk item dengan tanggal expired tersedia |
| Staff keberatan proses baru | Adopsi gagal | Pastikan hanya memakai export/API, tidak ada input ulang |

## Output Akhir Pilot

Setelah pilot selesai, hasil yang harus tersedia:

- 3 dokumen evaluasi klinik pilot.
- Rekap scorecard lintas klinik.
- Daftar mapping data yang bisa distandarkan.
- Daftar gap data yang perlu connector/import improvement.
- Keputusan: lanjut SaaS, lanjut pilot tambahan, atau revisi positioning.
