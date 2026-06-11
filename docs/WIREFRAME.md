# Wireframe - AI Clinic Owner Copilot

Dokumen ini mendefinisikan wireframe seluruh halaman utama sebelum coding dashboard.

Tujuan wireframe:

1. Menentukan struktur halaman.
2. Menentukan komponen utama setiap halaman.
3. Menentukan KPI yang tampil.
4. Menentukan alur navigasi owner.
5. Menghindari coding dashboard sebelum arah UI jelas.

---

# Prinsip UI

1. Dashboard harus menjawab pertanyaan owner dalam 10 detik.
2. Angka utama harus tampil di atas.
3. Insight AI harus selalu dekat dengan data.
4. Setiap halaman harus punya filter periode dan klinik/cabang.
5. Setiap angka penting harus bisa ditelusuri ke sumber data.
6. Jangan menampilkan data klinis detail jika tidak diperlukan.
7. Mobile-first untuk owner yang sering membuka dari HP.
8. Tampilan desktop tetap didukung untuk analisis mendalam.

---

# Global Layout

## Desktop Layout

```text
+--------------------------------------------------------------------------------+
| Top Bar: Logo | Clinic Selector | Period Filter | Sync Status | User Menu       |
+----------------------+---------------------------------------------------------+
| Sidebar              | Page Content                                             |
|                      |                                                         |
| - Dashboard          | [Page Title] [AI Insight Summary]                       |
| - Finance            |                                                         |
| - BPJS               | KPI Cards                                               |
| - Pharmacy           |                                                         |
| - Tax                | Charts / Tables / Alerts                                |
| - AI Chat            |                                                         |
| - Settings           | Recommendations                                         |
|                      |                                                         |
+----------------------+---------------------------------------------------------+
```

## Mobile Layout

```text
+--------------------------------+
| Top Bar: Logo | Filter | Menu   |
+--------------------------------+
| Page Title                     |
| AI Summary Card                |
| KPI Cards                      |
| Charts                         |
| Tables                         |
| Recommendations                |
+--------------------------------+
| Bottom Nav                     |
| Dashboard Finance AI Settings  |
+--------------------------------+
```

---

# Shared Components

## Global Filters

```text
+----------------------------------------------------------+
| Klinik/Cabang: [Semua Cabang v]                          |
| Periode: [Bulan Ini v] [Custom Date]                     |
| Source: [Semua SIM v]                                    |
| Status Data: [Complete / Partial / Estimated / Error]    |
+----------------------------------------------------------+
```

## AI Insight Card

```text
+----------------------------------------------------------+
| AI Insight                                               |
|                                                          |
| Ringkasan:                                               |
| - Omzet naik 12%, tetapi margin turun 4%.                |
| - Penyebab utama: biaya dokter dan stok expired.         |
|                                                          |
| Rekomendasi:                                             |
| 1. Review jasa dokter Poli Umum.                         |
| 2. Prioritaskan penjualan obat near-expired.             |
|                                                          |
| [Tanya AI] [Lihat Detail]                                |
+----------------------------------------------------------+
```

## KPI Card

```text
+-------------------------------+
| Revenue                       |
| Rp 245.000.000                |
| ▲ 12% vs bulan lalu           |
| Status: Complete              |
+-------------------------------+
```

## Alert Card

```text
+----------------------------------------------------------+
| Alert                                                    |
| Severity: High                                           |
| BPJS outstanding > 60 hari mencapai Rp 38.000.000        |
| [Lihat Klaim] [Tanya AI]                                 |
+----------------------------------------------------------+
```

---

# 1. Dashboard

## Tujuan Halaman

Memberi gambaran cepat kondisi bisnis klinik: sehat, waspada, atau berisiko.

## Wireframe

