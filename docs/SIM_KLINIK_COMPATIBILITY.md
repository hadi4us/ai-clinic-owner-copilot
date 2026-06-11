# SIM Klinik Compatibility

Dokumen ini menganalisis kompatibilitas integrasi AI Clinic Owner Copilot dengan SIM Klinik populer di Indonesia.

Tujuan dokumen ini adalah menentukan prioritas integrasi tanpa membuat fitur input ulang dan tanpa menggantikan SIM Klinik yang sudah berjalan.

---

## Prinsip Integrasi

1. AI Clinic Owner Copilot tidak menjadi SIM Klinik baru.
2. Integrasi V1 wajib berbasis file yang bisa diekspor dari SIM Klinik.
3. Format utama yang diterima V1 adalah Excel dan CSV.
4. Integrasi hanya mengambil data yang relevan untuk owner dashboard, finance, BPJS, farmasi, dan operasional.
5. Data klinis sensitif tidak boleh ditarik kecuali benar-benar dibutuhkan dan mendapat persetujuan eksplisit.
6. Setiap connector wajib menghasilkan mapping ke schema internal Google Spreadsheet Data Warehouse.
7. Jika format export berbeda antar-klinik, connector harus berbasis template mapping, bukan hardcode satu format saja.

---

## Ringkasan Prioritas

| Prioritas | SIM Klinik | Alasan |
|---|---|---|
| P0 | Export Excel Generic | Jalur paling universal untuk klinik mana pun |
| P0 | Khanza | Banyak digunakan, open-source, peluang akses database/export tinggi |
| P1 | Assist.id / Clinica | Cloud, populer, laporan operasional tersedia, potensi export tinggi |
| P1 | Klinik Pintar | Dokumentasi export laporan Excel relatif jelas |
| P1 | Vmedis | Segmen klinik/apotek kuat, indikasi export Excel tersedia |
| P1 | Medify | Enterprise-grade, modul lengkap, potensi integrasi strategis |
| P2 | SmartClinic | Desktop/on-premise; perlu validasi format export per instalasi |
| P2 | eClinic | Cloud clinic platform; perlu validasi akses export/API |
| P2 | Trustmedis | Platform faskes luas; perlu validasi export/API dan izin vendor |
| P2 | iMedis | SIMRS/klinik lengkap; perlu validasi format laporan |
| P3 | Aviamed | Relevan untuk RS/klinik, tetapi perlu validasi basis pengguna target |
| P3 | EziClinic | Relevan untuk klinik, perlu validasi fitur export |
| P3 | Vendor lokal lain | Ditangani melalui Export Excel Generic terlebih dahulu |

---

# Analisis Per SIM

## 1. Export Excel Generic

### Metode export

- File Excel manual dari SIM Klinik apa pun.
- File CSV manual dari SIM Klinik apa pun.
- Copy/export laporan dari sistem lama ke spreadsheet template.

### Format data

- Excel `.xlsx`.
- CSV `.csv`.
- Kemungkinan format sangat bervariasi:
  - laporan kunjungan
  - laporan tindakan
  - laporan pendapatan
  - laporan piutang BPJS
  - laporan stok obat
  - laporan mutasi obat
  - laporan pembayaran

### Kemudahan integrasi

Tinggi.

Alasan:

- Tidak bergantung vendor.
- Bisa dipakai untuk semua klinik sejak awal.
- Cocok dengan stack wajib: Google Apps Script, HTML Service, Google Spreadsheet.
- Paling realistis untuk MVP.

### Prioritas integrasi

P0 — wajib menjadi connector pertama.

### Risiko integrasi

- Header file tidak konsisten antar klinik.
- Nama kolom bisa berubah tergantung pengguna/vendor.
- Format tanggal dan angka bisa berbeda.
- Ada risiko file berisi data pasien terlalu detail.
- Perlu mapping wizard agar user bisa mencocokkan kolom sumber ke schema internal.

### Rekomendasi

Bangun template import generik dengan:

- deteksi header otomatis
- preview data sebelum import
- validasi kolom wajib
- mapping kolom manual
- penyimpanan mapping per tenant/clinic
- audit trail file import

---

## 2. Khanza / SIMKES Khanza

