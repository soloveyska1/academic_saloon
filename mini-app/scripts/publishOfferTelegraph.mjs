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

function splitClauseNumber(clause) {
  const match = clause.match(/^(\d+\.\d+\.)\s*(.*)$/)
  if (!match) {
    return { prefix: null, body: clause }
  }

  return {
    prefix: match[1],
    body: match[2],
  }
}

function buildHeroNodes(meta) {
  return [
    toParagraph(meta.subtitle),
    {
      tag: 'blockquote',
      children: [
        'Это публичная оферта Academic Saloon. Клиент принимает её перед первым входом в сервис, а текст ниже синхронизирован с той же редакцией, что и внутри Mini App.',
      ],
    },
    {
      tag: 'aside',
      children: [
        `Редакция ${meta.version} · действует с ${meta.effectiveDate}`,
      ],
    },
  ]
}

function buildValueManifest(summaryCards) {
  return [
    toHeading('h3', 'Если коротко'),
    {
      tag: 'ul',
      children: [
        {
          tag: 'li',
          children: ['До первого заказа клиент видит ключевые условия, гарантии, схему оплаты и право на возврат.'],
        },
        {
          tag: 'li',
          children: ['Акцепт фиксируется кнопкой в приложении и означает согласие с офертой по ст. 438 ГК РФ.'],
        },
        {
          tag: 'li',
          children: ['Полная редакция ниже не сокращена и соответствует той, что зашита в приложение.'],
        },
      ],
    },
    {
      tag: 'aside',
      children: ['Клиентская выжимка'],
    },
    ...summaryCards.flatMap((card, index) => [
      toHeading('h4', card.title),
      {
        tag: 'p',
        children: [{ tag: 'em', children: [card.hook] }],
      },
      toParagraph(card.text),
      {
        tag: 'aside',
        children: [`${card.proof} · ${card.proofLabel}`],
      },
      ...(index < summaryCards.length - 1 ? [{ tag: 'hr' }] : []),
    ]),
  ]
}

function buildAcceptanceNodes() {
  return [
    { tag: 'hr' },
    toHeading('h3', 'Как работает акцепт'),
    {
      tag: 'ol',
      children: [
        {
          tag: 'li',
          children: ['Клиент открывает приветственный экран и получает доступ к краткой выжимке по условиям.'],
        },
        {
          tag: 'li',
          children: ['Полный текст оферты доступен прямо перед входом и может быть открыт до нажатия кнопки акцепта.'],
        },
        {
          tag: 'li',
          children: ['Нажатие кнопки принятия означает согласие с офертой и открывает доступ к кабинету, заказам, чату, оплате и файлам.'],
        },
      ],
    },
  ]
}

function buildSectionNodes(sections) {
  return sections.flatMap((section) => [
    { tag: 'hr' },
    toHeading('h4', section.title),
    {
      tag: 'ol',
      children: section.clauses.map((clause) => {
        const { prefix, body } = splitClauseNumber(clause)
        return {
          tag: 'li',
          children: prefix
            ? [{ tag: 'strong', children: [`${prefix} `] }, body]
            : [body],
        }
      }),
    },
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
    ...buildHeroNodes(meta),
    ...buildValueManifest(summaryCards),
    ...buildAcceptanceNodes(),
    { tag: 'hr' },
    toHeading('h3', 'Полная редакция'),
    ...buildSectionNodes(sections),
    {
      tag: 'aside',
      children: [
        `Текст синхронизирован с Mini App Academic Saloon. Если оферта обновляется в приложении, эта Telegraph-версия публикуется из того же источника.`,
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
