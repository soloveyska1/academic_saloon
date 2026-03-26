/* global fetch, URLSearchParams, console */
import process from 'node:process'

const OFFER_URL = 'https://telegra.ph/Publichnaya-oferta-servisa-Akademicheskij-Salon-03-26-3'
const PRIVACY_URL = 'https://telegra.ph/Politika-obrabotki-personalnyh-dannyh-servisa-Akademicheskij-Salon-03-26-2'
const EXECUTOR_URL = 'https://telegra.ph/Svedeniya-ob-ispolnitele-servisa-Akademicheskij-Salon-03-26-2'
const HERO_IMAGE_URL = 'https://raw.githubusercontent.com/soloveyska1/academic_saloon/main/bot/media/legal_hub_cover.png'

function p(text) {
  return { tag: 'p', children: [text] }
}

function h(tag, text) {
  return { tag, children: [text] }
}

function link(text, href) {
  return { tag: 'a', attrs: { href }, children: [text] }
}

function buildContent() {
  return [
    {
      tag: 'figure',
      children: [
        { tag: 'img', attrs: { src: HERO_IMAGE_URL } },
        { tag: 'figcaption', children: ['Академический Салон · правовые документы'] },
      ],
    },
    p('Собранный правовой контур сервиса «Академический Салон». Здесь доступны три ключевых публичных документа: оферта, политика обработки персональных данных и сведения об исполнителе.'),
    {
      tag: 'aside',
      children: ['Действует с 26 марта 2026 г.'],
    },
    { tag: 'hr' },
    h('h3', '1. Публичная оферта'),
    p('Основной договорный документ: предмет услуги, акцепт, сроки, этапы оплаты, возвраты, доработки, конфиденциальность и ответственность.'),
    p(link('Открыть публичную оферту', OFFER_URL)),
    { tag: 'hr' },
    h('h3', '2. Политика обработки персональных данных'),
    p('Отдельный документ об операторе персональных данных, целях и основаниях обработки, сроках хранения, правах пользователя и используемых сервисах.'),
    p(link('Открыть политику обработки персональных данных', PRIVACY_URL)),
    { tag: 'hr' },
    h('h3', '3. Сведения об исполнителе'),
    p('Открытая информация об исполнителе, налоговом статусе, каналах связи, расчётных документах и порядке направления юридически значимых сообщений.'),
    p(link('Открыть сведения об исполнителе', EXECUTOR_URL)),
    { tag: 'hr' },
    h('h3', 'Как пользоваться'),
    p('До акцепта пользователь может открыть любой из документов по отдельности. Продолжение работы с сервисом означает принятие оферты в порядке, описанном в самой оферте.'),
  ]
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
    short_name: 'academic_saloon_legal_hub',
    author_name: 'Академический Салон',
    author_url: 'https://academic-saloon.duckdns.org',
  })

  return {
    accessToken: result.access_token,
    created: true,
  }
}

async function publish() {
  const { accessToken, created } = await ensureAccessToken()
  const pagePath = process.env.TELEGRAPH_PAGE_PATH
  const commonParams = {
    access_token: accessToken,
    title: 'Правовые документы сервиса «Академический Салон»',
    author_name: 'Академический Салон',
    author_url: 'https://academic-saloon.duckdns.org',
    content: JSON.stringify(buildContent()),
    return_content: 'true',
  }

  const result = pagePath
    ? await telegraphApi('editPage', { path: pagePath, ...commonParams })
    : await telegraphApi('createPage', commonParams)

  process.stdout.write(`${JSON.stringify({
    url: result.url,
    path: result.path,
    accessToken: created ? accessToken : undefined,
  }, null, 2)}\n`)
}

publish().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
