# Idola One Web

Aplikasi web operasional dan kasir multi-usaha untuk Idola Laundry. Menggantikan aplikasi Android Flutter dan dashboard owner dari repo `LaundryApp`, dengan backend di server sendiri.

## Status

**Fase 2 (operasional) baru dimulai, hanya sisi tampilan.** Belum ada backend, login sungguhan, atau data nyata. Semua halaman berjalan dengan **data contoh di memori** yang hilang saat halaman dimuat ulang (`src/data/store.ts`).

Halaman yang sudah ada: Beranda, Pesanan (daftar, buat baru, detail dengan status, pembayaran, koreksi pembayaran, WhatsApp, dan cetak nota/label/bukti pengambilan), Pelanggan, Layanan & Harga, Stok, Buku Kas, Laporan (pesanan, keuangan, pembayaran) dengan ekspor CSV, Pusat Pengajuan, Tim, dan Pengaturan toko.

Yang belum terbukti: cetak ke printer fisik, unduhan CSV di browser, dan hasil CI di GitHub. Rincian status tiap tugas ada di [Implementation Plan](docs/03-IMPLEMENTATION-PLAN.md).

## Menjalankan secara lokal

Butuh Node.js (diuji dengan v24).

```bash
npm install
npm run dev
```

Perintah lain: `npm run lint`, `npm test`, `npm run build`.

Login pada mode pratinjau menerima isian apa pun. Jangan dipakai di produksi.

## Dokumen

1. [Product Requirements Document](docs/01-PRD.md): tujuan, stack, kebutuhan, aturan bisnis, fase rilis
2. [Application Flow](docs/02-APPFLOW.md): diagram alur, perbedaan dengan Android, peta halaman per peran
3. [Implementation Plan](docs/03-IMPLEMENTATION-PLAN.md): tugas per fase dengan status, gerbang, pengujian, catatan keputusan
4. [Backend, Hosting, dan Repo](docs/04-BACKEND.md): keputusan backend, hosting bertahap, branch, printer
