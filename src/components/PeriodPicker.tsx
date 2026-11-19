import { periodLabel, type PeriodChoice, type PeriodState } from '@/lib/finance'

const choiceText: Record<PeriodChoice, string> = { ...periodLabel, custom: 'Rentang', all: 'Semua' }

/**
 * Pilihan periode: Hari ini, Kemarin, Minggu ini, Bulan ini, Rentang tanggal bebas,
 * dan (opsional) Semua. Dipakai di Pesanan, Buku Kas, Laporan, dan Pengeluaran.
 */
export function PeriodPicker({
  value,
  onChange,
  choices = ['today', 'yesterday', 'week', 'month', 'custom'],
}: {
  value: PeriodState
  onChange: (v: PeriodState) => void
  choices?: PeriodChoice[]
}) {
  return (
    <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
      <div className="seg" role="group" aria-label="Periode">
        {choices.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={value.choice === c}
            onClick={() => onChange({ ...value, choice: c })}
            className="seg-item"
          >
            {choiceText[c]}
          </button>
        ))}
      </div>
      {value.choice === 'custom' && (
        <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm font-semibold">
            Dari
            <input
              type="date"
              value={value.from}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
              className="field field-sm w-auto"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            Sampai
            <input
              type="date"
              value={value.to}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
              className="field field-sm w-auto"
            />
          </label>
        </div>
      )}
    </div>
  )
}