### Metode export

- Export laporan dari aplikasi Khanza.
- Export Excel/CSV jika tersedia dari modul laporan.
- Potensi akses database langsung pada instalasi on-premise, tetapi tidak direkomendasikan untuk V1.
- Potensi integrasi lanjutan melalui dump/snapshot database jika disetujui eksplisit.

### Format data

- Umumnya berbasis struktur SIMRS/SIMKES dengan tabel/modul pendaftaran, billing, tindakan, farmasi, laboratorium, dan laporan.
- Untuk V1, format yang ditargetkan adalah laporan Excel/CSV, bukan koneksi database langsung.
- Data bisa sangat granular dan mengandung data klinis sensitif.

### Kemudahan integrasi

Sedang sampai tinggi.

Alasan:

- Khanza populer dan open-source.
- Instalasi banyak yang on-premise sehingga akses data lebih mungkin dibanding SaaS tertutup.
- Namun variasi implementasi, modifikasi lokal, dan struktur laporan dapat berbeda antar fasilitas.

### Prioritas integrasi

P0.

Khanza harus menjadi target awal karena banyak digunakan dan secara strategis penting untuk pasar klinik/RS kecil-menengah.

### Risiko integrasi

- Variasi versi dan modifikasi lokal.
- Risiko mengambil data klinis berlebihan jika integrasi langsung ke database.
- Struktur database dan laporan bisa kompleks.
- Perlu kehati-hatian terhadap privasi, tenant scope, dan data pasien.
- Akses database langsung dapat menimbulkan risiko operasional jika tidak read-only.

### Rekomendasi

Untuk V1:

- gunakan export Excel/CSV dari laporan Khanza
- buat mapping khusus Khanza untuk laporan kunjungan, billing, farmasi, dan piutang
- jangan konek database langsung tanpa persetujuan eksplisit

Untuk V2/V3:

- pertimbangkan read-only database replica atau scheduled export, hanya jika ada izin tertulis dan kontrol akses aman

---

## 3. SmartClinic

### Metode export

- Export laporan dari aplikasi desktop SmartClinic jika tersedia.
- Export manual ke Excel/CSV.
- Kemungkinan akses database lokal tergantung instalasi, tetapi bukan target V1.

### Format data

- Laporan administratif klinik.
- Kemungkinan mencakup pasien, kunjungan, tindakan, transaksi, dan laporan manajemen.
- Format dapat berbeda tergantung versi aplikasi dan konfigurasi klinik.

### Kemudahan integrasi

Sedang.

Alasan:

- Aplikasi desktop biasanya memungkinkan export laporan, tetapi format belum tentu standar.
- Perlu sample export nyata dari pengguna untuk membuat connector akurat.

### Prioritas integrasi

P2.

Masuk target karena sudah disebut sebagai Target SIM Klinik V1, tetapi implementasi sebaiknya setelah Generic Export, Khanza, dan SIM cloud yang export-nya lebih jelas.

### Risiko integrasi

- Dokumentasi publik terbatas.
- Format export perlu diverifikasi manual.
- Kemungkinan variasi antar instalasi.
- Jika hanya tersedia laporan PDF, integrasi menjadi lebih sulit dan kurang akurat.

### Rekomendasi

- Mulai dari mode Export Excel Generic.
- Setelah mendapatkan 3–5 sample export SmartClinic, buat preset mapping SmartClinic.

---

## 4. Vmedis

### Metode export

- Export laporan ke Excel.
- Import/export data master tertentu melalui template Excel.
- Potensi export laporan apotek, stok, transaksi, dan klinik.

### Format data

- Excel berbasis template aplikasi.
- Laporan apotek/farmasi kemungkinan relatif kuat.
- Data klinik kemungkinan mencakup pendaftaran, pasien, dokter, transaksi, stok obat, dan laporan operasional.

### Kemudahan integrasi

Tinggi untuk file export.

Alasan:

- Ada indikasi kuat dukungan export Excel.
- Vmedis relevan untuk klinik yang punya komponen apotek/farmasi.
- Cocok untuk modul Pharmacy Agent dan Inventory Manager Virtual.

### Prioritas integrasi

P1.

### Risiko integrasi

