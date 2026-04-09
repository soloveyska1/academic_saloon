import type { ChatMessage } from '../types'

export function haveSameChatMessages(a: ChatMessage[], b: ChatMessage[]): boolean {
  if (a.length !== b.length) return false

  return a.every((message, index) => {
    const next = b[index]

    return (
      message.id === next.id &&
      message.sender_type === next.sender_type &&
      message.sender_name === next.sender_name &&
      message.message_text === next.message_text &&
      message.file_type === next.file_type &&
      message.file_name === next.file_name &&
      message.file_url === next.file_url &&
      message.created_at === next.created_at &&
      message.is_read === next.is_read
    )
  })
}
