# 17 - KPI Dictionary

Dokumen ini mendefinisikan KPI utama untuk AI Clinic Owner Copilot.

KPI Dictionary menjadi acuan tunggal untuk dashboard, AI insight, dan laporan owner.

---

# Prinsip KPI

1. Setiap KPI harus menjawab pertanyaan owner.
2. Setiap KPI harus memiliki formula yang jelas.
3. Setiap KPI harus memiliki sumber data yang dapat ditelusuri.
4. KPI finance tidak boleh dianggap final jika belum traceable ke transaksi/jurnal sumber.
5. KPI boleh berstatus `complete`, `partial`, `estimated`, `incomplete`, atau `invalid` sesuai kualitas data.

---

# Kelompok KPI

- Finance
- BPJS
- Operasional
- Dokter
- Poli
- Farmasi
- Pajak

---

# Ringkasan Jumlah KPI

- Finance: 25 KPI
- BPJS: 20 KPI
- Operasional: 20 KPI
- Dokter: 15 KPI
- Poli: 15 KPI
- Farmasi: 20 KPI
- Pajak: 15 KPI
- Total: 130 KPI

---

# Format Dictionary

| Field | Keterangan |
|---|---|
| KPI Name | Nama KPI |
| Formula | Rumus perhitungan |
| Source | Sumber data utama |
| Owner Question | Pertanyaan owner yang dijawab |
| Notes | Catatan interpretasi / guardrail |

---

# Finance

| No | KPI Name | Formula | Source | Owner Question | Notes |
|---:|---|---|---|---|---|
| 1 | Revenue | Total Pendapatan | TINDAKAN + RESEP | Berapa omzet saya? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 2 | Profit | Revenue - Cost | PENDAPATAN + BIAYA | Berapa laba saya? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 3 | Gross Profit | Revenue - Cost of Goods Sold | PENDAPATAN + PERSEDIAAN + BIAYA | Berapa laba kotor klinik saya? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 4 | Net Profit | Revenue - Total Cost - Tax | PENDAPATAN + BIAYA + PAJAK | Berapa laba bersih klinik saya? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 5 | Gross Profit Margin | Gross Profit / Revenue x 100% | PENDAPATAN + BIAYA | Berapa margin kotor saya? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 6 | Net Profit Margin | Net Profit / Revenue x 100% | PENDAPATAN + BIAYA + PAJAK | Berapa margin laba bersih saya? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 7 | Revenue Growth | (Revenue Periode Ini - Revenue Periode Sebelumnya) / Revenue Periode Sebelumnya x 100% | PENDAPATAN | Apakah omzet saya naik atau turun? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 8 | Profit Growth | (Profit Periode Ini - Profit Periode Sebelumnya) / Profit Periode Sebelumnya x 100% | PENDAPATAN + BIAYA | Apakah laba saya naik atau turun? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 9 | Average Revenue per Visit | Revenue / Jumlah Kunjungan | PENDAPATAN + KUNJUNGAN | Rata-rata pendapatan per pasien berapa? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 10 | Average Transaction Value | Revenue / Jumlah Transaksi | PENDAPATAN | Rata-rata nilai transaksi berapa? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 11 | Cash Revenue | Total pendapatan dengan metode cash/tunai | PENDAPATAN | Berapa pendapatan tunai saya? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 12 | Non-Cash Revenue | Total pendapatan transfer/QRIS/EDC/asuransi | PENDAPATAN | Berapa pendapatan non-tunai saya? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 13 | Receivable Amount | Total tagihan belum dibayar | PENDAPATAN + BPJS | Berapa piutang saya? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 14 | Receivable Ratio | Receivable Amount / Revenue x 100% | PENDAPATAN + BPJS | Berapa persen omzet masih jadi piutang? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 15 | Collection Rate | Paid Amount / Net Amount x 100% | PENDAPATAN | Seberapa cepat uang masuk? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 16 | Refund Amount | Total nilai refund | PENDAPATAN | Berapa refund periode ini? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 17 | Discount Amount | Total diskon | PENDAPATAN | Berapa diskon yang diberikan? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 18 | Discount Ratio | Discount Amount / Gross Amount x 100% | PENDAPATAN | Apakah diskon terlalu besar? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 19 | Cost Ratio | Total Cost / Revenue x 100% | BIAYA + PENDAPATAN | Berapa persen omzet habis untuk biaya? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 20 | Operating Expense Ratio | Operating Expense / Revenue x 100% | BIAYA + PENDAPATAN | Berapa berat biaya operasional saya? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 21 | Doctor Fee Ratio | Total Jasa Dokter / Revenue x 100% | BIAYA + PENDAPATAN | Berapa persen omzet untuk jasa dokter? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 22 | COGS Ratio | COGS / Revenue x 100% | PERSEDIAAN + PENDAPATAN | Berapa persen omzet habis untuk HPP obat/BMHP? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 23 | EBITDA Estimate | Revenue - Operating Expense excluding tax/depreciation/interest | PENDAPATAN + BIAYA | Berapa estimasi EBITDA klinik? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 24 | Break Even Revenue Gap | Revenue - Estimated Break Even Revenue | PENDAPATAN + BIAYA | Omzet saya sudah melewati titik impas belum? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |
| 25 | Revenue per Clinic | Revenue dikelompokkan per clinic_id | PENDAPATAN | Cabang mana menghasilkan omzet terbesar? | Angka finance harus traceable; tandai estimated/incomplete jika sumber belum lengkap. |

