import { useState, type FormEvent } from 'react'
import { Card, Hint, inputClass, primaryButton, SectionTitle, TimeField } from '@/components/ui'
import { setShift } from '@/data/attendance'
import { useStore } from '@/data/store'
import { shiftPresets, slotLabel, weekdayNames, type ShiftSlot } from '@/lib/shifts'

const presetKeys = ['libur', 'pagi', 'siang'] as const

/** Nilai select: kunci preset, atau "HH:mm-HH:mm" untuk shift kustom. */
function valueOf(slot: ShiftSlot | null): string {
  if (!slot) return 'libur'
  for (const k of presetKeys) {
    const p = shiftPresets[k]
    if (p && p.start === slot.start && p.end === slot.end) return k
  }
  return `${slot.start}-${slot.end}`
}

export function ShiftsPage() {
  const employees = useStore((s) => s.employees).filter((e) => e.active)
  const shifts = useStore((s) => s.shifts)

  const [error, setError] = useState<string | null>(null)
  const [emp, setEmp] = useState(employees[0]?.id ?? '')
  const [weekday, setWeekday] = useState(0)
  const [start, setStart] = useState('08:00')
  const [end, setEnd] = useState('16:00')
  const [saved, setSaved] = useState(false)

  const slotOf = (employeeId: string, wd: number): ShiftSlot | null => {
    const r = shifts.find((x) => x.employeeId === employeeId && x.weekday === wd)
    return r ? { start: r.start, end: r.end } : null
  }

  function onPreset(employeeId: string, wd: number, key: string) {
    setError(null)
    try {
      const preset = key in shiftPresets ? shiftPresets[key] : null
      setShift(employeeId, wd, preset)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan shift.')
    }
  }

  function onCustom(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      setShift(emp, weekday, { start, end })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan shift.')
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold sm:text-3xl">Jadwal Shift</h1>

      <Hint>Jadwal mingguan berulang. Jam masuk karyawan dibandingkan dengan jadwal ini untuk menghitung keterlambatan (toleransi 10 menit). Data contoh.</Hint>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-card bg-surface p-4 shadow-card">
        <table className="w-full min-w-[44rem] text-sm">
          <caption className="sr-only">Jadwal shift per karyawan per hari</caption>
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="p-2 font-semibold">Karyawan</th>
              {weekdayNames.map((d) => (
                <th key={d} className="p-2 font-semibold">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t border-line">
                <th scope="row" className="p-2 text-left font-semibold">
                  {e.name}
                </th>
                {weekdayNames.map((d, wd) => {
                  const slot = slotOf(e.id, wd)
                  const value = valueOf(slot)
                  const custom = !(value in shiftPresets)
                  return (
                    <td key={d} className="p-1.5">
                      <select
                        aria-label={`Shift ${e.name} hari ${d}`}
                        value={value}
                        onChange={(ev) => onPreset(e.id, wd, ev.target.value)}
                        className="field field-sm"
                      >
                        <option value="libur">Libur</option>
                        <option value="pagi">Pagi 08–16</option>
                        <option value="siang">Siang 13–21</option>
                        {custom && <option value={value}>{slotLabel(slot)}</option>}
                      </select>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card>
        <SectionTitle>Atur jam khusus</SectionTitle>
        <form onSubmit={onCustom} noValidate className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem_8rem_auto] sm:items-end">
          <label className="block text-sm font-semibold">
            Karyawan
            <select value={emp} onChange={(e) => setEmp(e.target.value)} className={`${inputClass} mt-1.5`}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Hari
            <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className={`${inputClass} mt-1.5`}>
              {weekdayNames.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Mulai
            <TimeField value={start} onChange={setStart} />
          </label>
          <label className="block text-sm font-semibold">
            Selesai
            <TimeField value={end} onChange={setEnd} />
          </label>
          <button type="submit" className={primaryButton}>
            Simpan
          </button>
        </form>
        {saved && (
          <p role="status" className="mt-3 text-sm font-medium text-success">
            Shift disimpan.
          </p>
        )}
      </Card>
    </div>
  )
}
