import { describe, expect, it } from 'vitest'

import { extractRealtimeChatMessage } from './PremiumChat'

describe('extractRealtimeChatMessage', () => {
  it('returns null for preview strings from websocket notifications', () => {
    expect(extractRealtimeChatMessage('Новое сообщение')).toBeNull()
  })

  it('returns null for malformed payloads', () => {
    expect(
      extractRealtimeChatMessage({
        id: '77',
        sender_type: 'admin',
        sender_name: 'Менеджер',
        created_at: new Date().toISOString(),
        is_read: false,
      }),
    ).toBeNull()
  })

  it('accepts full realtime chat payloads', () => {
    const createdAt = new Date().toISOString()

    expect(
      extractRealtimeChatMessage({
        id: 77,
        sender_type: 'admin',
        sender_name: 'Менеджер',
        message_text: 'Файлы готовы',
        file_type: null,
        file_name: null,
        file_url: null,
        created_at: createdAt,
        is_read: false,
      }),
    ).toEqual({
      id: 77,
      sender_type: 'admin',
      sender_name: 'Менеджер',
      message_text: 'Файлы готовы',
      file_type: null,
      file_name: null,
      file_url: null,
      created_at: createdAt,
      is_read: false,
    })
  })
})