```text
+--------------------------------------------------------------------------------+
| Dashboard                                                                       |
| Filter: Klinik/Cabang | Periode | Source | Status Data                         |
+--------------------------------------------------------------------------------+
| AI Health Summary                                                               |
| Status Klinik: [Sehat / Waspada / Berisiko]                                    |
| 3 alasan utama + 3 rekomendasi                                                  |
+--------------------------------------------------------------------------------+
| KPI Cards                                                                       |
| [Revenue] [Profit] [Total Visits] [BPJS Outstanding] [Pharmacy Margin] [Tax Risk]|
+--------------------------------------------------------------------------------+
| Trend Charts                                                                    |
| [Revenue vs Profit Trend]             [Visits Trend]                            |
+--------------------------------------------------------------------------------+
| Business Breakdown                                                              |
| [Top Poli by Revenue]                 [Top Doctor by Revenue]                   |
| [Branch Performance]                  [Patient Type Mix]                        |
+--------------------------------------------------------------------------------+
| Alerts                                                                          |
| - BPJS klaim >60 hari                                                           |
| - Obat hampir expired                                                           |
| - Biaya naik tidak wajar                                                        |
+--------------------------------------------------------------------------------+
| Recommendations                                                                 |
| [Action 1] [Action 2] [Action 3]                                                |
+--------------------------------------------------------------------------------+
```

## Komponen

- Clinic health status
- AI summary
- KPI cards
- Revenue/profit trend
- Visit trend
- Top poli
- Top dokter
- Branch performance
- Alerts
- Recommendations

## KPI Utama

- Revenue
- Profit
- Net Profit Margin
- Total Visits
- BPJS Outstanding Amount
- Pharmacy Gross Margin
- Tax Risk Flag Count

## Owner Questions

- Klinik saya sehat atau tidak?
- Omzet saya naik atau turun?
- Laba saya aman atau turun?
- Masalah terbesar minggu ini apa?
- Apa yang harus saya lakukan sekarang?

---

# 2. Finance

## Tujuan Halaman

Menganalisis pendapatan, biaya, laba, margin, cashflow, dan piutang.

## Wireframe

```text
+--------------------------------------------------------------------------------+
| Finance                                                                         |
| Filter: Klinik/Cabang | Periode | Source | Status Data                         |
+--------------------------------------------------------------------------------+
| AI Finance Insight                                                              |
| Ringkasan penyebab naik/turun revenue, profit, margin, cost                     |
+--------------------------------------------------------------------------------+
| KPI Cards                                                                       |
| [Revenue] [Profit] [Gross Margin] [Net Margin] [Cost Ratio] [Receivable]        |
+--------------------------------------------------------------------------------+
| Charts                                                                          |
| [Revenue vs Cost vs Profit]          [Revenue by Source: Tindakan/Resep/etc]    |
| [Cost Breakdown]                     [Receivable Aging]                         |
+--------------------------------------------------------------------------------+
| Tables                                                                          |
| Top Revenue Items                                                               |
| Top Cost Categories                                                             |
| Outstanding Receivables                                                         |
+--------------------------------------------------------------------------------+
| Recommendations                                                                 |
| - Kurangi biaya kategori X                                                      |
| - Follow-up piutang Y                                                           |
| - Optimalkan layanan Z                                                          |
+--------------------------------------------------------------------------------+
```

## Komponen

- Finance AI summary
- KPI cards
- Revenue/cost/profit chart
- Revenue source breakdown
- Cost breakdown
- Receivable aging
- Top revenue table
- Cost category table
- Recommendations

## KPI Utama

- Revenue
- Profit
- Gross Profit
- Net Profit Margin
- Revenue Growth
- Profit Growth
- Cost Ratio
- Operating Expense Ratio
- Receivable Amount
- Collection Rate

## Owner Questions

- Berapa omzet saya?
- Berapa laba saya?
- Kenapa laba turun?
- Biaya apa paling besar?
- Piutang saya berapa?
- Apakah margin saya sehat?

---

# 3. BPJS

## Tujuan Halaman

Memantau klaim BPJS, pembayaran, outstanding, aging, rejection, dan risiko cashflow.

## Wireframe

```text
+--------------------------------------------------------------------------------+
| BPJS                                                                            |
| Filter: Klinik/Cabang | Periode Klaim | Status Klaim | Aging                  |
+--------------------------------------------------------------------------------+
| AI BPJS Insight                                                                 |
| Status: Aman / Waspada / Berisiko                                               |
| Penyebab utama risiko klaim dan prioritas follow-up                             |
+--------------------------------------------------------------------------------+
| KPI Cards                                                                       |
| [Claim Amount] [Approved] [Paid] [Outstanding] [Rejection Rate] [Avg Aging]     |
+--------------------------------------------------------------------------------+
| Charts                                                                          |
| [Claim Funnel: Submitted > Approved > Paid]                                     |
| [Outstanding Aging: 0-30 / 31-60 / 61-90 / >90]                                 |
| [BPJS Revenue Share Trend]                                                      |
+--------------------------------------------------------------------------------+
| Tables                                                                          |
| Klaim Outstanding Prioritas                                                     |
| Klaim Ditolak / Pending                                                         |
| Klaim dengan Potongan Terbesar                                                  |
+--------------------------------------------------------------------------------+
| Recommendations                                                                 |
| - Follow-up klaim >60 hari                                                      |
| - Perbaiki penyebab rejection utama                                             |
| - Siapkan dokumen klaim tertunda                                                |
+--------------------------------------------------------------------------------+
```

