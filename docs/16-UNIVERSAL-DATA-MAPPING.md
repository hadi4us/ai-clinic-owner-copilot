# 16 - Universal Data Mapping

Dokumen ini mendefinisikan template Excel universal untuk AI Clinic Owner Copilot.

Tujuannya adalah membuat satu format import standar yang bisa menampung data dari berbagai SIM Klinik yang berbeda-beda, tanpa memaksa klinik mengganti SIM dan tanpa membuat alur input ulang.

---

# Latar Belakang

Setiap SIM Klinik memiliki struktur export yang berbeda:

- nama kolom berbeda
- urutan kolom berbeda
- format tanggal berbeda
- format angka berbeda
- istilah layanan berbeda
- pemisahan data berbeda antar modul

Karena itu, AI Clinic Owner Copilot membutuhkan **Universal Data Mapping** sebagai lapisan tengah.

SIM Klinik apa pun boleh punya format sendiri, tetapi sebelum masuk ke Data Warehouse, data harus dipetakan ke template universal.

---

# Konsep Alur Data Universal

Alur data utama:

```text
Kunjungan
↓
Pendapatan
↓
Biaya
↓
Persediaan
↓
BPJS
```

Makna alur:

1. **Kunjungan** adalah sumber aktivitas klinik.
2. **Pendapatan** muncul dari layanan, obat, tindakan, paket, administrasi, dan pembayaran pasien.
3. **Biaya** muncul dari operasional klinik, HPP obat, jasa dokter, bahan medis, dan biaya lain.
4. **Persediaan** menjelaskan stok obat/BMHP yang memengaruhi HPP dan risiko kerugian.
5. **BPJS** menjelaskan klaim, piutang, pembayaran, koreksi, dan aging receivable.

---

# Prinsip Template Universal

1. Template universal bukan SIM Klinik.
2. Template universal hanya format import dan staging.
3. Data tetap berasal dari SIM Klinik sumber.
4. Semua baris wajib memiliki `tenant_id` dan `clinic_id`.
5. Semua baris harus menyimpan informasi sumber data.
6. Data pasien harus diminimalkan.
7. Data klinis detail tidak wajib diimpor.
8. Kolom yang tidak tersedia dari SIM sumber boleh kosong.
9. Kolom kosong harus ditandai sebagai `missing`, bukan diisi angka palsu.
10. Semua nilai uang harus bisa ditelusuri ke file/baris sumber jika memungkinkan.

---

# Struktur Template Import Universal

Template Import Universal disarankan berupa satu file Excel dengan beberapa sheet berikut:

1. `README`
2. `CONFIG`
3. `KUNJUNGAN`
4. `PENDAPATAN`
5. `BIAYA`
6. `PERSEDIAAN`
7. `BPJS`
8. `MAPPING_SUMBER`
9. `VALIDATION_LOG`

---

# Sheet: README

Sheet ini berisi panduan singkat untuk pengguna.

## Kolom / Isi

| Field | Keterangan |
|---|---|
| Nama Template | Template Import Universal AI Clinic Owner Copilot |
| Versi Template | Contoh: `v1.0` |
| Tujuan | Menstandarkan import data dari berbagai SIM Klinik |
| Cara Pakai | Export data dari SIM Klinik, lalu copy/mapping ke sheet sesuai jenis data |
| Catatan Privasi | Jangan memasukkan rekam medis detail jika tidak diperlukan |
| Kontak Support | Diisi sesuai kebutuhan implementasi |

---

# Sheet: CONFIG

Sheet ini menyimpan identitas tenant, klinik, periode, dan sumber data.

## Kolom Wajib

| Kolom | Wajib | Contoh | Keterangan |
|---|---|---|---|
| tenant_id | Ya | `tenant_001` | ID tenant/pemilik usaha |
| clinic_id | Ya | `clinic_001` | ID klinik/cabang |
| clinic_name | Ya | `Klinik Sehat Sentosa` | Nama klinik |
| source_system | Ya | `Khanza` | Nama SIM Klinik sumber |
| source_version | Tidak | `2025.01` | Versi sistem jika diketahui |
| import_period_start | Ya | `2026-01-01` | Awal periode data |
| import_period_end | Ya | `2026-01-31` | Akhir periode data |
| currency | Ya | `IDR` | Mata uang |
| prepared_by | Tidak | `Admin Klinik` | Penyiap file |
| prepared_at | Tidak | `2026-02-01 10:00` | Waktu persiapan file |

