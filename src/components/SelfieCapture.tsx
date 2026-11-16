import { Camera, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MAX_WIDTH = 320

/** Mengecilkan gambar ke lebar maksimum dan mengubahnya menjadi JPEG kecil (data URL). */
function toSmallJpeg(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_WIDTH / width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Kanvas tidak tersedia.')
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.6)
}

/** Foto contoh untuk pratinjau tanpa kamera. Jelas bertuliskan CONTOH. */
function samplePhoto(): string {
  const canvas = document.createElement('canvas')
  canvas.width = 240
  canvas.height = 180
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#e4e1f8'
  ctx.fillRect(0, 0, 240, 180)
  ctx.fillStyle = '#1e1e2d'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('FOTO CONTOH', 120, 90)
  ctx.font = '14px sans-serif'
  ctx.fillText('pratinjau, bukan selfie', 120, 116)
  return canvas.toDataURL('image/jpeg', 0.6)
}

/**
 * Dialog pengambilan selfie. Memakai kamera depan lewat getUserMedia. Bila kamera
 * tidak tersedia atau izin ditolak, pengguna bisa memilih foto lewat kamera
 * perangkat (input file). Aliran kamera selalu dihentikan saat ditutup.
 */
export function SelfieCapture({ title, onCapture, onCancel }: { title: string; onCapture: (photo: string) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [live, setLive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setLive(false)
  }, [])

  useEffect(() => stop, [stop])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stop()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, stop])

  async function start() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Kamera tidak tersedia di browser ini. Gunakan tombol "Pilih foto" di bawah.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = stream
      setLive(true)
      // elemen video baru muncul setelah render
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play()
        }
      })
    } catch {
      setError('Izin kamera ditolak atau kamera tidak ditemukan. Gunakan tombol "Pilih foto" di bawah.')
    }
  }

  function snap() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return setError('Kamera belum siap. Tunggu sebentar.')
    try {
      const photo = toSmallJpeg(v, v.videoWidth, v.videoHeight)
      stop()
      onCapture(photo)
    } catch {
      setError('Gagal mengambil foto. Coba lagi.')
    }
  }

  function fromFile(file: File | undefined) {
    if (!file) return
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      try {
        onCapture(toSmallJpeg(img, img.naturalWidth, img.naturalHeight))
      } catch {
        setError('Gagal membaca foto. Coba lagi.')
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setError('File itu bukan gambar yang bisa dibaca.')
    }
    img.src = url
  }

  return createPortal(
    <div className="screen-only fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Tutup"
        className="absolute inset-0 bg-ink/50"
        onClick={() => {
          stop()
          onCancel()
        }}
      />
      <div className="relative w-full max-w-sm rounded-[1.5rem] bg-surface p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            aria-label="Batal"
            onClick={() => {
              stop()
              onCancel()
            }}
            className="grid size-8 place-items-center rounded-full bg-canvas hover:bg-line"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-canvas">
          {live ? (
            <video ref={videoRef} playsInline muted className="size-full -scale-x-100 object-cover" />
          ) : (
            <Camera className="size-10 text-muted" aria-hidden />
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <div className="mt-4 space-y-2">
          {live ? (
            <button type="button" onClick={snap} className="h-11 w-full rounded-full bg-sidebar text-sm font-bold text-white hover:bg-sidebar-hover">
              Ambil foto
            </button>
          ) : (
            <button type="button" onClick={() => void start()} className="h-11 w-full rounded-full bg-sidebar text-sm font-bold text-white hover:bg-sidebar-hover">
              Buka kamera
            </button>
          )}
          <label className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-canvas text-sm font-semibold hover:bg-line">
            Pilih foto
            <input type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => fromFile(e.target.files?.[0])} />
          </label>
          <button
            type="button"
            onClick={() => {
              stop()
              onCapture(samplePhoto())
            }}
            className="h-10 w-full rounded-full text-xs font-semibold text-muted hover:bg-canvas"
          >
            Pakai foto contoh (hanya pratinjau)
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