## Komponen

- BPJS AI summary
- Claim funnel
- Outstanding aging
- Rejection table
- Deduction table
- Follow-up priority list

## KPI Utama

- BPJS Claim Amount
- BPJS Approved Amount
- BPJS Paid Amount
- BPJS Outstanding Amount
- BPJS Approval Rate
- BPJS Rejection Rate
- BPJS Deduction Amount
- BPJS Average Aging Days
- BPJS Claims Over 60 Days

## Owner Questions

- BPJS saya aman tidak?
- Klaim mana yang macet?
- Berapa piutang BPJS belum cair?
- Berapa klaim ditolak?
- Apa prioritas follow-up BPJS?

---

# 4. Pharmacy

## Tujuan Halaman

Memantau omzet farmasi, margin obat, stok, expired, stockout, slow moving, dan dead stock.

## Wireframe

```text
+--------------------------------------------------------------------------------+
| Pharmacy                                                                        |
| Filter: Klinik/Cabang | Periode | Kategori Item | Status Stok                |
+--------------------------------------------------------------------------------+
| AI Pharmacy Insight                                                             |
| Ringkasan stok berisiko, obat paling menguntungkan, dan rekomendasi pembelian   |
+--------------------------------------------------------------------------------+
| KPI Cards                                                                       |
| [Pharmacy Revenue] [Gross Margin] [Inventory Value] [Expired] [Near Expired]    |
| [Stockout Items]                                                                |
+--------------------------------------------------------------------------------+
| Charts                                                                          |
| [Top Selling Medicines]              [Top Margin Medicines]                     |
| [Stock Value by Category]            [Expiry Timeline]                          |
+--------------------------------------------------------------------------------+
| Tables                                                                          |
| Near Expired Stock                                                              |
| Stockout / Low Stock                                                            |
| Dead Stock                                                                      |
| Top Medicine Margin                                                             |
+--------------------------------------------------------------------------------+
| Recommendations                                                                 |
| - Reorder obat fast moving                                                      |
| - Diskon/bundling obat near-expired                                             |
| - Stop pembelian item dead stock                                                |
+--------------------------------------------------------------------------------+
```

## Komponen

- Pharmacy AI summary
- Pharmacy KPI cards
- Top selling chart
- Top margin chart
- Expiry timeline
- Low stock table
- Dead stock table
- Recommendations

## KPI Utama

- Pharmacy Revenue
- Pharmacy Gross Profit
- Pharmacy Gross Margin
- Inventory Value
- Expired Stock Value
- Near Expired Stock Value
- Stockout Item Count
- Low Stock Item Count
- Dead Stock Value
- Average Prescription Value

## Owner Questions

- Obat apa paling laku?
- Obat apa paling menguntungkan?
- Obat apa hampir expired?
- Stok apa yang kosong?
- Stok mati saya berapa?

---

# 5. Tax

## Tujuan Halaman

Memberi estimasi risiko dan kewajiban pajak berdasarkan data revenue, cost, dan dokumen pajak.

## Wireframe

```text
+--------------------------------------------------------------------------------+
| Tax                                                                              |
| Filter: Klinik/Cabang | Periode Pajak | Jenis Pajak | Status Dokumen          |
+--------------------------------------------------------------------------------+
| AI Tax Insight                                                                  |
| Catatan: estimasi awal, bukan nasihat pajak final                               |
| Ringkasan pajak terutang, pajak dibayar, dan risiko rekonsiliasi                |
+--------------------------------------------------------------------------------+
| KPI Cards                                                                       |
| [Taxable Revenue] [VAT Estimate] [Tax Payable] [Tax Paid] [Tax Risk Flags]      |
+--------------------------------------------------------------------------------+
| Charts                                                                          |
| [Revenue vs Tax Report]             [Tax Payable Trend]                         |
| [Tax Expense Breakdown]             [Document Completeness]                     |
+--------------------------------------------------------------------------------+
| Tables                                                                          |
| Rekonsiliasi Revenue vs Pajak                                                   |
| Pajak Terutang                                                                  |
| Dokumen Pajak Belum Lengkap                                                     |
| Risk Flags                                                                      |
+--------------------------------------------------------------------------------+
| Recommendations                                                                 |
| - Cek gap omzet dashboard vs laporan pajak                                      |
| - Lengkapi dokumen pajak                                                        |
| - Validasi estimasi dengan konsultan pajak                                      |
+--------------------------------------------------------------------------------+
```

