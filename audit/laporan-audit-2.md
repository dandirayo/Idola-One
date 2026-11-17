# Laporan Audit Visual 2 (setelah Tahap 2 dan 3)

**Tanggal:** 17 November 2026
**Foto:** `audit/screenshots/2026-11-17-audit2/` (bandingkan dengan `2026-11-17-audit1/`)
**Alat:** `node scripts/audit-shots.mjs <folder>` (foto) dan `node scripts/audit-measure.mjs` (ukur kontrol).

## Hasil otomatis

| Pemeriksaan | Audit 1 | Audit 2 |
|---|---|---|
| Gulir horizontal (87 foto) | 0 | 0 |
| Kontrol diukur (tombol, field, 29 halaman, 1280 dan 375 px) | belum diukur | 587 |
| Tinggi kontrol di luar skala 36/40/44/48 px | belum diukur | 7 jenis, semuanya area klik besar yang memang bukan tombol standar (batang grafik, kartu produk kasir, baris notifikasi, baris proyek) dan 3 textarea |

Tiga textarea (catatan pesanan, detail pengajuan, teks laporan pembayaran) masih bergaya lama (sudut 12 px). Sudah dipindah ke `field field-area` (sudut 14 px) setelah audit ini.

## Status temuan audit 1

| # | Temuan | Status |
|---|---|---|
| 1 | Goresan merah tepi kiri tombol hapus | Selesai |
| 2 | Beranda desktop terlalu sempit, teks terpotong | Selesai |
| 3 | KPI ponsel satu per baris | Selesai (2 kolom) |
| 4 | Tooltip grafik tidak sejajar | Selesai |
| 5 | Ikon percikan dan emoji | Selesai (peta ikon `src/lib/icons.ts`) |
| 6 | Kartu Cetak di detail pesanan | Selesai, dan Tagihan naik ke atas di ponsel |
| 7 | Input jam 12 jam | Selesai (`TimeField` 24 jam) |
| 8 | Menu samping | Selesai (`nav-link`, `scroll-thin`) |
| 9 | Bilah mode pratinjau | Selesai |
| 10 | Chip centang dan pil "Mingguan" | Selesai |

## Temuan baru (kecil, belum dikerjakan)

| # | Berat | Lokasi | Temuan |
|---|---|---|---|
| A | Rendah | Buku Kas ponsel | Kartu Masuk dan Keluar bertumpuk, bisa berdampingan dua kolom |
| B | Rendah | Tim, Pelanggan, Layanan | Kotak centang "Tampilkan yang nonaktif" masih bawaan browser, bisa memakai `chip-check` |
| C | Rendah | Menu samping layar pendek | Item terakhir terpotong di tepi, sebenarnya bisa digulir; tambahkan bayangan pemudar di tepi bawah |
| D | Info | Semua halaman | Belum ada tombol Hapus; dikerjakan di Tahap 5 |
