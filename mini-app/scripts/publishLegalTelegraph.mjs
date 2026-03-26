/* global fetch, URLSearchParams, console */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')
const legalDataPath = path.join(repoRoot, 'mini-app', 'src', 'legal', 'legalPublicData.ts')
const REMOTE_OFFER_IMAGE_URL = 'https://raw.githubusercontent.com/soloveyska1/academic_saloon/main/bot/media/saloon_welcome.jpg'

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
      tag: 'aside',
      children: [`Действует с ${meta.effectiveDate}`],
    },
    toHeading('h3', 'Официальная редакция'),
    toParagraph(meta.intro),
  ]
}

function buildSectionNodes(sections) {
  return sections.flatMap((section) => [
    { tag: 'hr' },
    toHeading('h4', section.title),
    ...section.clauses.map((clause) => {
      const { prefix, body } = splitClauseNumber(clause)
      return {
        tag: 'p',
        children: prefix
          ? [{ tag: 'strong', children: [`п. ${prefix.replace(/\.$/, '')} `] }, body]
          : [body],
      }
    }),
  ])
}

function buildTelegraphContent({ doc }) {
  return [
    {
      tag: 'figure',
      children: [
        { tag: 'img', attrs: { src: REMOTE_OFFER_IMAGE_URL } },
        { tag: 'figcaption', children: ['Академический Салон · официальный правовой контур'] },
      ],
    },
    ...buildHeroNodes(doc.meta),
    { tag: 'hr' },
    toHeading('h3', 'Полная редакция'),
    ...buildSectionNodes(doc.sections),
  ]
}

function loadLegalData() {
  const source = fs.readFileSync(legalDataPath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: legalDataPath,
  }).outputText

  const module = { exports: {} }
  const sandbox = {
    module,
    exports: module.exports,
  }

  vm.runInNewContext(transpiled, sandbox, { filename: legalDataPath })

  const { PRIVACY_POLICY_DATA, EXECUTOR_PUBLIC_INFO } = module.exports
  if (!PRIVACY_POLICY_DATA || !EXECUTOR_PUBLIC_INFO) {
    throw new Error('Не удалось загрузить публичные legal-данные из legalPublicData.ts')
  }

  return {
    privacy: PRIVACY_POLICY_DATA,
    executor: EXECUTOR_PUBLIC_INFO,
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
    short_name: 'academic_saloon_legal',
    author_name: 'Академический Салон',
    author_url: 'https://academic-saloon.duckdns.org',
  })

  return {
    accessToken: result.access_token,
    created: true,
  }
}

async function publish() {
  const documents = loadLegalData()
  const kind = (process.env.LEGAL_DOC || 'privacy').trim()
  const doc = documents[kind]

  if (!doc) {
    throw new Error(`Неизвестный документ LEGAL_DOC=${kind}. Ожидается privacy или executor.`)
  }

  const { accessToken, created } = await ensureAccessToken()
  const content = buildTelegraphContent({ doc })
  const pagePath = process.env.TELEGRAPH_PAGE_PATH
  const commonParams = {
    access_token: accessToken,
    title: doc.meta.title,
    author_name: 'Академический Салон',
    author_url: 'https://academic-saloon.duckdns.org',
    content: JSON.stringify(content),
    return_content: 'true',
  }

  const result = pagePath
    ? await telegraphApi('editPage', { path: pagePath, ...commonParams })
    : await telegraphApi('createPage', commonParams)

  process.stdout.write(`${JSON.stringify({
    kind,
    url: result.url,
    path: result.path,
    accessToken: created ? accessToken : undefined,
  }, null, 2)}\n`)
}

publish().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