## Komponen

- Tax AI summary
- Disclaimer pajak
- Tax KPI cards
- Reconciliation chart
- Tax payable trend
- Document completeness
- Risk flags
- Recommendations

## KPI Utama

- Taxable Revenue
- Non Taxable Revenue
- VAT Output Estimate
- VAT Input Estimate
- VAT Payable Estimate
- Corporate Income Tax Estimate
- Tax Payable
- Tax Paid
- Tax Filing Completeness
- Revenue Tax Reconciliation Gap

## Owner Questions

- Pajak saya kira-kira berapa?
- Ada risiko pajak tidak?
- Apakah omzet dashboard sama dengan laporan pajak?
- Dokumen pajak apa yang belum lengkap?

---

# 6. Settings

## Tujuan Halaman

Mengatur klinik, user, sumber data, mapping import, notifikasi, dan preferensi AI.

## Wireframe

```text
+--------------------------------------------------------------------------------+
| Settings                                                                        |
+--------------------------------------------------------------------------------+
| Tabs                                                                            |
| [Clinic Profile] [Users] [Data Sources] [Import Mapping] [Notifications] [AI]   |
+--------------------------------------------------------------------------------+
| Clinic Profile                                                                  |
| - Tenant Name                                                                   |
| - Clinic/Cabang                                                                 |
| - Address                                                                       |
| - Timezone                                                                      |
| - Currency                                                                      |
+--------------------------------------------------------------------------------+
| Data Sources                                                                    |
| - Source System: Khanza / Vmedis / Generic Excel / etc                          |
| - Upload Method: Manual / Google Drive Sync / API                               |
| - Last Sync                                                                     |
| - Data Status                                                                   |
+--------------------------------------------------------------------------------+
| Import Mapping                                                                  |
| - Source Column                                                                 |
| - Universal Column                                                              |
| - Transform Rule                                                                |
| - Required                                                                      |
+--------------------------------------------------------------------------------+
| Notifications                                                                   |
| - Telegram/WhatsApp recipient                                                   |
| - Daily Summary Time                                                            |
| - Alert Thresholds                                                              |
+--------------------------------------------------------------------------------+
| AI Preferences                                                                  |
| - Response Language                                                             |
| - Detail Level                                                                  |
| - Risk Tolerance                                                                |
| - Default Period                                                                |
+--------------------------------------------------------------------------------+
```

## Komponen

- Clinic profile form
- User/role management
- Data source configuration
- Import mapping table
- Notification settings
- AI preferences
- Threshold settings

## Setting Utama

- Tenant ID
- Clinic ID
- Source system
- Mapping source
- Notification channel
- Alert threshold
- AI language
- Data privacy mode

## Owner Questions

- Data saya terakhir sync kapan?
- Mapping import sudah benar belum?
- Siapa saja user yang bisa akses?
- Alert dikirim ke mana?
- AI menjawab dengan gaya apa?

---

# 7. AI Chat

## Tujuan Halaman

Memberi interface tanya-jawab bisnis untuk owner berdasarkan KPI, data warehouse, dan prompt library.

## Wireframe