- Perlu validasi apakah semua laporan yang dibutuhkan owner tersedia dalam export.
- Format bisa berbeda antara modul klinik dan modul apotek.
- Risiko satu file hanya berisi agregat tanpa source row detail.
- Risiko data obat/transaksi tidak punya ID stabil.

### Rekomendasi

- Prioritaskan connector Vmedis untuk farmasi, stok, mutasi obat, penjualan obat, dan transaksi klinik.
- Validasi apakah laporan pendapatan bisa ditelusuri ke transaksi sumber.

---

## 5. Medify

### Metode export

- Export laporan dari modul administrasi, keuangan, pelayanan, farmasi, atau SIM Klinik/SIMRS.
- Potensi API atau integrasi enterprise, bergantung paket dan izin vendor.
- Untuk V1 tetap gunakan Excel/CSV.

### Format data

- Kemungkinan lebih rapi dan enterprise-grade dibanding sistem desktop kecil.
- Dapat mencakup modul administrasi, rekam medis, pelayanan, farmasi, dan keuangan.
- Potensi format export berbeda antar modul.

### Kemudahan integrasi

Sedang.

Alasan:

- Sistem modern dan lengkap, tetapi akses API/export mungkin bergantung kebijakan vendor dan paket pelanggan.
- Perlu kerja sama vendor atau akses admin klinik.

### Prioritas integrasi

P1.

Strategis untuk klinik/RS yang lebih matang, tetapi tidak boleh menghambat MVP berbasis Excel Generic.

### Risiko integrasi

- Vendor lock-in.
- Akses data mungkin dibatasi.
- API mungkin tidak tersedia publik.
- Data sangat lengkap sehingga risiko privasi lebih tinggi.
- Mapping finance harus hati-hati agar angka dashboard tetap traceable.

### Rekomendasi

- Mulai dengan export laporan finance, kunjungan, farmasi, dan BPJS.
- Jangan tarik data RME detail kecuali ada kebutuhan bisnis eksplisit.
- API Connector masuk V3 setelah validasi akses vendor.

---

## 6. Assist.id / Clinica

### Metode export

- Export data/laporan dari dashboard Assist.id.
- Export laporan berdasarkan filter periode.
- Potensi API/vendor integration untuk tahap lanjut.

### Format data

- Laporan operasional klinik.
- Kemungkinan Excel/CSV dari fitur export.
- Data dapat mencakup layanan, pendapatan, pasien, transaksi, stok obat, BPJS/P-Care, dan operasional multicabang.

### Kemudahan integrasi

Tinggi untuk V1 jika export tersedia bagi user.

Alasan:

- Platform cloud modern.
- Ada dokumentasi publik terkait fitur export.
- Segmen klinik cocok dengan target produk.

### Prioritas integrasi

P1.

### Risiko integrasi

- Format export dapat berubah mengikuti update SaaS.
- API mungkin tidak terbuka publik.
- Perlu memastikan export berisi data source-level, bukan hanya ringkasan.
- Multicabang perlu mapping `tenant_id` dan `clinic_id` yang ketat.

### Rekomendasi

- Buat preset mapping Assist.id untuk laporan layanan, transaksi, farmasi, dan BPJS.
- Simpan versi mapping karena format SaaS bisa berubah.

---

## 7. Klinik Pintar

### Metode export

- Unduh laporan layanan menjadi file Excel.
- Export manual dari dashboard sesuai periode.
- Potensi laporan pendapatan, layanan, dan operasional.

### Format data

- Excel laporan layanan.
- Kemungkinan berisi informasi layanan dan pendapatan per periode.
- Format relatif terstruktur karena berasal dari fitur unduh laporan.

### Kemudahan integrasi

Tinggi untuk laporan layanan.

Alasan:

- Dokumentasi bantuan publik menunjukkan kemampuan unduh laporan Excel.
- Cocok untuk MVP import report.

### Prioritas integrasi

P1.

### Risiko integrasi

- Laporan layanan saja mungkin belum cukup untuk finance penuh.
- Perlu laporan tambahan untuk farmasi, BPJS, pembayaran, dan piutang.
- Format export bisa berubah mengikuti dashboard.
- Jika export berupa ringkasan, traceability accounting terbatas.