# BPJS

| No | KPI Name | Formula | Source | Owner Question | Notes |
|---:|---|---|---|---|---|
| 26 | BPJS Claim Amount | Total nilai klaim BPJS diajukan | BPJS | Berapa klaim BPJS saya? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 27 | BPJS Approved Amount | Total klaim BPJS disetujui | BPJS | Berapa klaim yang disetujui? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 28 | BPJS Paid Amount | Total klaim BPJS dibayar | BPJS | Berapa uang BPJS yang sudah cair? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 29 | BPJS Outstanding Amount | Claim Amount - Paid Amount | BPJS | Berapa piutang BPJS belum cair? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 30 | BPJS Approval Rate | Approved Amount / Claim Amount x 100% | BPJS | Berapa persen klaim disetujui? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 31 | BPJS Payment Rate | Paid Amount / Approved Amount x 100% | BPJS | Berapa persen klaim disetujui sudah dibayar? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 32 | BPJS Rejection Rate | Rejected Claim Count / Total Claim Count x 100% | BPJS | Berapa persen klaim ditolak? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 33 | BPJS Deduction Amount | Total potongan/koreksi klaim | BPJS | Berapa nilai klaim dipotong? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 34 | BPJS Deduction Ratio | Deduction Amount / Claim Amount x 100% | BPJS | Berapa persen klaim terkoreksi? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 35 | BPJS Average Aging Days | Rata-rata hari outstanding klaim | BPJS | Rata-rata klaim cair berapa lama? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 36 | BPJS Claims Over 30 Days | Jumlah/nilai klaim outstanding >30 hari | BPJS | Berapa klaim macet lebih dari 30 hari? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 37 | BPJS Claims Over 60 Days | Jumlah/nilai klaim outstanding >60 hari | BPJS | Berapa klaim macet lebih dari 60 hari? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 38 | BPJS Claims Over 90 Days | Jumlah/nilai klaim outstanding >90 hari | BPJS | Berapa klaim macet lebih dari 90 hari? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 39 | BPJS Revenue Share | BPJS Revenue / Total Revenue x 100% | PENDAPATAN + BPJS | Seberapa tergantung klinik pada BPJS? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 40 | BPJS Visit Share | BPJS Visit Count / Total Visit Count x 100% | KUNJUNGAN | Berapa persen pasien BPJS? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 41 | Average BPJS Claim per Visit | BPJS Claim Amount / BPJS Visit Count | BPJS + KUNJUNGAN | Rata-rata klaim BPJS per kunjungan berapa? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 42 | BPJS Pending Claim Count | Jumlah klaim status pending | BPJS | Berapa klaim masih pending? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 43 | BPJS Submitted Claim Count | Jumlah klaim submitted | BPJS | Berapa klaim sudah diajukan? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 44 | BPJS Paid Claim Count | Jumlah klaim paid | BPJS | Berapa klaim sudah dibayar? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |
| 45 | BPJS Claim Cycle Time | Payment Date - Claim Date | BPJS | Berapa lama siklus klaim BPJS? | Gunakan status klaim dan aging; jangan mengambil detail klinis pasien bila tidak perlu. |

