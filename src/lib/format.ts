const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

/** Format angka ke Rupiah, contoh: 28000 -> "Rp 28.000". */
export function formatRupiah(value: number): string {
  return rupiah.format(value).replace(/\u00a0/g, ' ')
}

/**
 * Pembulatan ke atas ke kelipatan Rp1.000, sama dengan aturan di server.
 * Hanya untuk perkiraan di layar. Total final selalu dari server.
 */
export function roundUpToThousand(value: number): number {
  return Math.ceil(value / 1000) * 1000
}