### Rekomendasi

- Integrasikan laporan layanan terlebih dahulu.
- Tambahkan connector laporan pendapatan/piutang jika sample tersedia.
- Tandai data finance sebagai `estimated` jika belum bisa ditelusuri ke transaksi/jurnal.

---

## 8. eClinic

### Metode export

- Export laporan dari aplikasi jika tersedia.
- Potensi export Excel/CSV dari modul laporan.
- Potensi integrasi vendor/API untuk tahap lanjut.

### Format data

- Data klinik pratama/utama.
- Potensi modul BPJS dan SATUSEHAT.
- Laporan real-time operasional, pasien, dan bisnis.

### Kemudahan integrasi

Sedang.

Alasan:

- Platform relevan untuk klinik dan faskes.
- Namun detail export/API perlu validasi langsung.

### Prioritas integrasi

P2.

### Risiko integrasi

- Ketergantungan akses vendor.
- Format export belum pasti.
- Risiko data klinis ikut terbawa dari RME.
- Integrasi BPJS/SATUSEHAT bukan berarti data bisnis mudah diekspor.

### Rekomendasi

- Dukung lewat Export Excel Generic terlebih dahulu.
- Buat preset eClinic setelah sample export tersedia.

---

## 9. Trustmedis

### Metode export

- Export laporan dari platform Trustmedis jika tersedia.
- Potensi API/vendor integration untuk fasilitas kesehatan.
- V1 tetap memakai Excel/CSV.

### Format data

- Laporan faskes, klinik, rumah sakit, puskesmas, atau apotek.
- Data kemungkinan modular: administrasi, pelayanan, farmasi, billing, finance.

### Kemudahan integrasi

Sedang.

Alasan:

- Platform luas dan relevan.
- Namun akses data kemungkinan bergantung konfigurasi dan izin vendor.

### Prioritas integrasi

P2.

### Risiko integrasi

- Scope produk luas sehingga format antar faskes bisa berbeda.
- API belum tentu tersedia untuk pelanggan standar.
- Risiko data klinis terlalu detail.
- Vendor approval mungkin diperlukan.

### Rekomendasi

- Mulai dari export laporan bisnis yang tersedia untuk owner.
- Hindari akses data RME detail.
- Prioritaskan laporan pendapatan, piutang, farmasi, dan kunjungan.

---

## 10. iMedis

### Metode export

- Export laporan dari modul SIMRS/klinik.
- Laporan operasional dan laporan RL/Kemenkes jika tersedia.
- V1 menggunakan file export.

### Format data

- Laporan per modul.
- Potensi data front-office, back-office, administrasi, farmasi, dan pelaporan regulasi.

### Kemudahan integrasi

Sedang.

Alasan:

- Modul lengkap dan laporan tersedia.
- Perlu sample export untuk memastikan struktur data bisnis yang dibutuhkan.

### Prioritas integrasi

P2.

### Risiko integrasi

- Format laporan bisa lebih berorientasi regulasi daripada kebutuhan owner.
- Data finance belum tentu accounting-traceable.
- Mapping antar modul bisa memerlukan ID transaksi yang konsisten.

### Rekomendasi

- Gunakan Generic Export untuk tahap awal.
- Buat preset jika ada klinik pilot pengguna iMedis.

---

## 11. Aviamed

### Metode export

- Export laporan dari SIMRS/klinik jika tersedia.
- Potensi integrasi vendor/API tergantung paket.

### Format data

- Data SIMRS/klinik, apotek, laboratorium, dan pelayanan.
- Format perlu validasi sample.

### Kemudahan integrasi

Sedang sampai rendah untuk tahap awal.

Alasan:

- Relevan untuk faskes, tetapi belum menjadi target utama V1.
- Perlu bukti penggunaan di segmen target AI Clinic Owner Copilot.

### Prioritas integrasi

P3.

### Risiko integrasi

- Informasi export/API terbatas.
- Perlu kerja sama vendor atau sample export user.
- Risiko scope SIMRS terlalu besar untuk MVP klinik.

### Rekomendasi

- Tangani melalui Generic Export terlebih dahulu.
- Naikkan prioritas jika ada pelanggan pilot memakai Aviamed.

