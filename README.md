# Idola One Web

Aplikasi web operasional dan kasir multi-usaha untuk Idola Laundry. Menggantikan aplikasi Android Flutter dan dashboard owner dari repo `LaundryApp`, dengan backend di server sendiri.

Status: **Fase 0 (fondasi)**. Yang sudah ada baru kerangka proyek, tema, halaman login, dan dashboard owner dengan **data contoh**. Belum terhubung ke server atau data nyata.

## Menjalankan secara lokal

Butuh Node.js (diuji dengan v24).

```bash
npm install
npm run dev
```

Perintah lain: `npm run lint`, `npm test`, `npm run build`.

Login pada mode pratinjau menerima isian apa pun. Semua angka di dashboard adalah data contoh (`src/data/mock.ts`).

## Dokumen

1. [Product Requirements Document](docs/01-PRD.md): tujuan, stack, kebutuhan, aturan bisnis, fase rilis
2. [Application Flow](docs/02-APPFLOW.md): diagram alur, perbedaan dengan Android, peta halaman per peran
3. [Implementation Plan](docs/03-IMPLEMENTATION-PLAN.md): tugas per fase, gerbang, pengujian, peralihan
4. [Backend, Hosting, dan Repo](docs/04-BACKEND.md): keputusan backend, hosting bertahap, branch, printer
