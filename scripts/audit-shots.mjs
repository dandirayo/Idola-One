// Audit visual: memotret semua halaman di tiga ukuran memakai Microsoft Edge tanpa
// tampilan, dikendalikan lewat protokol DevTools (tanpa paket tambahan).
//
// Pemakaian: node scripts/audit-shots.mjs <nama-folder> [ukuran,ukuran] [awalan-halaman]
//   contoh : node scripts/audit-shots.mjs 2026-11-17-awal
//            VIEW=table node scripts/audit-shots.mjs tabel desktop 02   (mode tampilan daftar)
//            node scripts/audit-shots.mjs 2026-11-17-akhir mobile 0
// Butuh server pengembangan di http://localhost:5173 (npm run dev).
// Masuk otomatis lewat ?as=...&biz=..., hanya aktif di mode pengembangan.
// Hasil: audit/screenshots/<nama-folder>/<ukuran>/<halaman>.png dan report.json
// (tinggi halaman dan apakah ada gulir horizontal). Foto memakai tinggi penuh halaman.

import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const name = process.argv[2]
if (!name) throw new Error('Isi nama folder, contoh: 2026-11-17-awal')
const onlySizes = (process.argv[3] ?? '').split(',').filter(Boolean)
const prefix = process.argv[4] ?? ''

const EDGE = process.env.EDGE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE ?? 'http://localhost:5173'
const PORT = 9333
const out = resolve(here, '..', 'audit', 'screenshots', name)
const profile = join(process.env.TEMP ?? '.', 'idola-audit-cdp-profile')

// nama, path, peran, usaha
const PAGES = [
  ['01-beranda-owner', '/dashboard', 'owner', 'b1'],
  ['02-pesanan', '/orders', 'owner', 'b1'],
  ['03-pesanan-detail', '/orders/o10', 'owner', 'b1'],
  ['04-pesanan-baru', '/orders/new', 'owner', 'b1'],
  ['05-pelanggan', '/customers', 'owner', 'b1'],
  ['06-pelanggan-detail', '/customers/c1', 'owner', 'b1'],
  ['07-layanan', '/services', 'owner', 'b1'],
  ['08-stok', '/inventory', 'owner', 'b1'],
  ['09-proyek', '/projects', 'owner', 'b1'],
  ['10-pengajuan', '/requests/review', 'owner', 'b1'],
  ['11-tim', '/employees', 'owner', 'b1'],
  ['12-jadwal-shift', '/shifts', 'owner', 'b1'],
  ['13-absensi-owner', '/attendance', 'owner', 'b1'],
  ['14-buku-kas', '/cashbook', 'owner', 'b1'],
  ['15-gaji-insentif', '/payroll', 'owner', 'b1'],
  ['16-laporan', '/reports', 'owner', 'b1'],
  ['17-laporan-pembayaran', '/reports/payments', 'owner', 'b1'],
  ['18-audit', '/audit', 'owner', 'b1'],
  ['19-kelola-usaha', '/businesses/manage', 'owner', 'b1'],
  ['20-pengaturan', '/settings/shop', 'owner', 'b1'],
  ['21-notifikasi', '/notifications', 'owner', 'b1'],
  ['22-backup', '/backup', 'owner', 'b1'],
  ['23-profil-owner', '/profile', 'owner', 'b1'],
  ['30-beranda-karyawan', '/dashboard', 'em1', 'b1'],
  ['31-absensi-saya', '/attendance/me', 'em1', 'b1'],
  ['32-jadwal-saya', '/shifts/me', 'em1', 'b1'],
  ['33-pengajuan-saya', '/requests/me', 'em1', 'b1'],
  ['34-pengajuan-baru', '/requests/new', 'em1', 'b1'],
  ['35-pesanan-saya', '/orders/me', 'em1', 'b1'],
  ['36-profil-karyawan', '/profile', 'em1', 'b1'],
  ['40-pos-ringkasan', '/pos', 'em3', 'b2'],
  ['41-pos-kasir', '/pos/cashier', 'em3', 'b2'],
  ['42-pos-produk', '/pos/products', 'owner', 'b2'],
].filter(([n]) => n.startsWith(prefix))

const SIZES = [
  { name: 'desktop', width: 1280, height: 800, mobile: false },
  { name: 'tablet', width: 768, height: 1024, mobile: false },
  { name: 'mobile', width: 375, height: 812, mobile: true },
].filter((s) => onlySizes.length === 0 || onlySizes.includes(s.name))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForDebugger() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const list = await r.json()
      const page = list.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {
      /* belum siap */
    }
    await sleep(500)
  }
  throw new Error('Edge tidak merespons di port debug')
}

spawn(
  EDGE,
  ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'],
  { stdio: 'ignore' },
)

const ws = new WebSocket(await waitForDebugger())
await new Promise((res, rej) => {
  ws.onopen = res
  ws.onerror = rej
})

let nextId = 1
const pending = new Map()
const listeners = []
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) rej(new Error(msg.error.message))
    else res(msg.result)
  } else if (msg.method) {
    listeners.forEach((l) => l(msg))
  }
}
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = nextId++
    pending.set(id, { res, rej })
    ws.send(JSON.stringify({ id, method, params }))
  })
const waitEvent = (method, timeout = 15000) =>
  new Promise((res) => {
    const t = setTimeout(res, timeout)
    const l = (m) => {
      if (m.method === method) {
        clearTimeout(t)
        listeners.splice(listeners.indexOf(l), 1)
        res(m)
      }
    }
    listeners.push(l)
  })

await send('Page.enable')
await send('Runtime.enable')
// VIEW=table|compact|grid memaksa mode tampilan daftar (kunci idola-one:view:*) pada semua halaman.
if (process.env.VIEW) {
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => { const g = Storage.prototype.getItem; Storage.prototype.getItem = function (k) { return String(k).startsWith('idola-one:view:') ? ${JSON.stringify(process.env.VIEW)} : g.call(this, k) } })()`,
  })
}

const report = []
for (const size of SIZES) {
  mkdirSync(join(out, size.name), { recursive: true })
  await send('Emulation.setDeviceMetricsOverride', {
    width: size.width,
    height: size.height,
    deviceScaleFactor: 1,
    mobile: size.mobile,
  })
  for (const [pname, path, who, biz] of PAGES) {
    const loaded = waitEvent('Page.loadEventFired')
    await send('Page.navigate', { url: `${BASE}${path}?as=${who}&biz=${biz}` })
    await loaded
    await sleep(1400) // render React, font, dan gambar

    const { result } = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => { const de = document.documentElement; return { h: Math.max(de.scrollHeight, document.body.scrollHeight), sw: de.scrollWidth, vw: de.clientWidth, h1: document.querySelector('h1')?.innerText ?? null } })()`,
    })
    const m = result.value
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: size.width, height: Math.min(m.h, 6000), scale: 1 },
    })
    writeFileSync(join(out, size.name, `${pname}.png`), Buffer.from(shot.data, 'base64'))
    report.push({ ukuran: size.name, halaman: pname, path, judul: m.h1, tinggi: m.h, lebarKonten: m.sw, lebarViewport: m.vw, gulirHorizontal: m.sw > m.vw + 1 })
    console.log(`${size.name.padEnd(7)} ${pname.padEnd(24)} ${m.h}px${m.sw > m.vw + 1 ? '  GULIR-HORIZONTAL' : ''}`)
  }
}

writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2))
try {
  await send('Browser.close')
} catch {
  /* sudah tertutup */
}
ws.close()
console.log('selesai:', out)
process.exit(0)