---

# Sheet: KUNJUNGAN

Sheet ini menjadi fondasi aktivitas klinik.

Satu baris idealnya mewakili satu kunjungan pasien atau satu episode layanan.

## Kolom Universal

| Kolom | Wajib | Tipe | Keterangan |
|---|---|---|---|
| tenant_id | Ya | Text | ID tenant |
| clinic_id | Ya | Text | ID klinik/cabang |
| source_system | Ya | Text | SIM sumber |
| source_file | Tidak | Text | Nama file asal |
| source_row_id | Tidak | Text/Number | Nomor baris/ID sumber |
| visit_id | Ya | Text | ID kunjungan universal |
| visit_date | Ya | Date | Tanggal kunjungan |
| registration_time | Tidak | DateTime | Jam registrasi |
| patient_ref | Tidak | Text | ID pasien pseudonymous, bukan NIK/nama lengkap |
| patient_type | Tidak | Text | Umum/BPJS/Asuransi/Perusahaan/Lainnya |
| payer_type | Tidak | Text | Cash/BPJS/Asuransi/Corporate |
| poli | Tidak | Text | Poli/unit layanan |
| doctor_id | Tidak | Text | ID dokter jika tersedia |
| doctor_name | Tidak | Text | Nama dokter jika dibutuhkan untuk KPI |
| service_category | Tidak | Text | Rawat jalan, tindakan, lab, farmasi, dll |
| service_name | Tidak | Text | Nama layanan utama |
| diagnosis_group | Tidak | Text | Kelompok diagnosis, bukan detail medis sensitif |
| status | Tidak | Text | Selesai/Batal/Pending |
| branch_unit | Tidak | Text | Unit/cabang internal |
| notes | Tidak | Text | Catatan non-klinis |

## Mapping dari SIM

Contoh variasi nama kolom dari SIM sumber:

| Universal | Variasi Kolom Sumber |
|---|---|
| visit_date | Tanggal, Tgl Kunjungan, Tanggal Registrasi, Tgl Periksa |
| visit_id | No Registrasi, No Rawat, ID Visit, Nomor Kunjungan |
| patient_ref | No RM, Patient ID, ID Pasien |
| poli | Poli, Unit, Klinik, Departemen |
| doctor_name | Dokter, Nama Dokter, DPJP, Provider |
| payer_type | Jenis Pasien, Cara Bayar, Penjamin |

---

# Sheet: PENDAPATAN

Sheet ini menampung seluruh pendapatan dan transaksi pembayaran.

Satu baris bisa mewakili satu item transaksi, satu invoice, atau satu pembayaran tergantung kemampuan export SIM sumber. Untuk traceability terbaik, gunakan level item transaksi.

## Kolom Universal

| Kolom | Wajib | Tipe | Keterangan |
|---|---|---|---|
| tenant_id | Ya | Text | ID tenant |
| clinic_id | Ya | Text | ID klinik |
| source_system | Ya | Text | SIM sumber |
| source_file | Tidak | Text | Nama file asal |
| source_row_id | Tidak | Text/Number | ID/baris sumber |
| transaction_id | Ya | Text | ID transaksi/invoice |
| visit_id | Tidak | Text | Relasi ke KUNJUNGAN |
| transaction_date | Ya | Date | Tanggal transaksi |
| revenue_type | Ya | Text | Layanan/Obat/Tindakan/Admin/Lab/Radiologi/Lainnya |
| item_code | Tidak | Text | Kode item jika tersedia |
| item_name | Ya | Text | Nama item/layanan |
| quantity | Tidak | Number | Jumlah item |
| unit_price | Tidak | Number | Harga satuan |
| gross_amount | Ya | Number | Nilai bruto |
| discount_amount | Tidak | Number | Diskon |
| net_amount | Ya | Number | Nilai bersih |
| paid_amount | Tidak | Number | Jumlah dibayar |
| receivable_amount | Tidak | Number | Piutang |
| payment_method | Tidak | Text | Cash/Transfer/QRIS/EDC/BPJS/Asuransi |
| payer_type | Tidak | Text | Umum/BPJS/Asuransi/Corporate |
| cashier | Tidak | Text | Kasir/operator |
| status | Tidak | Text | Paid/Unpaid/Partial/Cancel/Refund |

## Mapping dari SIM

