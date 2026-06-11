# CLAW.md

# KONSTITUSI PROYEK AI CLINIC OWNER COPILOT

Dokumen ini adalah sumber kebenaran utama (Single Source of Truth) untuk seluruh agen OpenClaw yang bekerja pada proyek ini.

Sebelum membuat, mengubah, atau menghapus kode, seluruh agen WAJIB membaca dan mematuhi dokumen ini.

---

# VISI PROYEK

AI Clinic Owner Copilot adalah platform Business Intelligence dan AI Assistant untuk pemilik klinik.

Sistem ini TIDAK menggantikan SIM Klinik.

Sistem ini bekerja di atas SIM Klinik yang sudah digunakan oleh klinik.

Tujuan utama:

Membantu pemilik klinik mengambil keputusan bisnis secara cepat berdasarkan data yang sudah ada.

---

# FILOSOFI UTAMA

## Aturan #1

Tidak boleh ada double entry.

Petugas klinik hanya menginput data pada SIM Klinik.

Jika sebuah fitur mengharuskan petugas menginput ulang data, maka fitur tersebut dianggap gagal.

---

## Aturan #2

SIM Klinik adalah sumber data utama.

Seluruh data berasal dari:

* Export Excel
* Export CSV
* API SIM Klinik
* Sinkronisasi otomatis

AI Clinic Owner Copilot tidak boleh membuat alur operasional baru yang menggantikan SIM Klinik.

---

## Aturan #3

Owner First Design.

Setiap fitur wajib menjawab minimal satu pertanyaan owner.

Contoh:

* Berapa laba saya bulan ini?
* Mengapa laba turun?
* Dokter mana paling menguntungkan?
* Poli mana paling menguntungkan?
* Berapa piutang BPJS saya?
* Obat apa yang berisiko menjadi kerugian?

Jika fitur tidak menjawab pertanyaan bisnis, maka fitur tersebut tidak prioritas.

---

## Aturan #4

Mobile First.

Pemilik klinik lebih sering membuka:

* Telegram
* WhatsApp
* Smartphone

Seluruh insight penting harus tersedia melalui perangkat mobile.

---

## Aturan #5

Accounting Traceability.

Seluruh laporan keuangan harus dapat diturunkan dari jurnal akuntansi yang valid.

Dashboard tidak boleh menghasilkan angka yang tidak dapat ditelusuri ke jurnal sumber.

Implikasi:

* Revenue, cost, expense, gross profit, net profit, margin, dan tax-related metrics wajib punya sumber transaksi/jurnal yang jelas.
* Jika data belum berupa jurnal lengkap, dashboard wajib menandai status sebagai `estimated` atau `incomplete`.
* Setiap angka finance harus bisa ditelusuri minimal ke source row, sync_id, periode, tenant_id, dan clinic_id.
* AI tidak boleh menjelaskan angka finance sebagai final jika angka tersebut belum auditable.

---

# POSISI PRODUK

Kami TIDAK membangun:

* SIM Klinik
* Rekam Medis Elektronik
* Sistem Pendaftaran Pasien
* Sistem Billing
* Sistem Kasir

Kami membangun:

* CFO Virtual
* COO Virtual
* Inventory Manager Virtual
* Business Intelligence Assistant

---

# TARGET PENGGUNA

Pengguna utama:

Pemilik Klinik

Pengguna sekunder:

Manager Klinik

Pengguna pendukung:

* Bagian Keuangan
* Bagian Farmasi
* Supervisor Operasional

---

# PERTANYAAN YANG HARUS BISA DIJAWAB SISTEM

Sistem dianggap berhasil apabila mampu menjawab:

1. Berapa laba klinik saya?
2. Mengapa laba naik atau turun?
3. Dokter mana paling menguntungkan?
4. Poli mana paling menguntungkan?
5. Berapa piutang BPJS yang belum cair?
6. Obat apa yang berpotensi menjadi kerugian?
7. Bagaimana tren pertumbuhan klinik?

Jawaban harus tersedia kurang dari 10 detik.

---

# ARSITEKTUR WAJIB

SIM Klinik
↓
Data Connector
↓
Google Apps Script
↓
Google Spreadsheet Data Warehouse
↓
Analytics Engine
↓
OpenClaw Agent Layer
↓
Dashboard / Telegram / WhatsApp

---

# TEKNOLOGI WAJIB

Backend:

* Google Apps Script

Frontend:

* Google Apps Script HTML Service

Database:

* Google Spreadsheet

Deployment:

* Google Apps Script Web App

DILARANG menggunakan teknologi berikut kecuali mendapat persetujuan eksplisit:

* Laravel
* ExpressJS
* NextJS
* React
* Vue
* Angular
* PostgreSQL
* MySQL

---

# LARANGAN

Jangan pernah membuat:

SIM Klinik
↓
Input Ulang
↓
Dashboard

Model seperti ini dilarang.

---

# MULTI TENANT

Setiap data wajib memiliki:

tenant_id

Contoh:

tenant_id
clinic_id
doctor_id

Semua query wajib dibatasi berdasarkan tenant_id.

Tidak ada pengecualian.

---

# PRIVASI DATA

Sistem hanya menyimpan data minimum yang dibutuhkan.

Hindari menyimpan:

* Rekam medis lengkap
* Catatan dokter
* Diagnosa sensitif

Prioritaskan:

* KPI
* Ringkasan keuangan
* Ringkasan operasional
* Data agregat

---

# TANGGUNG JAWAB AGENT

## Finance Agent

Bertanggung jawab atas:

* Analisis pendapatan
* Analisis biaya
* Analisis laba rugi
* Analisis margin

---

## BPJS Agent

Bertanggung jawab atas:

* Monitoring klaim
* Monitoring piutang
* Aging receivable

---

## Pharmacy Agent

Bertanggung jawab atas:

* Monitoring stok
* Monitoring expired
* Analisis inventory

---

## Executive Agent

Bertanggung jawab atas:

* Ringkasan harian
* Ringkasan mingguan
* Ringkasan bulanan

---

# URUTAN PENGEMBANGAN

Tahap 1

* Data Warehouse
* KPI Engine
* Dashboard Keuangan

Tahap 2

* Dashboard BPJS
* Dashboard Farmasi

Tahap 3

* Integrasi Telegram
* AI Insight

Tahap 4

* OpenClaw Agent
* Business Intelligence Chat

Tahap 5

* Multi Tenant SaaS
* Billing
* Subscription

Jangan melompati tahap tanpa persetujuan.

---

# STANDAR KODE

Wajib:

* Modular
* Mudah diuji
* Mudah dipelihara
* Konfigurasi terpisah

Dilarang:

* Hardcode tenant
* Hardcode credential
* Duplikasi logika

---

# DEFINISI SELESAI

Sebuah fitur dianggap selesai apabila:

* Kode selesai
* Pengujian selesai
* Dokumentasi diperbarui
* Dashboard diperbarui
* Prompt agent diperbarui
* Multi tenant tervalidasi

---

# PENGINGAT TERAKHIR

Proyek ini dibuat untuk membantu pemilik klinik mengambil keputusan yang lebih baik.

Jika sebuah fitur tidak membantu pengambilan keputusan, sederhanakan atau hapus fitur tersebut.
