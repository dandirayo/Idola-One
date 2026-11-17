// Gaji mingguan dan pembayaran insentif item. Keduanya menjadi pengeluaran dan kas keluar.

import { formatRupiah } from '@/lib/format'
import type { PaymentMethod } from '@/lib/orders'
import { weekStartKey } from '@/lib/payroll'
import {
  expenseCash,
  getState,
  makeAudit,
  makeNotification,
  requirePositive,
  uid,
  update,
  type Expense,
  type PayrollRow,
} from './store'

/** Membayar gaji mingguan. Satu kali per karyawan per minggu. */
export function payWeeklySalary(
  employeeId: string,
  weekStart: string,
  amount: number,
  method: PaymentMethod,
  now: Date = new Date(),
): PayrollRow {
  const employee = getState().employees.find((e) => e.id === employeeId)
  if (!employee) throw new Error('Karyawan tidak ditemukan.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) throw new Error('Minggu tidak valid.')
  const [y, m, d] = weekStart.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  if (weekStartKey(start) !== weekStart) throw new Error('Minggu harus dimulai hari Senin.')
  if (start.getTime() > now.getTime()) throw new Error('Minggu itu belum dimulai.')
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Gaji harus bilangan bulat lebih dari nol.')
  if (getState().payrolls.some((p) => p.employeeId === employeeId && p.weekStart === weekStart)) {
    throw new Error(`Gaji ${employee.name} untuk minggu itu sudah dibayar.`)
  }

  const at = now.toISOString()
  const expenseId = uid('e')
  const row: PayrollRow = { id: uid('pay'), employeeId, employeeName: employee.name, weekStart, amount, method, at, expenseId }
  const expense: Expense = {
    id: expenseId,
    description: `Gaji ${employee.name} (minggu ${weekStart})`,
    category: 'Gaji',
    amount,
    method,
    at,
  }
  update((s) => ({
    ...s,
    payrolls: [row, ...s.payrolls],
    expenses: [expense, ...s.expenses],
    cash: [...s.cash, expenseCash(expense)],
    audit: [makeAudit('Gaji', row.id, `${employee.name} · ${weekStart}`, 'Bayar gaji', '-', formatRupiah(amount)), ...s.audit],
  }))
  return row
}

/** Membayar insentif item. Hanya sekali: kas keluar dicatat satu kali. */
export function payIncentive(incentiveId: string, method: PaymentMethod, now: Date = new Date()) {
  const s0 = getState()
  const inc = s0.incentives.find((i) => i.id === incentiveId)
  if (!inc) throw new Error('Insentif tidak ditemukan.')
  if (inc.status === 'paid') throw new Error('Insentif ini sudah dibayar.')
  requirePositive(inc.amount, 'Nominal insentif')
  const employee = s0.employees.find((e) => e.id === inc.employeeId)
  const name = employee?.name ?? 'Karyawan'
  const at = now.toISOString()
  const expenseId = uid('e')
  const expense: Expense = {
    id: expenseId,
    description: `Insentif ${name}: ${inc.itemName} (${inc.orderNumber})`,
    category: 'Insentif',
    amount: inc.amount,
    method,
    at,
  }
  update((s) => ({
    ...s,
    incentives: s.incentives.map((i) => (i.id === incentiveId ? { ...i, status: 'paid' as const, paidAt: at, expenseId } : i)),
    expenses: [expense, ...s.expenses],
    cash: [...s.cash, expenseCash(expense)],
    audit: [makeAudit('Gaji', incentiveId, `${name} · ${inc.itemName}`, 'Bayar insentif', 'Belum dibayar', `Dibayar ${formatRupiah(inc.amount)}`), ...s.audit],
    notifications: [
      makeNotification({
        title: 'Insentif dibayar',
        body: `${inc.itemName} (${inc.orderNumber}): ${formatRupiah(inc.amount)}`,
        link: '/dashboard',
        audience: 'employee',
        forName: name,
      }),
      ...s.notifications,
    ],
  }))
}