# Operasional

| No | KPI Name | Formula | Source | Owner Question | Notes |
|---:|---|---|---|---|---|
| 46 | Total Visits | Jumlah kunjungan | KUNJUNGAN | Berapa pasien datang periode ini? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 47 | New Patient Visits | Jumlah kunjungan pasien baru | KUNJUNGAN | Berapa pasien baru saya? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 48 | Returning Patient Visits | Jumlah kunjungan pasien lama | KUNJUNGAN | Berapa pasien kembali? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 49 | Repeat Visit Rate | Returning Patient Visits / Total Visits x 100% | KUNJUNGAN | Apakah pasien kembali lagi? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 50 | Daily Average Visits | Total Visits / Jumlah Hari Operasional | KUNJUNGAN | Rata-rata pasien per hari berapa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 51 | Peak Visit Day | Hari dengan kunjungan tertinggi | KUNJUNGAN | Hari apa klinik paling ramai? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 52 | Peak Visit Hour | Jam dengan kunjungan tertinggi | KUNJUNGAN | Jam berapa klinik paling ramai? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 53 | Visit Growth | (Visits Periode Ini - Visits Periode Sebelumnya) / Visits Sebelumnya x 100% | KUNJUNGAN | Apakah jumlah pasien naik? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 54 | Cancellation Rate | Cancelled Visits / Total Visits x 100% | KUNJUNGAN | Berapa banyak kunjungan batal? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 55 | No Show Rate | No Show Count / Scheduled Visit Count x 100% | KUNJUNGAN | Berapa pasien tidak datang? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 56 | Average Waiting Time | Rata-rata waktu mulai layanan - waktu registrasi | KUNJUNGAN | Pasien menunggu berapa lama? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 57 | Average Service Time | Rata-rata waktu selesai layanan - waktu mulai layanan | KUNJUNGAN | Layanan selesai berapa lama? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 58 | Patient Throughput | Total Visits / Jam Operasional | KUNJUNGAN | Kapasitas layanan per jam berapa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 59 | Operational Utilization | Jam layanan terpakai / Jam operasional tersedia x 100% | KUNJUNGAN | Utilisasi operasional klinik berapa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 60 | Revenue per Operating Day | Revenue / Jumlah Hari Operasional | PENDAPATAN | Omzet rata-rata per hari berapa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 61 | Visit to Transaction Conversion | Jumlah transaksi / Total Visits x 100% | KUNJUNGAN + PENDAPATAN | Berapa kunjungan menjadi transaksi? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 62 | Patient Type Mix | Distribusi kunjungan per patient_type | KUNJUNGAN | Komposisi pasien umum/BPJS/asuransi bagaimana? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 63 | Branch Visit Share | Visits per Clinic / Total Visits x 100% | KUNJUNGAN | Cabang mana paling ramai? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 64 | Branch Revenue Share | Revenue per Clinic / Total Revenue x 100% | PENDAPATAN | Cabang mana kontribusi omzet terbesar? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 65 | Incomplete Data Rate | Rows with missing required fields / Total Rows x 100% | VALIDATION_LOG | Seberapa bersih data klinik saya? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |

# Dokter

