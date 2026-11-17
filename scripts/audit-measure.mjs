// Ukur tinggi kontrol (tombol, field) di semua halaman memakai Edge tanpa tampilan.
// Pemakaian: node scripts/audit-measure.mjs   (butuh npm run dev di http://localhost:5173)
// Tinggi yang diizinkan: desktop 36, 40, 44, 48 px; HP (< 1024 px) 40, 44, 48, 56 px (skala sentuh).
// Selain itu dilaporkan sebagai temuan.
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const EDGE = process.env.EDGE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE ?? 'http://localhost:5173'
const PORT = 9334
const ALLOWED_DESKTOP = [36, 40, 44, 48]
const ALLOWED_TOUCH = [40, 44, 48, 56]

const PAGES = [
  ['/dashboard', 'owner', 'b1'], ['/orders', 'owner', 'b1'], ['/orders/o10', 'owner', 'b1'], ['/orders/new', 'owner', 'b1'],
  ['/customers', 'owner', 'b1'], ['/customers/c1', 'owner', 'b1'], ['/services', 'owner', 'b1'], ['/inventory', 'owner', 'b1'],
  ['/projects', 'owner', 'b1'], ['/requests/review', 'owner', 'b1'], ['/employees', 'owner', 'b1'], ['/shifts', 'owner', 'b1'],
  ['/attendance', 'owner', 'b1'], ['/cashbook', 'owner', 'b1'], ['/payroll', 'owner', 'b1'], ['/reports', 'owner', 'b1'],
  ['/reports/payments', 'owner', 'b1'], ['/audit', 'owner', 'b1'], ['/businesses/manage', 'owner', 'b1'], ['/settings/shop', 'owner', 'b1'],
  ['/notifications', 'owner', 'b1'], ['/dashboard', 'em1', 'b1'], ['/attendance/me', 'em1', 'b1'], ['/shifts/me', 'em1', 'b1'],
  ['/requests/me', 'em1', 'b1'], ['/requests/new', 'em1', 'b1'], ['/pos', 'em3', 'b2'], ['/pos/cashier', 'em3', 'b2'], ['/pos/products', 'owner', 'b2'],
]
const SIZES = [
  { w: 1280, h: 800, mobile: false },
  { w: 375, h: 812, mobile: true },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
spawn(EDGE, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(process.env.TEMP ?? '.', 'idola-measure-profile')}`, 'about:blank'], { stdio: 'ignore' })

let wsUrl
for (let i = 0; i < 60 && !wsUrl; i++) {
  try {
    wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl
  } catch {
    await sleep(500)
  }
}
const ws = new WebSocket(wsUrl)
await new Promise((r) => (ws.onopen = r))
let id = 1
const pending = new Map()
const waiters = []
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) pending.get(m.id)(m.result)
  else if (m.method) waiters.forEach((w) => w(m))
}
const send = (method, params = {}) => new Promise((res) => { const i = id++; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const loaded = () => new Promise((res) => { const t = setTimeout(res, 15000); waiters.push((m) => m.method === 'Page.loadEventFired' && (clearTimeout(t), res())) })
await send('Page.enable')

const probe = `(() => {
  const out = []
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
  for (const e of document.querySelectorAll('button, a.btn, a.icon-btn, input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, textarea')) {
    if (!vis(e) || e.closest('.sr-only')) continue
    const r = e.getBoundingClientRect()
    const cls = typeof e.className === 'string' ? e.className : ''
    out.push({ tag: e.tagName.toLowerCase(), cls: cls.slice(0, 60), h: Math.round(r.height), radius: getComputedStyle(e).borderTopLeftRadius, text: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 24) })
  }
  return out
})()`

const findings = new Map()
let total = 0
for (const size of SIZES) {
  await send('Emulation.setDeviceMetricsOverride', { width: size.w, height: size.h, deviceScaleFactor: 1, mobile: size.mobile })
  for (const [path, who, biz] of PAGES) {
    const l = loaded()
    await send('Page.navigate', { url: `${BASE}${path}?as=${who}&biz=${biz}` })
    await l
    await sleep(900)
    const res = await send('Runtime.evaluate', { returnByValue: true, expression: probe })
    for (const c of res.result.value) {
      total++
      if ((size.w < 1024 ? ALLOWED_TOUCH : ALLOWED_DESKTOP).includes(c.h)) continue
      const key = `${c.tag} h=${c.h} r=${c.radius} [${c.cls}]`
      const f = findings.get(key) ?? { pages: new Set(), sample: c.text }
      f.pages.add(`${path}@${size.w}`)
      findings.set(key, f)
    }
  }
}
console.log(`kontrol diukur: ${total}, tinggi di luar skala: ${findings.size} jenis`)
for (const [k, f] of findings) console.log(`- ${k} "${f.sample}" di ${[...f.pages].slice(0, 4).join(', ')}${f.pages.size > 4 ? ` +${f.pages.size - 4}` : ''}`)
try { await send('Browser.close') } catch { /* sudah tertutup */ }
process.exit(0)
