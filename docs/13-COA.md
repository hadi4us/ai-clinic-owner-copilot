# 13. Chart of Accounts (COA)

## Purpose

COA normalizes finance categories from SIM Klinik exports or external finance sheets into owner-readable reporting groups.

## Default Clinic COA

The app seeds a default clinic-friendly COA into `MASTER_COA` during setup. It is intentionally practical for Indonesian outpatient clinics (klinik pratama / small specialist clinic), while still simple enough for owner dashboards.

> Final statutory/tax reporting still needs accountant/tax-consultant review. Clinics may add/disable accounts per entity type, PKP/non-PKP status, services, and accountant policy.

### 1000 — Aset

| Code | Account | Typical use |
|---|---|---|
| 1110 | Kas Kecil / Kas Klinik | Tunai front desk/kasir |
| 1120 | Bank Operasional | Rekening bank klinik |
| 1130 | QRIS / EDC Clearing | Settlement payment gateway sebelum masuk bank |
| 1210 | Piutang Pasien Umum | Tagihan pasien umum/perusahaan kecil |
| 1220 | Piutang BPJS | Klaim BPJS belum cair |
| 1230 | Piutang Asuransi / Perusahaan | Klaim asuransi atau kontrak perusahaan |
| 1310 | Persediaan Obat | Stok obat/farmasi |
| 1320 | Persediaan BMHP / Alkes Habis Pakai | Bahan medis habis pakai |
| 1410 | Sewa Dibayar Dimuka | Prepaid rent jika ada |
| 1510 | Peralatan Medis | Aset alat medis |
| 1520 | Peralatan Kantor & Komputer | Aset komputer, printer, furniture |
| 1590 | Akumulasi Penyusutan | Contra asset penyusutan |

### 2000 — Liabilitas

| Code | Account | Typical use |
|---|---|---|
| 2100 | Utang Supplier Obat/BMHP | Tagihan supplier belum dibayar |
| 2210 | Utang Jasa Dokter / Tenaga Medis | Fee dokter/tenaga medis belum dibayar |
| 2220 | Utang Gaji & Honor | Payroll belum dibayar |
| 2300 | Utang Pajak | Parent account pajak |
| 2310 | PPN Keluaran | Jika PKP/relevan |
| 2321 | Utang PPh 21 | Payroll withholding |
| 2323 | Utang PPh 23 | Vendor/professional withholding |
| 2325 | Utang PPh Final UMKM | Jika memakai skema final UMKM |
| 2400 | Utang BPJS Kesehatan/Ketenagakerjaan | Iuran belum dibayar |
| 2500 | Pinjaman Bank / Pembiayaan | Loan/financing |

### 3000 — Ekuitas

| Code | Account | Typical use |
|---|---|---|
| 3100 | Modal Pemilik | Setoran modal |
| 3200 | Prive / Penarikan Pemilik | Penarikan owner |
| 3300 | Saldo Laba Ditahan | Retained earnings |
| 3900 | Laba Tahun Berjalan | Current-year profit rollup |

### 4000 — Pendapatan

| Code | Account | Typical use |
|---|---|---|
| 4110 | Pendapatan Konsultasi / Pemeriksaan Dokter | Konsultasi rawat jalan |
| 4120 | Pendapatan Tindakan Medis | Tindakan medis/prosedur |
| 4130 | Pendapatan Obat / Farmasi | Penjualan obat/farmasi |
| 4140 | Pendapatan Laboratorium / Penunjang | Lab/penunjang internal/kerja sama |
| 4150 | Pendapatan Administrasi | Admin, registrasi, surat, materai |
| 4210 | Pendapatan Klaim BPJS | Klaim BPJS secara akrual |
| 4220 | Pendapatan Asuransi / Perusahaan | Penjamin non-BPJS |
| 4900 | Pendapatan Lain-lain | Pendapatan lain operasional |
| 4990 | Diskon / Penyesuaian Pendapatan | Contra revenue/adjustment |

### 5000 — HPP & Biaya Langsung Layanan

| Code | Account | Typical use |
|---|---|---|
| 5110 | HPP Obat / Farmasi | Cost obat yang terjual/terpakai |
| 5120 | HPP BMHP / Alkes Habis Pakai | Syringe, kasa, reagen, disposable, dll. |
| 5130 | Biaya Laboratorium / Penunjang Langsung | Fee lab rujukan/penunjang langsung |
| 5210 | Jasa Dokter / Fee Tenaga Medis | Fee dokter terkait layanan |
| 5220 | Fee Perawat / Bidan / Terapis | Fee tenaga medis langsung |
| 5230 | Fee Rujukan / Kerja Sama Layanan | Referral/partner service fee jika ada |
| 5290 | Koreksi Klaim / Selisih Penjamin | Selisih klaim BPJS/asuransi |

### 6000 — Beban Operasional

| Code | Account | Typical use |
|---|---|---|
| 6110 | Gaji Karyawan Non Medis | Admin/kasir/back office |
| 6120 | Lembur, Bonus, THR | Kompensasi tambahan |
| 6130 | Tunjangan & Benefit Karyawan | Benefit pegawai |
| 6210 | Sewa Tempat | Rent expense |
| 6220 | Listrik, Air, Internet, Telepon | Utilities |
| 6230 | Kebersihan, Keamanan, Laundry | Operasional fasilitas |
| 6240 | Maintenance Gedung & Peralatan | Perbaikan/servis alat |
| 6250 | Perizinan, STR/SIP, Akreditasi | Legal-operasional klinik |
| 6310 | ATK & Perlengkapan Kantor | Office supplies |
| 6320 | Software, SIM Klinik, Hosting | Subscription/software |
| 6330 | Biaya Bank, EDC, Payment Gateway | Bank charges/payment fees |
| 6410 | Marketing & Promosi | Ads, spanduk, campaign |
| 6420 | Training & Pengembangan SDM | Pelatihan |
| 6430 | Transportasi & Kurir | Kurir/transport operasional |
| 6510 | Jasa Profesional: Akuntan, Pajak, Legal | Konsultan/professional fee |
| 6520 | Asuransi Operasional | Insurance expense |
| 6610 | Beban Penyusutan | Depreciation |
| 6620 | Cadangan / Penghapusan Piutang | Bad debt allowance/write-off |
| 6710 | Beban Pajak | Tax expense management view |
| 6990 | Beban Operasional Lainnya | Fallback expense |

### 7000/8000 — Non Operasional

| Code | Account | Typical use |
|---|---|---|
| 7110 | Pendapatan Bunga/Jasa Giro | Interest income |
| 7190 | Pendapatan Non Operasional Lainnya | Other gains |
| 8110 | Beban Bunga / Administrasi Pinjaman | Loan interest/admin |
| 8190 | Beban Non Operasional Lainnya | Other losses |

## Mapping rule

- Revenue from SIM Klinik should map by `revenue_type` / service category into 4110–4220.
- Inventory/farmasi costs should map to 5110 or 5120 depending on whether they are medicines or BMHP.
- Doctor/medical staff fees should map to 5210/5220, not general salary, when directly tied to service production.
- Back-office payroll, rent, utilities, software, marketing, and admin expenses stay in 6000 operating expenses.
- Tax payable accounts in 2300 are liabilities; tax expense can use 6710 for management reporting.
- If source data cannot distinguish direct cost from operating expense, mark `data_status` as `estimated` or `incomplete` and surface a data-quality warning.