| Universal | Variasi Kolom Sumber |
|---|---|
| transaction_id | No Invoice, No Transaksi, No Nota, Billing ID |
| transaction_date | Tanggal Bayar, Tanggal Transaksi, Tgl Invoice |
| revenue_type | Jenis Layanan, Kategori, Kelompok Item |
| item_name | Nama Layanan, Tindakan, Obat, Item |
| gross_amount | Total, Subtotal, Bruto, Tagihan |
| discount_amount | Diskon, Potongan |
| net_amount | Netto, Total Bayar, Grand Total |
| paid_amount | Bayar, Terbayar, Pembayaran |
| receivable_amount | Piutang, Sisa Tagihan |

---

# Sheet: BIAYA

Sheet ini menampung biaya operasional dan biaya langsung yang tersedia dari SIM atau laporan keuangan klinik.

Jika SIM Klinik tidak menyediakan biaya lengkap, sheet ini bisa diisi dari export akuntansi/manual finance, tetapi tetap tidak boleh menjadi double entry operasional.

## Kolom Universal

| Kolom | Wajib | Tipe | Keterangan |
|---|---|---|---|
| tenant_id | Ya | Text | ID tenant |
| clinic_id | Ya | Text | ID klinik |
| source_system | Ya | Text | SIM/akuntansi sumber |
| source_file | Tidak | Text | Nama file asal |
| source_row_id | Tidak | Text/Number | ID/baris sumber |
| expense_id | Ya | Text | ID biaya |
| expense_date | Ya | Date | Tanggal biaya |
| expense_category | Ya | Text | Gaji/Sewa/Utilitas/Obat/BMHP/Jasa Dokter/Marketing/Lainnya |
| expense_name | Ya | Text | Nama biaya |
| amount | Ya | Number | Nilai biaya |
| payment_method | Tidak | Text | Cash/Transfer/Bank/Lainnya |
| vendor_name | Tidak | Text | Vendor/supplier |
| related_visit_id | Tidak | Text | Relasi ke kunjungan jika biaya langsung |
| related_item_code | Tidak | Text | Kode obat/item jika terkait persediaan |
| cost_type | Tidak | Text | Fixed/Variable/COGS/Operational |
| status | Tidak | Text | Paid/Unpaid/Accrued/Cancel |

## Mapping dari SIM / Sumber Keuangan

| Universal | Variasi Kolom Sumber |
|---|---|
| expense_date | Tanggal, Tgl Biaya, Tanggal Pembelian |
| expense_category | Kategori, Akun, Jenis Biaya |
| expense_name | Deskripsi, Nama Biaya, Keterangan |
| amount | Nominal, Total, Nilai |
| vendor_name | Supplier, Vendor, Pemasok |

---

# Sheet: PERSEDIAAN

Sheet ini menampung stok obat, BMHP, dan item persediaan lain yang memengaruhi margin dan risiko kerugian.

Satu baris dapat mewakili posisi stok akhir, mutasi stok, atau batch obat. Untuk analisis terbaik, gunakan mutasi stok dan batch jika tersedia.

## Kolom Universal

| Kolom | Wajib | Tipe | Keterangan |
|---|---|---|---|
| tenant_id | Ya | Text | ID tenant |
| clinic_id | Ya | Text | ID klinik |
| source_system | Ya | Text | SIM sumber |
| source_file | Tidak | Text | Nama file asal |
| source_row_id | Tidak | Text/Number | ID/baris sumber |
| inventory_id | Ya | Text | ID baris persediaan |
| item_code | Tidak | Text | Kode obat/item |
| item_name | Ya | Text | Nama obat/item |
| item_category | Tidak | Text | Obat/BMHP/Alkes/Lainnya |
| unit | Tidak | Text | Tablet/Botol/Box/Pcs/etc |
| batch_no | Tidak | Text | Nomor batch |
| expiry_date | Tidak | Date | Tanggal kedaluwarsa |
| stock_date | Ya | Date | Tanggal posisi/mutasi stok |
| opening_stock | Tidak | Number | Stok awal |
| stock_in | Tidak | Number | Stok masuk |
| stock_out | Tidak | Number | Stok keluar |
| closing_stock | Tidak | Number | Stok akhir |
| purchase_price | Tidak | Number | Harga beli |
| selling_price | Tidak | Number | Harga jual |
| stock_value | Tidak | Number | Nilai stok |
| supplier_name | Tidak | Text | Supplier |
| movement_type | Tidak | Text | Opening/In/Purchase/Sale/Adjustment/Return/Closing |
| status | Tidak | Text | Active/Expired/Near Expired/Discontinued |