```text
+--------------------------------------------------------------------------------+
| AI Chat                                                                         |
| Filter Context: Klinik/Cabang | Periode | Data Scope                           |
+--------------------------------------------------------------------------------+
| Suggested Questions                                                             |
| [Mengapa laba turun?] [BPJS saya aman tidak?] [Obat apa hampir expired?]        |
| [Apa yang harus saya lakukan minggu ini?]                                       |
+--------------------------------------------------------------------------------+
| Chat Window                                                                     |
|                                                                                |
| User: Mengapa laba turun?                                                       |
|                                                                                |
| Agent:                                                                          |
| Analisis:                                                                       |
| 1. Pendapatan turun 5%                                                          |
| 2. Biaya dokter naik 12%                                                        |
| 3. Poli Umum margin turun                                                       |
| 4. BPJS outstanding naik                                                        |
|                                                                                |
| Rekomendasi:                                                                    |
| 1. Review biaya dokter                                                          |
| 2. Follow-up klaim BPJS >60 hari                                                |
| 3. Evaluasi harga layanan Poli Umum                                             |
|                                                                                |
| Data dicek: Revenue, Profit, Cost Ratio, BPJS Outstanding                       |
+--------------------------------------------------------------------------------+
| Input Box                                                                       |
| [Tanya sesuatu tentang klinik Anda...] [Send]                                   |
+--------------------------------------------------------------------------------+
| Right Panel / Drawer                                                            |
| - Data Sources Used                                                             |
| - KPI Referenced                                                                |
| - Confidence / Data Quality                                                     |
| - Export Answer                                                                 |
+--------------------------------------------------------------------------------+
```

## Komponen

- Context filter
- Suggested prompts
- Chat window
- AI answer cards
- Data sources used
- KPI referenced
- Data quality indicator
- Export/share answer

## Prompt Utama

- Mengapa laba turun?
- Berapa omzet saya?
- BPJS saya aman tidak?
- Obat apa hampir expired?
- Cabang mana paling bagus?
- Apa yang harus saya lakukan minggu ini?
- Apakah klinik saya sehat?

## Owner Questions

- Tanya bebas tentang kondisi klinik.
- Minta analisis penurunan omzet/laba.
- Minta prioritas tindakan.
- Minta ringkasan harian/bulanan.
- Minta risiko BPJS, farmasi, pajak.

---

# Navigation Flow

```text
Login
↓
Dashboard
├── Finance
├── BPJS
├── Pharmacy
├── Tax
├── AI Chat
└── Settings
```

---

# Mobile Bottom Navigation

```text
+------------------------------------------------+
| Dashboard | Finance | BPJS | Pharmacy | AI     |
+------------------------------------------------+
```

Menu tambahan mobile:

```text
More
├── Tax
├── Settings
└── Logout
```

---

# Empty State

## Belum Ada Data

```text
Belum ada data untuk periode ini.

Langkah berikutnya:
1. Upload file Excel/CSV dari SIM Klinik.
2. Cek mapping import.
3. Jalankan validasi data.

[Upload Data] [Buka Settings]
```

## Data Partial

```text
Data periode ini belum lengkap.

Yang sudah tersedia:
- Kunjungan
- Pendapatan

Yang belum tersedia:
- Biaya
- BPJS
- Persediaan

Beberapa KPI akan ditandai sebagai estimated atau incomplete.
```

## Error Import

```text
Import gagal karena format data tidak sesuai.

Masalah utama:
- Kolom visit_date kosong
- Format angka revenue tidak valid
- Ada duplikasi transaction_id

[Download Validation Log] [Perbaiki Mapping]
```

---

# Alert Severity

| Severity | Warna | Contoh |
|---|---|---|
| Info | Biru | Data berhasil sync |
| Warning | Kuning | Data biaya belum lengkap |
| High | Oranye | BPJS outstanding > 60 hari |
| Critical | Merah | Profit negatif atau stok obat kritis |

---

# Data Quality Indicator

```text
+-----------------------------+
| Data Quality: Partial       |
| Kunjungan: Complete         |
| Pendapatan: Complete        |
| Biaya: Incomplete           |
| BPJS: Partial               |
| Persediaan: Complete        |
+-----------------------------+
```

---

# MVP Page Priority

## MVP Wajib

1. Dashboard
2. Finance
3. BPJS
4. Pharmacy
5. AI Chat
6. Settings

## Setelah MVP

1. Tax
2. Advanced Doctor Analytics
3. Advanced Poli Analytics
4. Multi-branch comparison
5. Export report PDF

---

# Kesimpulan

Wireframe ini menjadi acuan sebelum coding dashboard.

Halaman utama yang harus tersedia:

1. Dashboard
2. Finance
3. BPJS
4. Pharmacy
5. Tax
6. Settings
7. AI Chat

Fokus MVP adalah membuat owner cepat menjawab:

```text
Apakah klinik saya sehat?
Kenapa omzet/laba berubah?
Apa masalah terbesar?
Apa yang harus saya lakukan sekarang?
```
