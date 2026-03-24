/**
 * Canvas-based achievement share card renderer.
 *
 * Draws a 400x560 card (rendered at 2x for retina) with dark gradient,
 * gold accents, achievement info, user name, and optional stats.
 */

export interface ShareCardAchievement {
  title: string
  description: string
  icon: string // emoji
}

export interface ShareCardStats {
  streak?: number
  orders?: number
  savings?: number
}

export interface RenderShareCardOptions {
  achievement: ShareCardAchievement
  userName: string
  stats?: ShareCardStats
}

/* ─── Constants ─── */
const W = 400
const H = 560
const DPR = 2
const GOLD = '#D4AF37'
const GOLD_DIM = 'rgba(212,175,55,0.55)'
const TEXT_WHITE = '#F5F0E8'
const TEXT_MUTED = 'rgba(255,255,255,0.45)'
const BG_TOP = '#1a1816'
const BG_BOTTOM = '#0A0A0A'

/* ─── Noise texture (generated once) ─── */
let _noisePattern: CanvasPattern | null = null

function getNoisePattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (_noisePattern) return _noisePattern
  const size = 128
  const offscreen = document.createElement('canvas')
  offscreen.width = size
  offscreen.height = size
  const octx = offscreen.getContext('2d')
  if (!octx) return null
  const imageData = octx.createImageData(size, size)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.random() * 255
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
    data[i + 3] = 12 // very subtle
  }
  octx.putImageData(imageData, 0, 0)
  _noisePattern = ctx.createPattern(offscreen, 'repeat')
  return _noisePattern
}

/* ─── Helpers ─── */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number, maxWidth: number, lineHeight: number,
): number {
  const words = text.split(' ')
  let line = ''
  let currentY = y

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, currentY)
      line = word
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, currentY)
  return currentY + lineHeight
}

/* ─── Main renderer ─── */

export function renderShareCard(
  canvas: HTMLCanvasElement,
  options: RenderShareCardOptions,
): void {
  const { achievement, userName, stats } = options

  canvas.width = W * DPR
  canvas.height = H * DPR
  canvas.style.width = `${W}px`
  canvas.style.height = `${H}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.scale(DPR, DPR)

  // ─── Background gradient ───
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
  bgGrad.addColorStop(0, BG_TOP)
  bgGrad.addColorStop(1, BG_BOTTOM)
  roundRect(ctx, 0, 0, W, H, 20)
  ctx.fillStyle = bgGrad
  ctx.fill()

  // ─── Gold border ───
  roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 20)
  ctx.strokeStyle = 'rgba(212,175,55,0.3)'
  ctx.lineWidth = 1
  ctx.stroke()

  // ─── Subtle radial glow behind icon ───
  const glowGrad = ctx.createRadialGradient(W / 2, 210, 0, W / 2, 210, 160)
  glowGrad.addColorStop(0, 'rgba(212,175,55,0.08)')
  glowGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 60, W, 320)

  // ─── Noise overlay ───
  const noise = getNoisePattern(ctx)
  if (noise) {
    ctx.fillStyle = noise
    ctx.globalAlpha = 0.4
    roundRect(ctx, 0, 0, W, H, 20)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // ─── Top shine line ───
  const shineGrad = ctx.createLinearGradient(W * 0.1, 0, W * 0.9, 0)
  shineGrad.addColorStop(0, 'transparent')
  shineGrad.addColorStop(0.5, 'rgba(212,175,55,0.25)')
  shineGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = shineGrad
  ctx.fillRect(0, 0, W, 1.5)

  // ─── Branding ───
  ctx.textAlign = 'center'
  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.letterSpacing = '0.14em'
  ctx.fillStyle = GOLD_DIM
  ctx.fillText('АКАДЕМИЧЕСКИЙ САЛОН', W / 2, 44)

  // ─── Separator line under branding ───
  const sepGrad = ctx.createLinearGradient(W * 0.25, 0, W * 0.75, 0)
  sepGrad.addColorStop(0, 'transparent')
  sepGrad.addColorStop(0.5, 'rgba(212,175,55,0.2)')
  sepGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = sepGrad
  ctx.fillRect(W * 0.25, 58, W * 0.5, 1)

  // ─── Achievement icon (emoji) ───
  ctx.font = '72px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = TEXT_WHITE
  ctx.fillText(achievement.icon, W / 2, 160)

  // ─── Achievement title ───
  ctx.textBaseline = 'alphabetic'
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = TEXT_WHITE
  ctx.fillText(achievement.title, W / 2, 240)

  // ─── Achievement description ───
  ctx.font = '400 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = TEXT_MUTED
  ctx.textAlign = 'center'
  drawWrappedText(ctx, achievement.description, W / 2, 272, W - 80, 22)

  // ─── Divider ───
  const divGrad = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0)
  divGrad.addColorStop(0, 'transparent')
  divGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)')
  divGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = divGrad
  ctx.fillRect(W * 0.2, 310, W * 0.6, 1)

  // ─── User name ───
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = GOLD
  ctx.textAlign = 'center'
  ctx.fillText(userName, W / 2, 348)

  // ─── Stats row (optional) ───
  if (stats && (stats.streak || stats.orders || stats.savings)) {
    const items: string[] = []
    if (stats.streak) items.push(`\uD83D\uDD25 ${stats.streak} дн.`)
    if (stats.orders) items.push(`\uD83D\uDCE6 ${stats.orders} заказов`)
    if (stats.savings) items.push(`\uD83D\uDCB0 ${stats.savings}\u20BD`)

    const totalWidth = items.length * 110
    const startX = (W - totalWidth) / 2

    // Stats background pill
    roundRect(ctx, startX - 10, 370, totalWidth + 20, 40, 12)
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    ctx.fill()
    roundRect(ctx, startX - 10, 370, totalWidth + 20, 40, 12)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 0.5
    ctx.stroke()

    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.textAlign = 'center'

    items.forEach((item, i) => {
      const x = startX + i * 110 + 55
      ctx.fillText(item, x, 395)
    })
  }

  // ─── Bottom branding ───
  ctx.font = '400 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.textAlign = 'center'
  ctx.fillText('academic-saloon.ru', W / 2, H - 24)

  // ─── Bottom shine ───
  const btmGrad = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0)
  btmGrad.addColorStop(0, 'transparent')
  btmGrad.addColorStop(0.5, 'rgba(212,175,55,0.12)')
  btmGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = btmGrad
  ctx.fillRect(0, H - 1, W, 1)
}

/* ─── Export helpers ─── */

export function shareCardToDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png')
}

export function shareCardToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}