## Mapping dari SIM

| Universal | Variasi Kolom Sumber |
|---|---|
| item_code | Kode Obat, Kode Barang, SKU |
| item_name | Nama Obat, Nama Barang, Item |
| stock_date | Tanggal, Periode, Tgl Mutasi |
| opening_stock | Stok Awal, Saldo Awal |
| stock_in | Masuk, Pembelian, Qty Masuk |
| stock_out | Keluar, Penjualan, Qty Keluar |
| closing_stock | Stok Akhir, Saldo Akhir, Sisa Stok |
| expiry_date | ED, Expired Date, Kedaluwarsa |

---

# Sheet: BPJS

Sheet ini menampung data klaim, piutang, pembayaran, dan koreksi BPJS.

Data BPJS sebaiknya berada di level klaim/agregat bisnis, bukan detail medis pasien.

## Kolom Universal

| Kolom | Wajib | Tipe | Keterangan |
|---|---|---|---|
| tenant_id | Ya | Text | ID tenant |
| clinic_id | Ya | Text | ID klinik |
| source_system | Ya | Text | SIM sumber |
| source_file | Tidak | Text | Nama file asal |
| source_row_id | Tidak | Text/Number | ID/baris sumber |
| claim_id | Ya | Text | ID klaim universal |
| claim_period | Ya | Text | Periode klaim, contoh `2026-01` |
| claim_date | Tidak | Date | Tanggal klaim dibuat/diajukan |
| service_month | Tidak | Text | Bulan pelayanan |
| claim_type | Tidak | Text | Kapitasi/Non Kapitasi/INA-CBG/Obat/Lainnya |
| claim_amount | Ya | Number | Nilai klaim |
| approved_amount | Tidak | Number | Nilai disetujui |
| paid_amount | Tidak | Number | Nilai dibayar |
| outstanding_amount | Tidak | Number | Sisa piutang |
| deduction_amount | Tidak | Number | Koreksi/potongan |
| payment_date | Tidak | Date | Tanggal cair |
| claim_status | Ya | Text | Draft/Submitted/Verified/Approved/Paid/Rejected/Pending |
| aging_days | Tidak | Number | Umur piutang |
| notes | Tidak | Text | Catatan non-klinis |

## Mapping dari SIM

| Universal | Variasi Kolom Sumber |
|---|---|
| claim_id | No Klaim, Nomor SEP, Nomor Pengajuan, Claim ID |
| claim_period | Periode, Bulan Klaim, Periode Pelayanan |
| claim_amount | Nilai Klaim, Tagihan, Diajukan |
| approved_amount | Disetujui, Layak Bayar, Verifikasi |
| paid_amount | Dibayar, Cair, Pembayaran |
| outstanding_amount | Piutang, Sisa, Belum Dibayar |
| claim_status | Status, Status Klaim, Keterangan |

---

# Sheet: MAPPING_SUMBER

Sheet ini mencatat mapping antara kolom file sumber dan kolom universal.

Tujuannya agar import bisa diaudit dan digunakan ulang.

## Kolom

| Kolom | Wajib | Keterangan |
|---|---|---|
| mapping_id | Ya | ID mapping |
| tenant_id | Ya | ID tenant |
| clinic_id | Ya | ID klinik |
| source_system | Ya | SIM sumber |
| source_report_name | Ya | Nama laporan sumber |
| source_sheet_name | Tidak | Nama sheet sumber |
| source_column | Ya | Nama kolom asli dari file sumber |
| universal_sheet | Ya | Sheet tujuan universal |
| universal_column | Ya | Kolom universal tujuan |
| transform_rule | Tidak | Aturan transformasi, contoh date normalization |
| required | Tidak | Ya/Tidak |
| default_value | Tidak | Nilai default jika sumber kosong |
| notes | Tidak | Catatan mapping |

---

# Sheet: VALIDATION_LOG

Sheet ini mencatat hasil validasi import.

## Kolom

| Kolom | Wajib | Keterangan |
|---|---|---|
| validation_id | Ya | ID validasi |
| import_id | Ya | ID proses import |
| sheet_name | Ya | Sheet yang divalidasi |
| row_number | Tidak | Nomor baris bermasalah |
| column_name | Tidak | Kolom bermasalah |
| severity | Ya | Info/Warning/Error |
| issue_type | Ya | Missing Required/Invalid Date/Invalid Number/Duplicate/etc |
| message | Ya | Pesan validasi |
| source_value | Tidak | Nilai sumber |
| normalized_value | Tidak | Nilai setelah normalisasi |
| resolved | Tidak | Ya/Tidak |

