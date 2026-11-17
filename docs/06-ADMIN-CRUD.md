# Rencana Ubah dan Hapus untuk Admin (Owner)

**Versi dokumen:** 0.3 (sebagian besar sudah dikerjakan, lihat bagian 9 dan 10)
**Tanggal:** 17 November 2026
**Keputusan owner:** owner berperan sebagai admin dan boleh mengubah serta menghapus apa pun, termasuk pesanan. Setiap pembatalan atau penghapusan **data uang** wajib disertai alasan.

## 1. Prinsip

1. **Admin leluasa, tetapi tidak diam-diam.** Semua ubah dan hapus butuh konfirmasi, dan yang menyentuh uang butuh alasan tertulis.
2. **Uang selalu seimbang.** Menghapus atau mengubah data yang punya kas harus membalik atau menyesuaikan kas dalam langkah yang sama. Tidak boleh ada kas yatim atau saldo yang melenceng.
3. **Semua tercatat di Audit.** Isinya pelaku, waktu, alasan, dan keadaan sebelum serta sesudah. Audit sendiri tidak bisa diubah atau dihapus.
4. **Hapus permanen hanya bila aman.** Bila data sudah dipakai data lain (riwayat), tombol hapus ditawarkan sebagai pilihan yang menjelaskan akibatnya, dengan alternatif Nonaktifkan.
5. **Satu pola tampilan.** Ikon Ubah dan Hapus di tiap baris, dialog konfirmasi yang seragam, tombol Hapus berwarna merah.

## 2. Pola dialog konfirmasi

Komponen baru `ConfirmDialog` dipakai semua tindakan hapus.

| Elemen | Aturan |
|---|---|
| Judul | "Hapus {jenis} {nama}?" |
| Dampak | Daftar singkat yang akan berubah, misalnya "Kas keluar Rp 30.000 dibalik" atau "3 pesanan akan kehilangan nama pelanggan" |
| Alasan | Kolom wajib untuk data uang, minimal 5 karakter. Opsional untuk data master |
| Tombol | Batal (sekunder) dan Hapus (merah, nonaktif sampai alasan terisi bila wajib) |
| Hasil | Pesan sukses atau galat yang jelas, dan satu entri di Audit |

Pembatas keamanan di logika (bukan hanya tampilan): fungsi hapus di store menolak bila syarat tidak terpenuhi, sehingga tombol yang dimanipulasi pun tidak lolos.

## 3. Tahap 5a: Data master

| Data | Tambah | Ubah | Hapus permanen jika | Jika tidak memenuhi |
|---|---|---|---|---|
| Pelanggan | ada | nama, nomor | belum punya pesanan atau proyek | Nonaktifkan (sudah ada) |
| Layanan | ada | nama, harga, jenis (tidak bila sudah dipakai) | belum pernah dipakai pesanan | Nonaktifkan |
| Karyawan | ada | nama, jabatan, gaji | tanpa absensi, gaji, insentif, pengajuan, atau keanggotaan usaha | Nonaktifkan |
| Barang stok | **baru** | nama, satuan, minimum | belum ada mutasi | **Arsipkan** (sembunyi dari daftar, riwayat tetap) |
| Produk POS | ada | nama, harga | selalu boleh (penjualan menyimpan salinan nama dan harga) | Nonaktifkan tersedia |
| Usaha | tambah minuman | nama | usaha minuman tanpa penjualan | Nonaktifkan |

Pekerjaan:
- Fungsi store: `deleteCustomer`, `deleteService`, `deleteEmployee`, `addInventoryItem`, `updateInventoryItem`, `deleteInventoryItem`, `archiveInventoryItem`, `deletePosProduct`, `updateBusiness`, `deleteBusiness`.
- Setiap fungsi punya pemeriksaan "dipakai oleh apa" yang mengembalikan daftar penyebab, supaya dialog bisa menjelaskan kenapa hapus ditolak.
- Antarmuka: ikon Ubah dan Hapus di Pelanggan, Layanan, Tim, Stok (halaman baru untuk kelola barang), Produk POS, Kelola Usaha.

## 4. Tahap 5b: Data uang

Keputusan: **owner boleh menghapus pesanan apa pun**, dengan akibat yang dijelaskan.

