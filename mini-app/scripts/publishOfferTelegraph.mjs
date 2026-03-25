import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')
const offerDataPath = path.join(repoRoot, 'mini-app', 'src', 'components', 'modals', 'OfferModal', 'offerData.ts')
const offerImagePath = path.join(repoRoot, 'bot', 'media', 'saloon_welcome.jpg')

function toParagraph(text) {
  return { tag: 'p', children: [text] }
}

function toHeading(tag, text) {
  return { tag, children: [text] }
}

function buildSummaryList(summaryCards) {
  return {
    tag: 'ul',
    children: summaryCards.map((card) => ({
      tag: 'li',
      children: [
        { tag: 'strong', children: [card.title] },
        ` — ${card.hook}. `,
        card.text,
        ' ',
        { tag: 'em', children: [`${card.proof} ${card.proofLabel}`] },
      ],
    })),
  }
}

function buildSectionNodes(sections) {
  return sections.flatMap((section) => [
    toHeading('h4', section.title),
    ...section.clauses.map((clause) => toParagraph(clause)),
  ])
}

function buildTelegraphContent({ summaryCards, sections, meta, imageUrl }) {
  const content = []

  if (imageUrl) {
    content.push({
      tag: 'figure',
      children: [
        { tag: 'img', attrs: { src: imageUrl } },
        { tag: 'figcaption', children: ['Академический Салон · публичная оферта и условия сервиса'] },
      ],
    })
  }

  content.push(
    toParagraph(meta.subtitle),
    {
      tag: 'blockquote',
      children: [
        'Перед первым входом в сервис клиент принимает публичную оферту. Ниже — та же редакция, что и внутри приложения: ключевые условия, а ниже полный текст без сокращений.',
      ],
    },
    toHeading('h3', 'Кратко о главном'),
    buildSummaryList(summaryCards),
    {
      tag: 'aside',
      children: [
        'Нажатие кнопки акцепта в приложении означает согласие с офертой в соответствии со ст. 438 ГК РФ. Полная редакция размещена ниже.',
      ],
    },
    toHeading('h3', 'Полная редакция'),
    ...buildSectionNodes(sections),
    {
      tag: 'aside',
      children: [
        `Редакция ${meta.version} · действует с ${meta.effectiveDate}. Текст синхронизирован с Mini App Academic Saloon.`,
      ],
    },
  )

  return content
}

function loadOfferData() {
  const source = fs.readFileSync(offerDataPath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: offerDataPath,
  }).outputText

  const module = { exports: {} }
  const sandbox = {
    module,
    exports: module.exports,
    require: (specifier) => {
      if (specifier === 'lucide-react') {
        return new Proxy({}, { get: () => ({}) })
      }
      throw new Error(`Unsupported dependency in offerData: ${specifier}`)
    },
  }

  vm.runInNewContext(transpiled, sandbox, { filename: offerDataPath })

  const { SUMMARY_CARDS, OFFER_SECTIONS, OFFER_META } = module.exports
  if (!SUMMARY_CARDS || !OFFER_SECTIONS || !OFFER_META) {
    throw new Error('Не удалось загрузить данные оферты из offerData.ts')
  }

  return {
    summaryCards: SUMMARY_CARDS,
    sections: OFFER_SECTIONS,
    meta: OFFER_META,
  }
}

async function telegraphApi(method, params) {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    body.set(key, value)
  }

  const response = await fetch(`https://api.telegra.ph/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const data = await response.json()
  if (!data.ok) {
    throw new Error(`Telegraph API ${method} failed: ${data.error || response.statusText}`)
  }
  return data.result
}

async function ensureAccessToken() {
  if (process.env.TELEGRAPH_ACCESS_TOKEN) {
    return {
      accessToken: process.env.TELEGRAPH_ACCESS_TOKEN,
      created: false,
    }
  }

  const result = await telegraphApi('createAccount', {
    short_name: 'academic_saloon',
    author_name: 'Academic Saloon',
    author_url: 'https://academic-saloon.duckdns.org',
  })

  return {
    accessToken: result.access_token,
    created: true,
  }
}

async function uploadOfferImage() {
  const form = new FormData()
  const imageBuffer = fs.readFileSync(offerImagePath)
  form.set('file', new File([imageBuffer], 'saloon_welcome.jpg', { type: 'image/jpeg' }))

  const response = await fetch('https://telegra.ph/upload', {
    method: 'POST',
    body: form,
  })

  const data = await response.json()
  if (!Array.isArray(data) || !data[0]?.src) {
    throw new Error(`Telegraph image upload failed: ${JSON.stringify(data)}`)
  }

  return `https://telegra.ph${data[0].src}`
}

async function publish() {
  const { summaryCards, sections, meta } = loadOfferData()
  const { accessToken, created } = await ensureAccessToken()
  let imageUrl = null
  try {
    imageUrl = await uploadOfferImage()
  } catch (error) {
    console.warn(error instanceof Error ? error.message : String(error))
  }
  const content = buildTelegraphContent({ summaryCards, sections, meta, imageUrl })

  const pagePath = process.env.TELEGRAPH_PAGE_PATH
  const commonParams = {
    access_token: accessToken,
    title: meta.title,
    author_name: 'Academic Saloon',
    author_url: 'https://academic-saloon.duckdns.org',
    content: JSON.stringify(content),
    return_content: 'true',
  }

  const result = pagePath
    ? await telegraphApi('editPage', { path: pagePath, ...commonParams })
    : await telegraphApi('createPage', commonParams)

  const output = {
    url: result.url,
    path: result.path,
    imageUrl,
    accessToken: created ? accessToken : undefined,
  }

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
}

publish().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