| No | KPI Name | Formula | Source | Owner Question | Notes |
|---:|---|---|---|---|---|
| 66 | Doctor Revenue | Total revenue per dokter | PENDAPATAN + KUNJUNGAN | Dokter mana menghasilkan omzet terbesar? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 67 | Doctor Profit | Revenue dokter - cost terkait dokter | PENDAPATAN + BIAYA + KUNJUNGAN | Dokter mana paling menguntungkan? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 68 | Doctor Visit Count | Jumlah kunjungan per dokter | KUNJUNGAN | Dokter mana paling banyak melayani pasien? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 69 | Doctor Average Revenue per Visit | Doctor Revenue / Doctor Visit Count | PENDAPATAN + KUNJUNGAN | Rata-rata omzet per pasien tiap dokter berapa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 70 | Doctor Fee Amount | Total jasa dokter | BIAYA | Berapa total jasa dokter? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 71 | Doctor Fee Ratio | Doctor Fee / Doctor Revenue x 100% | BIAYA + PENDAPATAN | Apakah biaya jasa dokter proporsional? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 72 | Doctor Productivity per Hour | Doctor Visit Count / Jam Praktik | KUNJUNGAN | Produktivitas dokter per jam berapa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 73 | Doctor Revenue per Hour | Doctor Revenue / Jam Praktik | PENDAPATAN + KUNJUNGAN | Omzet dokter per jam berapa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 74 | Doctor Repeat Patient Rate | Returning visits per dokter / total visits per dokter x 100% | KUNJUNGAN | Dokter mana pasiennya paling loyal? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 75 | Doctor Cancellation Rate | Cancelled visits per dokter / scheduled visits per dokter x 100% | KUNJUNGAN | Dokter mana jadwalnya sering batal? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 76 | Doctor BPJS Share | BPJS visits per dokter / visits per dokter x 100% | KUNJUNGAN | Dokter mana paling banyak melayani BPJS? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 77 | Doctor Non-BPJS Revenue | Revenue non-BPJS per dokter | PENDAPATAN + KUNJUNGAN | Dokter mana kuat di pasien umum? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 78 | Doctor Service Mix | Distribusi layanan per dokter | KUNJUNGAN + PENDAPATAN | Layanan apa dominan pada tiap dokter? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 79 | Doctor Discount Ratio | Discount per dokter / Gross Revenue per dokter x 100% | PENDAPATAN | Dokter mana transaksinya banyak diskon? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 80 | Doctor Net Margin | Doctor Profit / Doctor Revenue x 100% | PENDAPATAN + BIAYA | Margin dokter mana paling baik? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |

# Poli

| No | KPI Name | Formula | Source | Owner Question | Notes |
|---:|---|---|---|---|---|
| 81 | Poli Revenue | Total revenue per poli | PENDAPATAN + KUNJUNGAN | Poli mana omzetnya terbesar? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 82 | Poli Profit | Revenue poli - cost terkait poli | PENDAPATAN + BIAYA + KUNJUNGAN | Poli mana paling menguntungkan? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 83 | Poli Visit Count | Jumlah kunjungan per poli | KUNJUNGAN | Poli mana paling ramai? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 84 | Poli Average Revenue per Visit | Poli Revenue / Poli Visit Count | PENDAPATAN + KUNJUNGAN | Rata-rata omzet per pasien per poli berapa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 85 | Poli Revenue Share | Poli Revenue / Total Revenue x 100% | PENDAPATAN | Kontribusi omzet tiap poli berapa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 86 | Poli Visit Share | Poli Visit Count / Total Visits x 100% | KUNJUNGAN | Kontribusi kunjungan tiap poli berapa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 87 | Poli Growth | (Poli Visits Periode Ini - Periode Sebelumnya) / Periode Sebelumnya x 100% | KUNJUNGAN | Poli mana yang tumbuh? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 88 | Poli Profit Margin | Poli Profit / Poli Revenue x 100% | PENDAPATAN + BIAYA | Margin poli mana paling bagus? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 89 | Poli BPJS Share | BPJS visits per poli / total visits per poli x 100% | KUNJUNGAN | Poli mana paling tergantung BPJS? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 90 | Poli Average Waiting Time | Rata-rata waiting time per poli | KUNJUNGAN | Poli mana paling lama antri? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 91 | Poli Utilization | Jam layanan poli terpakai / jam tersedia x 100% | KUNJUNGAN | Utilisasi poli berapa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 92 | Poli Service Mix | Distribusi jenis layanan per poli | PENDAPATAN + KUNJUNGAN | Layanan utama tiap poli apa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 93 | Poli Cost Ratio | Cost per poli / Revenue per poli x 100% | BIAYA + PENDAPATAN | Poli mana biayanya paling berat? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 94 | Poli Cancellation Rate | Cancelled visits per poli / scheduled visits per poli x 100% | KUNJUNGAN | Poli mana sering batal? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 95 | Poli Revenue per Doctor | Poli Revenue / Jumlah dokter aktif di poli | PENDAPATAN + KUNJUNGAN | Omzet per dokter di poli berapa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |

