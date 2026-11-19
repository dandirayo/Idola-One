// Pencarian kata kunci untuk layanan dan pelanggan. Aturan mengikuti aplikasi Android:
// huruf kecil, spasi dirapatkan, dan "cuci lipat" dianggap "cuci kering lipat".
// Tambahannya: semua kata kunci cukup ada di mana saja ("jas setrika" menemukan
// "Jas Cuci Setrika"), dan nomor HP 0812 / 62812 / +62812 dianggap sama.

import { normalizePhone } from '@/lib/orders'

/** Sinonim dari aplikasi lama. Express dan Kilat sengaja tidak disamakan: kecepatannya beda. */
const SYNONYMS: [RegExp, string][] = [[/\bcuci lipat\b/g, 'cuci kering lipat']]

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9²]+/g, ' ')
    .trim()
}

export function keywords(query: string): string[] {
  // Angka yang dipisah spasi (nomor HP "+62 812 3456") digabung jadi satu kata kunci.
  let q = normalize(query).replace(/(\d) (?=\d)/g, '$1')
  for (const [pattern, replacement] of SYNONYMS) q = q.replace(pattern, replacement)
  return q.split(' ').filter(Boolean)
}

/**
 * Benar bila setiap kata kunci ada di salah satu kolom teks, atau (untuk angka minimal
 * 3 digit) di salah satu nomor HP setelah dinormalkan ke format 62.
 */
export function matches(query: string, fields: (string | undefined)[], phones: string[] = []): boolean {
  const words = keywords(query)
  if (words.length === 0) return true
  const hay = ` ${normalize(fields.filter(Boolean).join(' '))} `
  const phoneDigits = phones.map((p) => normalizePhone(p))
  return words.every((w) => {
    if (hay.includes(w)) return true
    if (/^\d{3,}$/.test(w)) {
      const needle = w.startsWith('0') || w.startsWith('62') ? normalizePhone(w) : w
      return phoneDigits.some((p) => p.includes(needle))
    }
    return false
  })
}
