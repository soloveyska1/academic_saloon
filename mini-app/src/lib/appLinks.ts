export const SUPPORT_TELEGRAM_USERNAME = 'academicsaloon'
export const SUPPORT_TELEGRAM_URL = `https://t.me/${SUPPORT_TELEGRAM_USERNAME}`

export function buildReferralLink(botUsername: string | null | undefined, telegramId: number | null | undefined): string {
  if (!botUsername || !telegramId) {
    return ''
  }

  const cleanBotUsername = botUsername.replace(/^@/, '').trim()
  if (!cleanBotUsername) {
    return ''
  }

  return `https://t.me/${cleanBotUsername}?start=ref${telegramId}`
}

export function buildReferralShareText(referralCode: string): string {
  return `Если тоже нужен сильный академический сервис, вот моя ссылка. Код приглашения: ${referralCode}.`
}