| Data | Ubah | Hapus atau batalkan | Akibat otomatis |
|---|---|---|---|
| Pesanan | pelanggan, catatan, layanan kiloan (sudah ada) | **Hapus permanen untuk semua status**, alasan wajib | Semua pembayaran pesanan dibatalkan dan kas masuknya dibalik. Hak insentif pesanan itu dihapus (bila sudah dibayar, kas keluarnya tetap dan diberi tanda "tanpa pesanan"). Poin pelanggan ikut hilang. Audit menyimpan salinan lengkap pesanan sebelum dihapus. |
| Pembayaran pesanan | koreksi (sudah ada) | Batalkan pembayaran, alasan wajib | Kas masuknya dibalik. Status bayar pesanan dihitung ulang. |
| Pengeluaran biasa | deskripsi, kategori, nominal, metode | Hapus, alasan wajib | Kas keluarnya dibalik. |
| Pengeluaran otomatis (Stok, Gaji, Insentif, Kasbon) | dari sumbernya | dari sumbernya | Tombol dinonaktifkan dengan keterangan "dibuat otomatis". |
| Kas manual | deskripsi, kategori, nominal, metode, arah | Hapus, alasan wajib | Saldo disesuaikan. |
| Gaji mingguan | nominal | Batalkan pembayaran, alasan wajib | Pengeluaran dan kas keluar dibalik. Minggu itu bisa dibayar ulang. |
| Insentif | — | Batalkan pembayaran, alasan wajib | Pengeluaran dan kas dibalik, status kembali "hak tercatat". |
| Pembayaran proyek | nominal, metode | Hapus, alasan wajib | Kas masuk dibalik. |

Aturan teknis yang harus dijaga:
- Membalik kas = menghapus baris kas terkait **dan** mencatat audit, bukan menambah baris minus. Saldo dihitung ulang dari kas yang tersisa.
- Hapus pesanan dilakukan dalam satu langkah atomik (pesanan, pembayaran, kas, insentif, poin).
- Uji properti: setelah deretan operasi acak (buat, bayar, koreksi, hapus), jumlah kas harus sama dengan jumlah semua pembayaran dikurangi pengeluaran yang masih ada.

## 5. Tahap 5c: Tim dan proyek

| Data | Ubah | Hapus | Catatan |
|---|---|---|---|
| Absensi | jam masuk dan pulang (alasan wajib) | Hapus (alasan wajib) | Keterlambatan dihitung ulang dari jadwal. |
| Jadwal shift | sudah ada | kosongkan (sudah ada) | — |
| Pengajuan | detail dan nominal bila masih Menunggu | Hapus bila Menunggu, Ditolak, atau Dilaksanakan | Pengajuan Dibayar tidak dihapus langsung. Batalkan pembayarannya dulu (alasan wajib). |
| Proyek | nama, target, catatan, tarif (tarif hanya bila belum ada batch atau pembayaran) | Hapus proyek, alasan wajib | Batch dan pembayaran proyek ikut terhapus, kas dibalik. |
| Batch proyek | pcs, kg, tanggal | Hapus | Tagihan dihitung ulang. Ditolak bila membuat tagihan lebih kecil dari yang sudah dibayar. |
| Notifikasi | — | Hapus (sudah ada) | — |
| Audit | tidak bisa | tidak bisa | Disengaja. |

## 6. Pengujian

- Tes otomatis untuk setiap aturan: hapus ditolak saat data dipakai, hapus berhasil saat aman, kas seimbang setelah hapus atau batal, alasan wajib ditegakkan, dan audit tercatat.
- Uji properti keseimbangan kas (lihat bagian 4).
- Verifikasi di browser untuk satu alur tiap kelompok, termasuk hapus pesanan berstatus Diambil yang sudah dibayar.

## 7. Urutan pengerjaan dan perkiraan besar

| Urutan | Isi | Besar |
|---|---|---|
| 1 | `ConfirmDialog` dan pola ikon Ubah/Hapus | kecil |
| 2 | 5a: data master (store, tes, antarmuka) | sedang |
| 3 | 5b: kas, pengeluaran, pembayaran, pesanan | besar, paling berisiko, diuji paling ketat |
| 4 | 5c: absensi, pengajuan, proyek | sedang |
| 5 | Dokumentasi dan verifikasi | kecil |

## 9. Status pengerjaan (17 November 2026)