---

## 12. EziClinic

### Metode export

- Export laporan bulanan jika tersedia.
- Export laporan invoice/kasir/komisi/stok jika tersedia.
- V1 menggunakan Excel/CSV.

### Format data

- Laporan registrasi, jadwal, RME, kasir, invoice, dan komisi staf.
- Format perlu validasi sample.

### Kemudahan integrasi

Sedang.

Alasan:

- Fokus klinik dan manajemen klinik cukup sesuai.
- Detail export belum cukup jelas tanpa sample nyata.

### Prioritas integrasi

P3.

### Risiko integrasi

- Belum pasti format export.
- Data mungkin tidak cukup untuk laporan finance lengkap.
- Perlu mapping khusus untuk komisi, invoice, dan pembayaran.

### Rekomendasi

- Masukkan ke jalur Generic Export.
- Buat preset setelah ada pengguna pilot.

---

## 13. Meya Labs SIM Klinik

### Metode export

- Export laporan jika tersedia.
- Potensi laporan pasien, rekam medis, jadwal dokter, apotek, dan keuangan.

### Format data

- Belum tervalidasi.
- Kemungkinan laporan operasional dan keuangan berbasis modul.

### Kemudahan integrasi

Sedang sampai rendah.

### Prioritas integrasi

P3.

### Risiko integrasi

- Informasi export/API terbatas.
- Perlu sample dari pengguna.
- Perlu memastikan data yang diambil bukan RME detail.

### Rekomendasi

- Dukung via Generic Export.
- Jangan buat connector khusus sebelum ada demand nyata.

---

## 14. Farmagitechs SIM Klinik

### Metode export

- Export laporan operasional jika tersedia.
- Potensi laporan pendaftaran, rekam medis, dan operasional.

### Format data

- Belum tervalidasi.
- Perlu sample export.

### Kemudahan integrasi

Sedang sampai rendah.

### Prioritas integrasi

P3.

### Risiko integrasi

- Informasi format data terbatas.
- Potensi variasi implementasi.
- Perlu validasi apakah laporan finance/farmasi cukup lengkap.

### Rekomendasi

- Tangani melalui Export Excel Generic.
- Connector khusus hanya dibuat jika ada klinik pilot.

---

## 15. PicKlinik

### Metode export

- Export laporan dari platform jika tersedia.
- Potensi data reservasi, RME, operasional, dan manajemen klinik.

### Format data

- Belum tervalidasi.
- Kemungkinan berbasis laporan dashboard SaaS.

### Kemudahan integrasi

Sedang sampai rendah.

### Prioritas integrasi

P3.

### Risiko integrasi

- Export/API perlu validasi vendor.
- Data bisa bercampur dengan RME detail.
- SaaS format bisa berubah sewaktu-waktu.

### Rekomendasi

- Dukung melalui Generic Export.
- Tidak menjadi connector khusus V1 kecuali ada permintaan pelanggan.

---

# Matriks Kompatibilitas

| SIM Klinik | Metode Export V1 | Format Data Umum | Kemudahan Integrasi | Prioritas | Risiko Utama |
|---|---|---|---|---|---|
| Export Excel Generic | Upload Excel/CSV | Bebas, perlu mapping | Tinggi | P0 | Header tidak konsisten |
| Khanza | Export laporan Excel/CSV | Laporan/modul SIMKES | Sedang-Tinggi | P0 | Variasi versi dan data klinis sensitif |
| Assist.id / Clinica | Export dashboard/laporan | Laporan operasional SaaS | Tinggi | P1 | Format SaaS berubah, API terbatas |
| Klinik Pintar | Unduh laporan Excel | Laporan layanan/pendapatan | Tinggi | P1 | Mungkin hanya ringkasan |
| Vmedis | Export Excel | Klinik/apotek/farmasi | Tinggi | P1 | Format modul berbeda |
| Medify | Export laporan/API vendor | Enterprise modular | Sedang | P1 | Vendor/API permission |
| SmartClinic | Export laporan manual | Desktop report | Sedang | P2 | Dokumentasi/sample terbatas |
| eClinic | Export laporan jika tersedia | Klinik/BPJS/SATUSEHAT | Sedang | P2 | Akses vendor dan privasi RME |
| Trustmedis | Export laporan/API vendor | Modular faskes | Sedang | P2 | Scope luas dan permission |
| iMedis | Export laporan modul | SIMRS/klinik/reporting | Sedang | P2 | Format lebih regulasi-oriented |
| Aviamed | Export laporan jika tersedia | SIMRS/klinik | Sedang-Rendah | P3 | Validasi demand dan format |
| EziClinic | Export laporan jika tersedia | Klinik/kasir/invoice | Sedang | P3 | Format belum tervalidasi |
| Meya Labs | Export laporan jika tersedia | Operasional/keuangan | Sedang-Rendah | P3 | Informasi export terbatas |
| Farmagitechs | Export laporan jika tersedia | Operasional klinik | Sedang-Rendah | P3 | Sample belum tersedia |
| PicKlinik | Export laporan jika tersedia | SaaS/RME/operasional | Sedang-Rendah | P3 | API/export belum tervalidasi |