# Farmasi

| No | KPI Name | Formula | Source | Owner Question | Notes |
|---:|---|---|---|---|---|
| 96 | Pharmacy Revenue | Total pendapatan obat/resep | RESEP + PENDAPATAN | Berapa omzet farmasi saya? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 97 | Pharmacy Revenue Share | Pharmacy Revenue / Total Revenue x 100% | RESEP + PENDAPATAN | Seberapa besar kontribusi farmasi? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 98 | Pharmacy Gross Profit | Pharmacy Revenue - Pharmacy COGS | RESEP + PERSEDIAAN | Berapa laba kotor farmasi? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 99 | Pharmacy Gross Margin | Pharmacy Gross Profit / Pharmacy Revenue x 100% | RESEP + PERSEDIAAN | Margin farmasi berapa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 100 | COGS Pharmacy | Total HPP obat terjual | PERSEDIAAN + RESEP | Berapa HPP farmasi? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 101 | Inventory Value | SUM(closing_stock x purchase_price) | PERSEDIAAN | Berapa nilai stok obat saya? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 102 | Stock Turnover | COGS / Average Inventory Value | PERSEDIAAN + RESEP | Seberapa cepat stok berputar? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 103 | Days Inventory Outstanding | Average Inventory Value / COGS x Jumlah Hari | PERSEDIAAN + RESEP | Stok cukup untuk berapa hari? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 104 | Expired Stock Value | SUM(stock_value where expiry_date < today) | PERSEDIAAN | Berapa nilai stok expired? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 105 | Near Expired Stock Value | SUM(stock_value where expiry_date within threshold) | PERSEDIAAN | Berapa stok hampir expired? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 106 | Expired Stock Ratio | Expired Stock Value / Inventory Value x 100% | PERSEDIAAN | Berapa persen stok sudah expired? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 107 | Near Expired Stock Ratio | Near Expired Stock Value / Inventory Value x 100% | PERSEDIAAN | Berapa persen stok hampir expired? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 108 | Stockout Item Count | Jumlah item closing_stock <= 0 | PERSEDIAAN | Obat apa yang kosong? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 109 | Low Stock Item Count | Jumlah item di bawah minimum stock | PERSEDIAAN | Obat apa yang hampir habis? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 110 | Dead Stock Value | Nilai item tanpa mutasi penjualan dalam periode tertentu | PERSEDIAAN + RESEP | Berapa stok mati saya? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 111 | Top Selling Medicines | Ranking item berdasarkan quantity sold | RESEP | Obat apa paling laku? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 112 | Top Margin Medicines | Ranking item berdasarkan gross margin | RESEP + PERSEDIAAN | Obat apa paling menguntungkan? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 113 | Prescription Count | Jumlah resep | RESEP | Berapa resep dilayani? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 114 | Average Prescription Value | Pharmacy Revenue / Prescription Count | RESEP + PENDAPATAN | Rata-rata nilai resep berapa? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |
| 115 | Medicine Discount Ratio | Medicine Discount / Gross Medicine Revenue x 100% | RESEP + PENDAPATAN | Diskon obat terlalu besar tidak? | Gunakan periode, tenant_id, dan clinic_id yang sama saat menghitung KPI. |

# Pajak

