# Sistem Desain Idola One

**Versi dokumen:** 0.2
**Tanggal:** 17 November 2026
**Sumber kebenaran:** `src/styles/components.css` (kelas), `src/components/ui.tsx` (komponen), dan token warna di `src/index.css` (`@theme`).

Tujuan dokumen ini: setiap halaman terlihat seperti satu produk, dan tidak ada gaya baru yang dibuat sembarangan. Bila perlu gaya baru, tambahkan dulu ke sistem ini.

## 1. Warna

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `sidebar` | `#1E1E2D` | Menu samping, tombol utama, kartu hero |
| `lime` | `#D9F36B` | Aksi utama yang menarik perhatian, menu aktif |
| `lime-soft` | `#EAF5C8` | Chip sukses dan latar lembut |
| `lilac` | `#E4E1F8` | Chip netral dan latar sekunder |
| `peach` | `#FBE3D6` | Peringatan ringan, belum bayar |
| `cream` | `#FBEBD3` | Menunggu, DP |
| `canvas` | `#F6F6F2` | Latar halaman |
| `surface` | `#FFFFFF` | Kartu |
| `ink` / `muted` | `#1B1B28` / `#8A8A96` | Teks utama dan sekunder |
| `success` / `warning` / `danger` | `#15803D` / `#D97706` / `#D92D20` | Angka masuk, peringatan, keluar atau hapus |

Aturan: satu halaman memakai paling banyak **satu** kartu hero gelap (angka terpenting) dan **satu** tombol aksen lime (aksi utama).

## 2. Skala bentuk

| Elemen | Sudut | Tinggi |
|---|---|---|
| Tombol, chip, segmen | bulat penuh | tombol 36 px (`btn-sm`), 44 px (`btn`), 48 px (`btn-lg`) |
| Field (input, select) | 14 px | 44 px (`field`), 36 px (`field-sm`) |
| Panel di dalam kartu | 16 px | — |
| Kartu | 20 px | — |
| Kotak ikon | 12 px | 40 px |
| Tombol ikon | bulat | 36 px (`icon-btn-sm`), 40 px (`icon-btn`) |

Dilarang: tinggi tombol selain 36, 44, atau 48 px, dan sudut di luar skala di atas.

## 3. Tombol

| Kelas | Kegunaan |
|---|---|
| `btn btn-primary` | Aksi utama yang aman (Simpan, Catat, Masuk) |
| `btn btn-accent` | Aksi yang ingin ditonjolkan (Pesanan Baru, Tambah) |
| `btn btn-secondary` | Aksi pendamping (Batal, Lunasi) |
| `btn btn-outline` | Aksi ringan di atas kartu |
| `btn btn-danger` | Hapus, batalkan |
| `btn btn-ghost` | Aksi paling tenang |
| `icon-btn` (+ `-sm`, `-outline`, `-accent`, `-ghost`, `-danger`) | Aksi hanya dengan ikon, wajib `aria-label` |
| `seg` + `seg-item` | Pilihan periode, filter status, dan tab. Gunakan `aria-pressed` atau `aria-selected` |

**Hover gradient:** warna bergeser halus lewat `background-position`, bukan berpindah mendadak. Efek ini hanya aktif di perangkat dengan penunjuk (`@media (hover: hover)`), dan di layar sentuh digantikan efek tekan. Sentuhan terakhir pada tiap tombol: bayangan lembut berwarna sesuai gaya tombol.

## 4. Ikon

- Satu set: Lucide. Ukuran 16 px di tombol, 18 px di menu, 20 px di kotak ikon.
- Satu konsep, satu ikon, di seluruh aplikasi. Daftar ada di `src/lib/icons.ts` (`concept` dan `routeIcons`). Contoh: Buku Kas dan pemasukan memakai dompet, tagihan memakai struk, gaji memakai tangan dan koin, pesanan campuran memakai tumpukan.
- Ikon aksi umum diimpor langsung dari Lucide dengan pasangan tetap: `Plus` (tambah), `Pencil` (ubah), `Trash2` (hapus), `Search`, `X`.
- Logo: `src/components/LogoMark.tsx` (drum mesin cuci dengan huruf I) dan `public/favicon.svg`. Varian `lime` untuk latar gelap, `dark` untuk latar terang.
- Dilarang: ikon dekoratif tanpa makna (misalnya bintang atau percikan) dan emoji di teks antarmuka.

## 5. Komponen

| Komponen | Fungsi |
|---|---|
| `Card` (`variant="dark"` untuk hero) | Kartu dasar |
| `StatCard` (`variant="hero"`) | Angka ringkasan, hero untuk angka terpenting |
| `PageHeader` | Judul, keterangan, dan aksi yang turun rapi di layar sempit |
| `Hint` | Keterangan kecil dengan ikon info (pengganti banner warna) |
| `EmptyState` | Keadaan kosong |
| `IconChip`, `StatusChip` | Kotak ikon 40 px dan chip status 24 px |
| `TimeField` | Pilihan jam 24 jam (jam dan menit per 5), pengganti `input type=time` yang mengikuti locale perangkat |
| `ConfirmDialog`, `DeleteButton` | Dialog konfirmasi hapus atau batal dan tombol ikon Hapus (lihat [06-ADMIN-CRUD.md](06-ADMIN-CRUD.md)) |
| `LogoMark` | Logo |
| `DataList`, `ViewSwitch` | Daftar dengan empat mode tampilan (lihat bagian 6a) |
| `.chip-check` (kelas) | Kotak centang berbentuk chip, untuk pilihan ganda seperti akses karyawan |
| Bilah mode pratinjau | Satu bilah di atas konten (`AppShell`) menggantikan keterangan "data contoh" di tiap halaman. Hilang saat backend tersambung. |

