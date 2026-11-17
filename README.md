# Idola One Web

Aplikasi web operasional dan kasir multi-usaha untuk Idola Laundry. Menggantikan aplikasi Android Flutter dan dashboard owner dari repo `LaundryApp`, dengan backend di server sendiri.

## Status

**Fase 2 (operasional) dan sebagian Fase 3, hanya sisi tampilan.** Belum ada backend, login sungguhan, atau data nyata. Semua halaman berjalan dengan **data contoh di memori** yang hilang saat halaman dimuat ulang (`src/data/store.ts` dan modul di `src/data/`).

Yang sudah ada, menurut peran dan usaha yang dipilih:

- **Owner (laundry):** Beranda, Pesanan (buat, detail, status, pembayaran, koreksi dan pembatalan pembayaran, hapus pesanan, ubah layanan kiloan, WhatsApp, cetak nota/label/bukti), Pelanggan (dengan poin), Layanan & Harga, Stok, Proyek B2B, Pengajuan, Tim, Jadwal Shift, Absensi, Buku Kas (dengan kas manual), Gaji & Insentif, Laporan (dengan ekspor CSV), Audit, Kelola Usaha, Pengaturan, dan Notifikasi.
- **Karyawan laundry:** Beranda karyawan, Pesanan, Pelanggan, Layanan (lihat saja), Stok (pakai), Absensi selfie, Jadwal Saya, Pengajuan Saya (termasuk Lupa Absen), dan Laporan Pembayaran.
- **Usaha minuman (POS):** Ringkasan dan hari berjualan, Kasir, dan Produk.

Yang belum terbukti: kamera sungguhan, cetak ke printer fisik, unduhan CSV, dan hasil CI di GitHub. Owner juga bisa menghapus atau membatalkan data (dengan konfirmasi, alasan wajib untuk uang, kas dibalik, dan jejak Audit); yang dihapus masuk **Sampah** dan bisa dipulihkan. Daftar utama punya empat mode tampilan (Normal, Tabel, List kecil, Grid detail). Data pratinjau tersimpan di `localStorage` browser (bukan database bersama) dan bisa direset di Pengaturan. Rincian status tiap tugas ada di [Implementation Plan](docs/03-IMPLEMENTATION-PLAN.md).

## Menjalankan secara lokal

Butuh Node.js (diuji dengan v24).

```bash
npm install
npm run dev
```

Perintah lain: `npm run lint`, `npm test`, `npm run build`.

Audit visual (butuh `npm run dev` berjalan): `node scripts/audit-shots.mjs <nama-folder>` memotret semua halaman di tiga ukuran, dan `node scripts/audit-measure.mjs` mengukur tinggi tombol dan field. Foto tidak ikut Git (`audit/screenshots/`), laporan ada di `audit/`.

Masuk pada mode pratinjau dengan memilih orang (Owner atau karyawan), tanpa password. Jangan dipakai di produksi.

## Dokumen

1. [Product Requirements Document](docs/01-PRD.md): tujuan, stack, kebutuhan, aturan bisnis, fase rilis
2. [Application Flow](docs/02-APPFLOW.md): diagram alur, perbedaan dengan Android, peta halaman per peran
3. [Implementation Plan](docs/03-IMPLEMENTATION-PLAN.md): tugas per fase dengan status, gerbang, pengujian, catatan keputusan
4. [Backend, Hosting, dan Repo](docs/04-BACKEND.md): keputusan backend, hosting bertahap, branch, printer
5. [Sistem Desain](docs/05-DESIGN-SYSTEM.md): warna, bentuk, tombol, ikon, komponen, responsif, audit visual
6. [Ubah dan Hapus oleh Owner](docs/06-ADMIN-CRUD.md): aturan, dialog konfirmasi, status pengerjaan