---

# Template Import Universal

Berikut struktur Template Import Universal yang harus dibuat dalam bentuk file Excel/Google Spreadsheet.

## Nama File

```text
AI-Clinic-Owner-Copilot-Universal-Import-Template-v1.xlsx
```

## Sheet Wajib

```text
README
CONFIG
KUNJUNGAN
PENDAPATAN
BIAYA
PERSEDIAAN
BPJS
MAPPING_SUMBER
VALIDATION_LOG
```

---

# Header Template

## README

```text
Field
Value
Keterangan
```

## CONFIG

```text
tenant_id
clinic_id
clinic_name
source_system
source_version
import_period_start
import_period_end
currency
prepared_by
prepared_at
```

## KUNJUNGAN

```text
tenant_id
clinic_id
source_system
source_file
source_row_id
visit_id
visit_date
registration_time
patient_ref
patient_type
payer_type
poli
doctor_id
doctor_name
service_category
service_name
diagnosis_group
status
branch_unit
notes
```

## PENDAPATAN

```text
tenant_id
clinic_id
source_system
source_file
source_row_id
transaction_id
visit_id
transaction_date
revenue_type
item_code
item_name
quantity
unit_price
gross_amount
discount_amount
net_amount
paid_amount
receivable_amount
payment_method
payer_type
cashier
status
```

## BIAYA

```text
tenant_id
clinic_id
source_system
source_file
source_row_id
expense_id
expense_date
expense_category
expense_name
amount
payment_method
vendor_name
related_visit_id
related_item_code
cost_type
status
```

## PERSEDIAAN

```text
tenant_id
clinic_id
source_system
source_file
source_row_id
inventory_id
item_code
item_name
item_category
unit
batch_no
expiry_date
stock_date
opening_stock
stock_in
stock_out
closing_stock
purchase_price
selling_price
stock_value
supplier_name
movement_type
status
```

## BPJS

```text
tenant_id
clinic_id
source_system
source_file
source_row_id
claim_id
claim_period
claim_date
service_month
claim_type
claim_amount
approved_amount
paid_amount
outstanding_amount
deduction_amount
payment_date
claim_status
aging_days
notes
```

## MAPPING_SUMBER

```text
mapping_id
tenant_id
clinic_id
source_system
source_report_name
source_sheet_name
source_column
universal_sheet
universal_column
transform_rule
required
default_value
notes
```

## VALIDATION_LOG

```text
validation_id
import_id
sheet_name
row_number
column_name
severity
issue_type
message
source_value
normalized_value
resolved
```

---

# Contoh Mapping Antar SIM

## Khanza

| Data Universal | Kemungkinan Sumber Khanza |
|---|---|
| KUNJUNGAN | Laporan registrasi/rawat jalan |
| PENDAPATAN | Billing, kasir, pembayaran, tindakan |
| BIAYA | Belum tentu tersedia lengkap; bisa dari laporan akuntansi/pembelian |
| PERSEDIAAN | Farmasi, stok obat, mutasi obat |
| BPJS | Klaim/bridging/laporan BPJS jika tersedia |

## Vmedis

| Data Universal | Kemungkinan Sumber Vmedis |
|---|---|
| KUNJUNGAN | Laporan klinik/pendaftaran |
| PENDAPATAN | Laporan transaksi/penjualan |
| BIAYA | Pembelian dan biaya operasional jika tersedia |
| PERSEDIAAN | Data obat, stok, mutasi, expired date |
| BPJS | Jika klinik menggunakan modul/rekap BPJS terkait |

## Klinik Pintar

| Data Universal | Kemungkinan Sumber Klinik Pintar |
|---|---|
| KUNJUNGAN | Laporan layanan |
| PENDAPATAN | Laporan layanan dan pendapatan |
| BIAYA | Perlu laporan tambahan atau sumber akuntansi |
| PERSEDIAAN | Jika modul farmasi/stok tersedia |
| BPJS | Jika laporan klaim/piutang tersedia |

## Assist.id / Clinica

