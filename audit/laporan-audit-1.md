# Laporan Audit Visual 1

**Tanggal:** 17 November 2026
**Foto:** `audit/screenshots/2026-11-17-audit1/{desktop,tablet,mobile}/` (tidak ikut Git; dibuat dengan `node scripts/audit-shots.mjs <folder>`)
**Cakupan:** 29 halaman x 3 ukuran (1280, 768, 375 px) = 87 foto.

## Hasil otomatis

| Pemeriksaan | Hasil |
|---|---|
| Gulir horizontal | Tidak ada di 87 foto |
| Halaman tanpa judul (h1) | Tidak ada |

Kesimpulan: tata letak sudah responsif. Temuan di bawah adalah soal proporsi, penekanan, dan konsistensi.

## Temuan

| # | Berat | Lokasi | Temuan | Perbaikan (tahap) |
|---|---|---|---|---|
| 1 | Sedang | Semua `btn-danger` | Goresan merah di tepi kiri (gradien berulang) | `background-repeat: no-repeat` pada `.btn`, `.icon-btn`, `.seg-item` (T2) |
| 2 | Tinggi | Beranda desktop | Kolom kanan 336 px menyempitkan kolom utama; label "Pemasukan bulan..." terpotong, chip "Belum Bayar" menabrak tepi kartu, judul "Aktivitas Pesanan" pecah dua baris | Kolom kanan hanya di layar >= 1536 px; di bawahnya jadi baris 2 kolom (T2) |
| 3 | Sedang | Beranda mobile | 6 KPI bertumpuk satu per baris, halaman sangat panjang | Grid 2 kolom di mobile (T2) |
| 4 | Rendah | BarChart | Tooltip tidak sejajar batang | Pusatkan di atas batang (T2) |
| 5 | Sedang | Beranda, Pengajuan, Pesanan campuran | Ikon Sparkles dan emoji tidak bermakna, terkesan generik | Ikon bermakna dari peta `src/lib/icons.ts` (T3) |
| 6 | Sedang | Detail pesanan | Kartu Cetak di kolom kanan memanjangkan halaman | Pindah ke kolom kiri (T2) |
| 7 | Rendah | Jadwal shift | Input jam tampil 12 jam | Pilihan jam 24 jam (T2) |
| 8 | Rendah | Menu samping | Scrollbar bawaan tampil; kelas `nav-link` belum dipakai | Pakai `nav-link`, `is-active`, `scroll-thin` (T2) |
| 9 | Tinggi | Seluruh aplikasi | Keterangan "Data contoh" dihapus dari halaman, tetapi bilah pratinjau global belum ada | Bilah "Mode pratinjau" di shell (T2) |
| 10 | Rendah | Kelola Usaha, Beranda | Chip centang pakai kelas lama; pil "Mingguan" tampak seperti tombol tapi tidak berfungsi | Samakan ke `seg`/chip, atau jadikan label biasa (T2) |

## Rencana pembanding

Audit 2 (T4) memakai nama folder baru `2026-11-17-audit2`, lalu bandingkan per halaman dan ukur tinggi tombol (hanya 36, 44, 48 px).