Logika ada di `src/data/admin.ts` (diuji di `src/data/admin.test.ts`, termasuk uji acak 300 langkah untuk keseimbangan kas). Antarmuka memakai `src/components/ConfirmDialog.tsx` (`ConfirmDialog` dan `DeleteButton`) dan `src/components/CashRowActions.tsx`.

| Bagian | Status |
|---|---|
| Dialog konfirmasi seragam, alasan wajib minimal 5 karakter | Selesai |
| 5a: hapus pelanggan, layanan, karyawan, barang stok, produk POS, usaha (ditolak dengan penjelasan bila dipakai); tambah dan ubah barang stok | Selesai |
| 5a: arsip barang stok | Belum (barang bermutasi tidak bisa dihapus) |
| 5a: tombol ubah nama usaha | Logika ada (`updateBusiness`), tombol belum |
| 5b: hapus pesanan semua status, batal pembayaran, ubah dan hapus pengeluaran biasa dan kas manual, batal gaji, batal insentif, batal pembayaran kasbon, hapus pembayaran proyek | Selesai |
| 5b: ubah nominal gaji mingguan | Belum (batalkan lalu bayar ulang) |
| 5c: hapus absensi, hapus pengajuan (selain Dibayar), hapus batch dan proyek | Selesai |
| 5c: ubah jam absensi, ubah detail pengajuan dan proyek | Belum |
| Isi Audit "sebelum" pada hapus pesanan dan proyek | Masih teks JSON mentah, perlu dirapikan |

Perbaikan yang ditemukan lewat uji: ID pembayaran, pesanan, pelanggan, layanan, karyawan, dan pengeluaran dulu dibuat dari jam (dan jumlah data), sehingga bisa kembar. Kini semuanya memakai `uid()`.

## 10. Sampah (recycle bin)

Diputuskan pada 17 November 2026: semua yang dihapus atau dibatalkan masuk Sampah dan bisa dipulihkan. Ini menggantikan jawaban nomor 4 di bawah ("tanpa tombol urungkan").

- **Cara kerja:** `applyWithTrash` (`src/data/trash.ts`) membandingkan data sebelum dan sesudah tiap tindakan, lalu menyimpan baris yang hilang dan baris yang berubah sebagai satu item `State.trash`. Fungsi di `src/data/admin.ts` hanya mengganti `update` dengan `applyWithTrash`.
- **Pulihkan:** memasukkan kembali baris (kas dan insentif ikut kembali, jadi saldo seimbang) dan mengembalikan baris yang berubah. Ditolak bila ID sudah ada lagi, data sudah berubah sejak itu, atau induknya hilang (pesanan butuh pelanggan, insentif butuh pesanan, dan seterusnya).
- **Hapus permanen** dari halaman Sampah (`/trash`, khusus owner) dengan konfirmasi; tercatat di Audit.
- **Tidak masuk Sampah:** notifikasi dan Audit. Tidak ada penghapusan otomatis (urusan backend).
- **Tes:** `src/data/trash.test.ts`, termasuk uji acak 300 langkah (buat, bayar, batal, hapus, pulihkan) untuk keseimbangan kas.

## 8. Pertanyaan terbuka

Jawaban yang dipakai saat pengerjaan: (1) hapus pesanan Diambil dan lunas diperbolehkan; (2) insentif yang sudah dibayar tidak dibatalkan otomatis; (3) tidak ada super admin terpisah; (4) tanpa tombol urungkan, cukup konfirmasi dan salinan di Audit. Perlu dikonfirmasi ulang ke owner.


1. Hapus pesanan berstatus **Diambil dan sudah lunas**: boleh sama seperti yang lain? (rencana ini: boleh, dengan alasan wajib dan salinan di Audit)
2. Hapus pesanan yang **insentifnya sudah dibayar**: kas insentif dibiarkan dan diberi tanda, atau ikut dibatalkan otomatis? (rencana ini: dibiarkan, karena uang sudah keluar)
3. Apakah perlu peran **super admin** terpisah dari owner? Sekarang hanya ada owner. (rencana ini: tidak, owner sama dengan admin)
4. Perlu **tombol urungkan (undo)** beberapa detik setelah hapus, atau konfirmasi saja cukup? (rencana ini: konfirmasi saja, karena Audit menyimpan salinan)