| Data Universal | Kemungkinan Sumber Assist.id |
|---|---|
| KUNJUNGAN | Export data klinik/laporan layanan |
| PENDAPATAN | Export transaksi/kasir/laporan operasional |
| BIAYA | Modul keuangan/payroll jika tersedia |
| PERSEDIAAN | Modul farmasi/stok |
| BPJS | Modul BPJS/P-Care jika tersedia |

## Medify

| Data Universal | Kemungkinan Sumber Medify |
|---|---|
| KUNJUNGAN | Modul administrasi/pelayanan |
| PENDAPATAN | Modul billing/keuangan |
| BIAYA | Modul keuangan/pembelian jika tersedia |
| PERSEDIAAN | Modul farmasi/logistik |
| BPJS | Modul klaim/penjamin jika tersedia |

---

# Aturan Validasi Minimum

## Validasi Umum

- `tenant_id` wajib ada.
- `clinic_id` wajib ada.
- `source_system` wajib ada.
- Tanggal harus bisa dinormalisasi ke format `YYYY-MM-DD`.
- Nilai uang harus angka tanpa simbol mata uang.
- Baris duplikat harus dideteksi berdasarkan kombinasi ID sumber dan nilai utama.

## Validasi KUNJUNGAN

- `visit_id` wajib ada.
- `visit_date` wajib ada.
- Jika `payer_type = BPJS`, data terkait sebaiknya bisa ditelusuri ke sheet BPJS atau klaim.

## Validasi PENDAPATAN

- `transaction_id` wajib ada.
- `transaction_date` wajib ada.
- `net_amount` wajib angka.
- `net_amount` tidak boleh negatif kecuali status refund/cancel.

## Validasi BIAYA

- `expense_id` wajib ada.
- `expense_date` wajib ada.
- `amount` wajib angka.
- `expense_category` wajib ada.

## Validasi PERSEDIAAN

- `inventory_id` wajib ada.
- `item_name` wajib ada.
- `stock_date` wajib ada.
- `closing_stock` tidak boleh negatif kecuali memang ditandai sebagai data issue.

## Validasi BPJS

- `claim_id` wajib ada.
- `claim_period` wajib ada.
- `claim_amount` wajib angka.
- `claim_status` wajib ada.
- `outstanding_amount` harus konsisten dengan klaim, disetujui, dan pembayaran jika semua data tersedia.

---

# Status Data

Setiap hasil import harus diberi status kualitas data.

| Status | Arti |
|---|---|
| `complete` | Kolom wajib lengkap dan lolos validasi |
| `partial` | Sebagian data tersedia tetapi masih bisa dianalisis terbatas |
| `estimated` | Nilai analitik dihitung dari data tidak lengkap |
| `incomplete` | Data belum cukup untuk kesimpulan final |
| `invalid` | Data gagal validasi dan tidak boleh dipakai |

---

# Hubungan ke Data Warehouse

Template Import Universal adalah staging layer.

Setelah validasi, data dipindahkan ke Google Spreadsheet Data Warehouse:

| Template Universal | Data Warehouse Target |
|---|---|
| KUNJUNGAN | `fact_visit` / `KUNJUNGAN` |
| PENDAPATAN | `fact_revenue` / `PENDAPATAN` |
| BIAYA | `fact_expense` / `BIAYA` |
| PERSEDIAAN | `fact_inventory` / `PERSEDIAAN` |
| BPJS | `fact_bpjs_claim` / `BPJS_KLAIM` |
| MAPPING_SUMBER | `import_mapping` |
| VALIDATION_LOG | `import_validation_log` |

---

# Batasan V1

V1 hanya mendukung:

- Upload Excel
- Upload CSV
- Mapping manual/semi otomatis
- Validasi dasar
- Import ke Google Spreadsheet Data Warehouse

V1 tidak mendukung:

- koneksi database langsung
- API vendor langsung
- scraping dashboard SIM Klinik
- input ulang operasional pasien
- penyimpanan rekam medis detail

---

# Kesimpulan

Universal Data Mapping adalah fondasi agar AI Clinic Owner Copilot bisa kompatibel dengan banyak SIM Klinik tanpa membangun connector khusus sejak awal.

Urutan konsep data tetap sederhana:

```text
Kunjungan
↓
Pendapatan
↓
Biaya
↓
Persediaan
↓
BPJS
```

Dengan pendekatan ini, setiap SIM Klinik cukup dipetakan ke template universal, lalu data warehouse dan dashboard dapat memakai struktur yang konsisten.