## 6. Responsif

| Lebar | Perilaku |
|---|---|
| < 1024 px | Menu samping menjadi laci, kolom menjadi satu |
| 1024–1535 px | Menu tetap, konten satu atau dua kolom |
| ≥ 1536 px | Kolom samping kanan pada Beranda. Di bawahnya, kalender dan pengajuan turun menjadi dua kolom di bawah konten utama |

**Kerangka halaman (`src/app/AppShell.tsx`).** Top bar selebar kontainer (maks. 1600 px, terpusat) dengan jarak kiri dan kanan tetap (`px-3` di HP, `sm:px-5` dari 640 px): logo dan nama usaha di kiri, cari, lonceng, profil, dan keluar di kanan. Di bawahnya satu baris berisi sidebar dan isi halaman, sehingga **sidebar mulai di garis yang sama dengan judul halaman** di semua halaman. Tinggi top bar dari variabel `--topbar-h` (4,25 rem di bawah 1024 px, 4,5 rem di atasnya) di `src/index.css`. Di desktop top bar dan sidebar menempel (`sticky`), tinggi sidebar `100vh - --topbar-h - --shell-gap`. Di HP top bar ikut gulir dan logo tampil di sana, sedangkan laci "Lainnya" tetap memuat logo. Keterangan pratinjau: satu baris di atas top bar di bawah 1024 px, kapsul ringkas di dalam top bar dari 1024 px.

**Skala sentuh (< 1024 px)** diatur di blok `@media (max-width: 1023px)` di akhir `src/styles/components.css` (di luar `@layer` agar menang atas utilitas Tailwind): tombol 48 px (`btn-sm` 44, `btn-lg` 56), tombol ikon 44 px, field dan segmen 44 sampai 48 px, teks isi 16 px, `text-xs` menjadi 14 px, warna `muted` lebih gelap (kontras lebih tinggi), chip 28 px. Desktop tetap memakai skala bagian 2.

**Bilah bawah** (`src/components/BottomNav.tsx`, `bottomNavFor` di `src/lib/access.ts`) menggantikan tombol menu di header pada layar < 1024 px: karyawan (Beranda, Absensi, Pesanan, Pengajuan), owner (Beranda, Pesanan, Buku Kas, Pengajuan), POS (Ringkasan, Kasir, Produk), ditambah "Lainnya" yang membuka menu lengkap. Aksi utama halaman (Simpan Pesanan, Bayar di Kasir) menempel di atas bilah itu. Dialog tampil sebagai lembar dari bawah. Bilah mode pratinjau ringkas dan bisa ditutup.

Layar karyawan memakai ukuran lebih besar lagi: hero jadwal dan absensi dengan tombol lebar penuh 56 px, jam 30 px, dan kartu aksi cepat 128 px.

Kartu ringkasan (KPI) memakai dua kolom di ponsel. Pada detail pesanan, kartu Tagihan dan Status naik ke atas di ponsel karena itu aksi terpenting.

Setiap halaman wajib bebas dari gulir horizontal pada 375, 768, dan 1280 px.

## 6a. Mode tampilan daftar

Daftar utama memakai `src/components/DataList.tsx`. Pemilih tampilan (`ViewSwitch`, kelas `seg` dengan ikon) menawarkan empat mode, dan pilihan diingat per daftar di `localStorage` (`idola-one:view:<id>`).

| Mode | Isi |
|---|---|
| Normal | Baris kartu seperti sebelumnya (bawaan) |
| Tabel | Judul kolom, klik judul untuk mengurutkan (`aria-sort`), kolom `hideBelow` disembunyikan di layar sempit, tabel digulir di dalam kartu, kolom aksi menempel di kanan mulai tablet |
| List kecil | Satu baris padat (min. 44 px): kolom utama, dua kolom bertanda `compact`, dan aksi |
| Grid detail | Kartu 1, 2, 3 kolom (ponsel, tablet, desktop) berisi pasangan label dan nilai, aksi di bawah |

Definisi kolom (`Column`: `key`, `label`, `render`, `sort`, `align`, `primary`, `compact`, `hideBelow`) hidup di tiap halaman. Sudah diterapkan di Pesanan, Pelanggan, Layanan, Stok, Tim, Produk POS, Buku Kas (transaksi), Audit, dan Sampah. Proyek, Pengajuan, Gaji dan Insentif, Absensi, Kelola Usaha, dan Notifikasi masih Normal karena barisnya bisa dibuka atau berisi bagian bersarang.

Foto audit mode tertentu: `VIEW=table node scripts/audit-shots.mjs <folder>` (juga `compact`, `grid`).

## 7. Audit visual

- Foto: `node scripts/audit-shots.mjs <nama-folder> [ukuran,ukuran] [awalan-halaman]` memotret 29 halaman di desktop (1280), tablet (768), dan ponsel (375) memakai Edge tanpa tampilan lewat protokol DevTools, tinggi penuh halaman, dan menulis `report.json` (termasuk deteksi gulir horizontal). Butuh `npm run dev` berjalan.
- Ukur: `node scripts/audit-measure.mjs` mengukur tinggi semua tombol dan field dan melaporkan yang di luar skala (desktop 36, 40, 44, 48 px; HP 40, 44, 48, 56 px).
- Laporan: `audit/laporan-audit-1.md` (sebelum) dan `audit/laporan-audit-2.md` (sesudah).
- Hasil disimpan di `audit/screenshots/<nama-folder>/<ukuran>/` (tidak ikut Git). Audit berikutnya memakai nama folder baru untuk dibandingkan dengan yang lama.
- Masuk otomatis untuk audit: tambahkan `?as=owner|em1|em2|em3&biz=b1|b2` pada alamat. Hanya aktif di mode pengembangan, tidak ada di build produksi.
