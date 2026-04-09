import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const siteOrigin = 'https://bibliosaloon.ru'
const distDir = new URL('../dist/', import.meta.url)
const routeDirs = ['categories', 'favorites', 'order', 'support']
const indexPath = new URL('index.html', distDir)
const assetsDir = new URL('assets/', distDir)
const legacyJsAliases = [
  'index-ZZtPqf8f.js',
  'index-CfZGomne.js',
  'index-wfND-vDY.js',
  'index-DIr-dV05.js',
]
const legacyCssAliases = [
  'index-dQkfyjkW.css',
  'index-CG-1yK76.css',
  'index-CGsUQMur.css',
]
const buildStamp = Date.now().toString(36)
const rawHtml = await readFile(indexPath, 'utf8')
const html = rawHtml
  .replaceAll('/app/assets/app.css', `/app/assets/app.css?v=${buildStamp}`)
  .replaceAll('/app/assets/app.js', `/app/assets/app.js?v=${buildStamp}`)

await writeFile(indexPath, html, 'utf8')

for (const route of routeDirs) {
  const routeIndex = new URL(`${route}/index.html`, distDir)
  await mkdir(fileURLToPath(new URL(`${route}/`, distDir)), { recursive: true })
  await writeFile(routeIndex, html, 'utf8')
}

await writeLegacyAssetAliases()
await generateSharePages()
await copyFile(indexPath, new URL('404.html', distDir))

async function writeLegacyAssetAliases() {
  await mkdir(fileURLToPath(assetsDir), { recursive: true })

  for (const filename of legacyJsAliases) {
    await copyFile(new URL('app.js', assetsDir), new URL(filename, assetsDir))
  }

  for (const filename of legacyCssAliases) {
    await copyFile(new URL('app.css', assetsDir), new URL(filename, assetsDir))
  }
}

async function generateSharePages() {
  const response = await fetchWithRetry(new URL('/catalog.json', siteOrigin))
  if (!response.ok) {
    throw new Error(`Не удалось получить catalog.json для share-страниц: ${response.status}`)
  }

  const catalog = (await response.json()).filter((item) => item.exists !== false)
  const shareRoot = new URL('share/', distDir)
  await mkdir(fileURLToPath(shareRoot), { recursive: true })

  for (const document of catalog) {
    const token = resolveDocumentShareToken(document)
    const shareDir = new URL(`${token}/`, shareRoot)
    await mkdir(fileURLToPath(shareDir), { recursive: true })
    await writeFile(new URL('index.html', shareDir), buildSharePage(document, catalog.length), 'utf8')
    await writeFile(new URL('og.svg', shareDir), buildShareOgSvg(document), 'utf8')
  }
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError

  for (let index = 0; index < attempts; index += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      })
      clearTimeout(timeout)
      return response
    } catch (error) {
      clearTimeout(timeout)
      lastError = error
      if (index < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1200 * (index + 1)))
        continue
      }
    }
  }

  throw lastError
}

function documentKey(document) {
  return document.file || document.filename || document.title
}

function hashDocumentKey(value) {
  let h1 = 0xdeadbeef ^ value.length
  let h2 = 0x41c6ce57 ^ value.length

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }

  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

function resolveDocumentShareToken(document) {
  return `d-${hashDocumentKey(documentKey(document))}`
}

function resolveDocumentExtension(document) {
  const source = document.filename || document.file || ''
  const ext = source.split('.').pop()?.trim()?.toUpperCase()
  if (!ext) return 'DOC'
  if (ext === 'DOCX') return 'DOC'
  return ext
}

function resolveFileUrl(document) {
  const path = String(document.file || '').replace(/^\/+/, '')
  return new URL(`/${path}`, siteOrigin).toString()
}

function resolveDocumentAppUrl(document) {
  const url = new URL('/app/', siteOrigin)
  url.searchParams.set('share', resolveDocumentShareToken(document))
  return url.toString()
}

function trimText(value, limit) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function wrapText(value, maxCharsPerLine, maxLines) {
  const words = trimText(String(value || '').replace(/\s+/g, ' ').trim(), maxCharsPerLine * maxLines + 24).split(' ')
  const lines = []
  let current = ''

  for (const word of words) {
    if (!word) continue
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxCharsPerLine || !current) {
      current = next
      continue
    }

    lines.push(current)
    current = word
    if (lines.length === maxLines - 1) break
  }

  if (current && lines.length < maxLines) {
    lines.push(current)
  }

  const remainingWords = words.slice(lines.join(' ').split(' ').filter(Boolean).length)
  if (remainingWords.length && lines.length) {
    lines[lines.length - 1] = trimText(`${lines[lines.length - 1]} ${remainingWords.join(' ')}`, maxCharsPerLine)
  }

  return lines.slice(0, maxLines)
}