---

# Strategi Integrasi Bertahap

## V1 — Upload Excel / CSV

Target:

1. Export Excel Generic
2. Khanza
3. Vmedis
4. Klinik Pintar
5. Assist.id / Clinica
6. SmartClinic
7. Medify

Output V1:

- Import manual Excel/CSV.
- Preset mapping untuk SIM prioritas.
- Validasi data sebelum masuk warehouse.
- Data masuk ke Google Spreadsheet Data Warehouse.
- Status import tercatat dengan `source_system`, `source_file`, `source_period`, `tenant_id`, dan `clinic_id`.

## V2 — Google Drive Sync

Target:

- Klinik menaruh export rutin di folder Google Drive.
- Apps Script membaca file baru secara periodik.
- Sistem mengenali vendor berdasarkan mapping tenant.
- Cocok untuk klinik yang belum punya API tetapi bisa export rutin.

Risiko V2:

- File duplikat.
- File salah periode.
- File belum final tapi sudah di-sync.
- Perlu checksum dan import idempotency.

## V3 — API Connector

Target:

- Vendor yang menyediakan API resmi.
- Klinik enterprise/multicabang.
- Integrasi read-only dengan token dan audit trail.

Risiko V3:

- Izin vendor.
- Rate limit.
- Perubahan API.
- Keamanan token.
- Tanggung jawab privasi data lebih tinggi.

---

# Data Minimum yang Perlu Ditargetkan

## Finance

- Tanggal transaksi
- Nomor transaksi/source row
- Jenis pembayaran
- Pendapatan layanan
- Pendapatan obat
- Diskon
- Refund
- Piutang
- Status pembayaran

## BPJS

- Periode klaim
- Nomor klaim/agregat klaim
- Nilai klaim
- Status klaim
- Tanggal pengajuan
- Tanggal cair
- Nilai dibayar
- Selisih/koreksi

## Pharmacy

- Kode obat
- Nama obat
- Stok awal
- Stok masuk
- Stok keluar
- Stok akhir
- Harga beli
- Harga jual
- Tanggal expired
- Batch jika tersedia

## Operational KPI

- Tanggal kunjungan
- Poli/layanan
- Dokter/tenaga medis
- Jumlah kunjungan
- Jenis pasien umum/BPJS/asuransi
- Cabang/klinik

---

# Kesimpulan

Strategi paling aman adalah memulai dari Export Excel Generic sebagai fondasi universal, lalu menambahkan preset mapping untuk SIM Klinik yang paling sering ditemui.

Prioritas teknis yang disarankan:

1. Generic Excel/CSV Import
2. Khanza preset
3. Vmedis preset
4. Klinik Pintar preset
5. Assist.id / Clinica preset
6. Medify preset
7. SmartClinic preset
8. Connector lain berdasarkan demand pelanggan

API Connector tidak menjadi prioritas V1 karena membutuhkan izin vendor, keamanan token, dan kontrak integrasi yang lebih matang.

Untuk MVP, keberhasilan bukan ditentukan oleh banyaknya API, tetapi oleh kemampuan membaca file export klinik secara rapi, aman, traceable, dan mudah dimapping ke Google Spreadsheet Data Warehouse.