| No | KPI Name | Formula | Source | Owner Question | Notes |
|---:|---|---|---|---|---|
| 116 | Taxable Revenue | Total revenue yang menjadi objek pajak | PENDAPATAN + PAJAK | Berapa omzet kena pajak? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |
| 117 | Non Taxable Revenue | Total revenue non objek pajak | PENDAPATAN + PAJAK | Berapa omzet non-pajak? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |
| 118 | VAT Output Estimate | Taxable Revenue x Tarif PPN jika PKP | PENDAPATAN + PAJAK | Berapa estimasi PPN keluaran? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |
| 119 | VAT Input Estimate | Pembelian kena PPN x Tarif PPN | BIAYA + PERSEDIAAN + PAJAK | Berapa estimasi PPN masukan? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |
| 120 | VAT Payable Estimate | VAT Output - VAT Input | PENDAPATAN + BIAYA + PAJAK | Estimasi PPN kurang bayar berapa? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |
| 121 | Withholding Tax Amount | Total pajak dipotong/dipungut | PAJAK + BIAYA | Berapa pajak potong/pungut? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |
| 122 | Doctor Withholding Tax | PPh jasa dokter | BIAYA + PAJAK | Berapa pajak jasa dokter? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |
| 123 | Corporate Income Tax Estimate | Taxable Profit x Tarif PPh Badan/Final relevan | PENDAPATAN + BIAYA + PAJAK | Berapa estimasi PPh badan/final? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |
| 124 | Tax Expense Ratio | Tax Expense / Revenue x 100% | PAJAK + PENDAPATAN | Berapa beban pajak terhadap omzet? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |
| 125 | Effective Tax Rate | Tax Expense / Profit Before Tax x 100% | PAJAK + PENDAPATAN + BIAYA | Tarif pajak efektif saya berapa? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |
| 126 | Tax Payable | Total pajak terutang belum dibayar | PAJAK | Berapa pajak belum dibayar? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |
| 127 | Tax Paid | Total pajak sudah dibayar | PAJAK | Berapa pajak sudah dibayar? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |
| 128 | Tax Filing Completeness | Dokumen pajak lengkap / dokumen wajib x 100% | PAJAK | Apakah dokumen pajak lengkap? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |
| 129 | Tax Risk Flag Count | Jumlah anomali pajak | PAJAK + VALIDATION_LOG | Ada risiko pajak apa saja? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |
| 130 | Revenue Tax Reconciliation Gap | Revenue menurut dashboard - revenue menurut laporan pajak | PENDAPATAN + PAJAK | Apakah omzet dashboard sama dengan laporan pajak? | Estimasi pajak bukan nasihat pajak final; perlu validasi konsultan/petugas pajak. |

---

# KPI Wajib Awal

## Revenue

Formula:

```text
Total Pendapatan
```

Source:

```text
TINDAKAN + RESEP
```

Owner Question:

```text
Berapa omzet saya?
```

## Profit

Formula:

```text
Revenue - Cost
```

Source:

```text
PENDAPATAN + BIAYA
```

Owner Question:

```text
Berapa laba saya?
```

---

# Hubungan ke Universal Data Mapping

| KPI Group | Sheet Universal Utama |
|---|---|
| Finance | PENDAPATAN, BIAYA |
| BPJS | BPJS |
| Operasional | KUNJUNGAN |
| Dokter | KUNJUNGAN, PENDAPATAN, BIAYA |
| Poli | KUNJUNGAN, PENDAPATAN, BIAYA |
| Farmasi | PERSEDIAAN, PENDAPATAN, RESEP |
| Pajak | PENDAPATAN, BIAYA, PAJAK |

---

# Catatan Implementasi

1. `Revenue` adalah KPI paling dasar dan harus tersedia sejak MVP.
2. `Profit` hanya boleh final jika data cost sudah tersedia dan tervalidasi.
3. Jika data biaya belum lengkap, tampilkan profit sebagai `estimated` atau `incomplete`.
4. KPI BPJS harus memisahkan klaim diajukan, disetujui, dibayar, dan outstanding.
5. KPI Farmasi harus memisahkan revenue, HPP, stok, expired, dan dead stock.
6. KPI Pajak bersifat estimasi awal dan tidak menggantikan proses akuntansi/pajak resmi.

---

# Kesimpulan

Dokumen ini mendefinisikan 130 KPI untuk AI Clinic Owner Copilot.

KPI ini menjadi fondasi dashboard owner, alert Telegram/WhatsApp, laporan periodik, dan AI insight.