function buildShareDescription(document) {
  const context = trimText(
    [document.subject, document.category].filter(Boolean).join(' · '),
    64,
  )
  const parts = ['Документ из Библиотеки Салона.']

  if (context) parts.push(`${context}.`)
  parts.push('Открой файл и найди похожие материалы по этой теме.')
  return parts.join(' ').replace(/\s+/g, ' ')
}

function buildShareOgSvg(document) {
  const title = trimText(document.catalogTitle || document.title || document.filename, 110)
  const titleLines = wrapText(title, 24, 3)
  const subtitle = trimText(document.subject || document.category || 'Библиотека Салона', 54)
  const category = trimText(document.category || 'Каталог', 28)
  const infoLine = trimText(
    [document.docType?.trim() || 'Документ', resolveDocumentExtension(document), document.size].filter(Boolean).join(' · '),
    28,
  )
  const actionLine = 'Открой документ и вернись в каталог по теме'

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="160" y1="40" x2="1090" y2="590" gradientUnits="userSpaceOnUse">
      <stop stop-color="#16111D"/>
      <stop offset="1" stop-color="#08070B"/>
    </linearGradient>
    <radialGradient id="gold" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(988 108) rotate(131.634) scale(412.143 545.611)">
      <stop stop-color="#D7B35A" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#D7B35A" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="soft" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(192 22) rotate(62.18) scale(518.442 888.579)">
      <stop stop-color="#F1D99D" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#F1D99D" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" rx="0" fill="#08070B"/>
  <rect x="24" y="24" width="1152" height="582" rx="34" fill="url(#bg)"/>
  <rect x="24" y="24" width="1152" height="582" rx="34" fill="url(#gold)"/>
  <rect x="24" y="24" width="1152" height="582" rx="34" fill="url(#soft)"/>
  <rect x="24.5" y="24.5" width="1151" height="581" rx="33.5" stroke="#FFFFFF" stroke-opacity="0.08"/>

  <circle cx="1096" cy="108" r="98" fill="#D7B35A" fill-opacity="0.08"/>
  <circle cx="1102" cy="112" r="61" fill="#F1D99D" fill-opacity="0.08"/>

  <rect x="84" y="78" width="302" height="46" rx="23" fill="#D7B35A" fill-opacity="0.12"/>
  <circle cx="116" cy="101" r="7" fill="#F1D99D"/>
  <text x="136" y="108" fill="#F1D99D" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="0.14em">БИБЛИОТЕКА САЛОНА</text>

  <text x="84" y="172" fill="#C8BDA1" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700">${escapeHtml(subtitle)}</text>
  ${titleLines
    .map(
      (line, index) =>
        `<text x="84" y="${236 + index * 72}" fill="#F5F2EA" font-family="Georgia, 'Times New Roman', serif" font-size="58" font-weight="700" letter-spacing="-0.04em">${escapeHtml(line)}</text>`,
    )
    .join('\n  ')}

  <rect x="84" y="422" width="520" height="104" rx="26" fill="#FFFFFF" fill-opacity="0.04"/>
  <rect x="84.5" y="422.5" width="519" height="103" rx="25.5" stroke="#FFFFFF" stroke-opacity="0.08"/>
  <text x="116" y="461" fill="#F1D99D" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800" letter-spacing="0.08em">ПО ССЫЛКЕ</text>
  <text x="116" y="497" fill="#F5F2EA" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="700">${escapeHtml(actionLine)}</text>

  <g>
    <rect x="84" y="548" width="196" height="42" rx="21" fill="#FFFFFF" fill-opacity="0.05"/>
    <text x="116" y="575" fill="#C8BDA1" font-family="Inter, Arial, sans-serif" font-size="21" font-weight="700">${escapeHtml(category)}</text>
  </g>
  <g>
    <rect x="296" y="548" width="220" height="42" rx="21" fill="#FFFFFF" fill-opacity="0.05"/>
    <text x="328" y="575" fill="#C8BDA1" font-family="Inter, Arial, sans-serif" font-size="21" font-weight="700">${escapeHtml(infoLine)}</text>
  </g>
  <g>
    <text x="868" y="554" fill="#F1D99D" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="0.08em">BIBLIOSALOON.RU</text>
    <text x="868" y="584" fill="#C8BDA1" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="600">Студенческие работы и примеры</text>
  </g>
</svg>`
}

function buildSharePage(document, totalCount) {
  const title = trimText(document.catalogTitle || document.title || document.filename, 92)
  const description = buildShareDescription(document)
  const fileUrl = resolveFileUrl(document)
  const appUrl = resolveDocumentAppUrl(document)
  const catalogUrl = new URL('/app/', siteOrigin).toString()
  const shareUrl = new URL(`/app/share/${resolveDocumentShareToken(document)}/`, siteOrigin).toString()
  const extension = resolveDocumentExtension(document)
  const fileLabel = extension === 'PDF' ? 'Открыть PDF' : 'Скачать файл'
  const infoLine = [document.docType?.trim() || 'Документ', extension, document.size].filter(Boolean).join(' · ')
  const sourceLabel = document.subject || document.category || 'Библиотека Салона'
  const libraryLabel = `${totalCount}+ материалов`
  const pageTitle = `${title} — Библиотека Салона`
  const escapedTitle = escapeHtml(title)
  const escapedDescription = escapeHtml(description)
  const escapedInfoLine = escapeHtml(infoLine)
  const escapedSourceLabel = escapeHtml(sourceLabel)
  const escapedCategory = escapeHtml(document.category || '')
  const escapedAppUrl = escapeHtml(appUrl)
  const escapedCatalogUrl = escapeHtml(catalogUrl)
  const escapedFileUrl = escapeHtml(fileUrl)
  const escapedShareUrl = escapeHtml(shareUrl)
  const ogImageUrl = escapeHtml(new URL(`/app/share/${resolveDocumentShareToken(document)}/og.svg`, siteOrigin).toString())

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapedDescription}" />
    <meta name="theme-color" content="#08070b" />
    <meta name="robots" content="noindex, noarchive" />
    <link rel="canonical" href="${escapedShareUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Библиотека Салона" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:url" content="${escapedShareUrl}" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:image:type" content="image/svg+xml" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Библиотека Салона" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    <meta name="twitter:image" content="${ogImageUrl}" />
    <link rel="icon" type="image/svg+xml" href="/app/icons/icon.svg" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #08070b;
        --bg2: #121019;
        --line: rgba(255,255,255,0.08);
        --text: #f5f2ea;
        --muted: rgba(245,242,234,0.72);
        --accent: #d7b35a;
        --accent-2: #f1d99d;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top, rgba(215,179,90,0.18), transparent 34%),
          radial-gradient(circle at bottom left, rgba(70,55,24,0.28), transparent 30%),
          var(--bg);
        color: var(--text);
      }

      main {
        width: min(100%, 760px);
        margin: 0 auto;
        min-height: 100vh;
        padding: 28px 20px 40px;
        display: grid;
        align-content: center;
      }

      .surface {
        padding: 28px 22px 22px;
        border-radius: 28px;
        background:
          radial-gradient(circle at top right, rgba(215,179,90,0.16), transparent 38%),
          linear-gradient(180deg, rgba(18,16,25,0.97), rgba(8,7,11,0.97));
        border: 1px solid var(--line);
        box-shadow: 0 32px 80px rgba(0,0,0,0.34);
      }

      .eyebrow,
      .meta span,
      .source-note strong {
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 800;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 14px;
        border-radius: 999px;
        background: rgba(215,179,90,0.12);
        color: var(--accent-2);
        font-size: 12px;
      }

      h1 {
        margin: 18px 0 0;
        font-family: "Playfair Display", Georgia, serif;
        font-size: clamp(2rem, 5vw, 3.25rem);
        line-height: 0.96;
      }

      .lead {
        margin: 14px 0 0;
        max-width: 38ch;
        color: var(--muted);
        font-size: 1rem;
        line-height: 1.55;
      }

      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 18px;
      }

      .meta span {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.07);
        color: var(--muted);
        font-size: 11px;
      }

      .facts {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-top: 18px;
        border-radius: 20px;
        overflow: hidden;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
      }

      .facts div {
        min-width: 0;
        padding: 14px 14px 13px;
        border-right: 1px solid rgba(255,255,255,0.06);
      }

      .facts div:last-child {
        border-right: 0;
      }

      .facts span,
      .facts strong {
        display: block;
      }

      .facts span {
        color: var(--muted);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 800;
      }

      .facts strong {
        margin-top: 7px;
        font-size: 0.92rem;
        line-height: 1.22;
      }

      .context {
        margin-top: 22px;
        padding: 17px 16px 16px;
        border-radius: 22px;
        background:
          radial-gradient(circle at top right, rgba(215,179,90,0.14), transparent 44%),
          rgba(255,255,255,0.04);
        border: 1px solid rgba(240,219,161,0.12);
      }

      .context span {
        display: block;
        color: var(--muted);
        font-size: 12px;
      }

      .context strong {
        display: block;
        margin-top: 6px;
        font-size: 1rem;
      }

      .source-note {
        margin-top: 14px;
        padding: 0;
      }

      .source-note strong {
        display: inline-flex;
        color: var(--accent-2);
        font-size: 11px;
      }

      .source-note p {
        margin: 8px 0 0;
        color: var(--muted);
        font-size: 0.94rem;
        line-height: 1.5;
      }

      .actions {
        display: grid;
        gap: 10px;
        margin-top: 18px;
      }

      .actions-note {
        margin-top: 10px;
        color: var(--muted);
        font-size: 0.86rem;
        line-height: 1.45;
      }

      .primary,
      .secondary,
      .tertiary {
        min-height: 54px;
        border-radius: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 0 18px;
        text-decoration: none;
        font-weight: 700;
      }

      .primary {
        background: linear-gradient(180deg, var(--accent-2), var(--accent));
        color: #1c160d;
      }

      .secondary {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.07);
        color: var(--text);
      }

      .tertiary {
        margin-top: 8px;
        min-height: auto;
        padding: 0;
        justify-content: flex-start;
        color: var(--accent-2);
      }

      .footer {
        margin-top: 18px;
        color: rgba(245,242,234,0.58);
        font-size: 0.82rem;
        line-height: 1.45;
      }

      .footer strong {
        color: var(--text);
      }

      @media (max-width: 640px) {
        main {
          padding: 18px 14px 24px;
          align-content: start;
        }

        .surface {
          padding: 22px 16px 18px;
          border-radius: 24px;
        }

        h1 {
          font-size: clamp(1.7rem, 9vw, 2.4rem);
        }

        .lead {
          font-size: 0.95rem;
        }

        .facts {
          grid-template-columns: 1fr;
        }

        .facts div {
          border-right: 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .facts div:last-child {
          border-bottom: 0;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="surface">
        <div class="eyebrow">Библиотека Салона</div>
        <h1>${escapedTitle}</h1>
        <p class="lead">${escapedDescription}</p>
        <div class="meta">
          <span>${escapedSourceLabel}</span>
          <span>${escapedCategory}</span>
          <span>${escapedInfoLine}</span>
        </div>
        <div class="facts">
          <div>
            <span>Файл</span>
            <strong>${escapedInfoLine}</strong>
          </div>
          <div>
            <span>Источник</span>
            <strong>${escapedSourceLabel}</strong>
          </div>
          <div>
            <span>В библиотеке</span>
            <strong>${escapeHtml(libraryLabel)}</strong>
          </div>
        </div>
        <div class="context">
          <span>Из Библиотеки Салона</span>
          <strong>Открой документ, скачай файл или вернись в каталог без повторного поиска.</strong>
        </div>
        <div class="source-note">
          <strong>Почему это удобно</strong>
          <p>Ссылка ведёт не на голый файл, а в страницу документа. Там можно открыть материал, перейти к похожим работам и быстро вернуться в каталог.</p>
        </div>
        <div class="actions">
          <a class="primary" href="${escapedAppUrl}">Открыть в библиотеке</a>
          <a class="secondary" href="${escapedFileUrl}">${escapeHtml(fileLabel)}</a>
        </div>
        <div class="actions-note">После открытия будут доступны соседние темы, похожие материалы и весь каталог без нового поиска.</div>
        <a class="tertiary" href="${escapedCatalogUrl}">Открыть весь каталог</a>
        <div class="footer"><strong>Bibliosaloon.ru</strong> • Студенческие работы, примеры и материалы по темам и предметам.</div>
      </section>
    </main>
  </body>
</html>`
}
