# 19. Growth AI MVP

## Positioning

Growth AI adalah lapisan pendamping di atas SIM Klinik yang sudah berjalan. Modul ini tidak mengganti SIM, tidak membuat alur kasir/rekam medis baru, dan tidak meminta staf menginput ulang data operasional.

Nilai jual untuk owner:

- Mengubah data SIM/export menjadi daftar pasien anonim yang perlu difollow-up.
- Mengurangi no-show dan pasien hilang dengan reminder/campaign yang terarah.
- Memberi owner briefing harian tentang tindakan bisnis yang paling cepat berdampak.

## MVP Scope

MVP membaca data dari warehouse yang sudah ada:

- `PASIEN_REF`
- `KUNJUNGAN`
- `PENDAPATAN`
- `KPI_BULANAN`

Output MVP:

- Segmentasi pasien anonim: aktif, baru, dormant, high-value, perlu follow-up, piutang/BPJS.
- Draft campaign WhatsApp berbasis segmen, bukan rekam medis.
- Owner briefing: tiga prioritas tindakan hari ini.
- Confidence dan guardrail data, agar owner tahu apakah insight sudah cukup kuat.

## Guardrails

- Tidak menyimpan nama pasien, NIK, nomor HP, alamat, diagnosis, atau catatan klinis.
- Semua pasien ditampilkan sebagai `patient_ref` anonim.
- Semua query wajib scoped by `tenant_id` dan `clinic_id`.
- Modul ini hanya memberi rekomendasi campaign/follow-up; pengiriman WhatsApp perlu integrasi channel terpisah dan approval manusia.
- Jika data pasien/kunjungan kurang lengkap, insight ditandai `low confidence`.

## MVP Acceptance Criteria

- Owner bisa membuka menu Growth AI dari dashboard.
- Owner melihat jumlah pasien dormant, high-value, perlu follow-up, pasien baru, dan piutang.
- Owner mendapat minimal 3 rekomendasi campaign jika data tersedia.
- Tidak ada data klinis sensitif yang muncul di payload/UI.
- Modul tetap berfungsi walau hanya ada data `KUNJUNGAN` dan `PENDAPATAN`.

## Next Step

- Tambahkan import mapping khusus export pasien/booking dari SIM Klinik.
- Tambahkan approval queue sebelum campaign dikirim via WhatsApp.
- Tambahkan campaign result tracking: sent, replied, booked, converted.
- Hubungkan ke Telegram/WhatsApp sebagai channel briefing owner.
