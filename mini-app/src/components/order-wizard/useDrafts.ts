import { useState, useEffect, useCallback } from 'react'
import { DraftsMap } from './types'
import { DRAFTS_BY_TYPE_KEY } from './constants'

// ═══════════════════════════════════════════════════════════════════════════
//  USE DRAFTS — Управление черновиками требований по типу услуги
//
//  При смене типа услуги:
//  - Если у нового типа есть draft — показываем его
//  - Иначе поле пустое
//
//  Автосохранение:
//  - Сохраняем draft при изменении текста
//  - Очищаем при успешной отправке
// ═══════════════════════════════════════════════════════════════════════════

interface UseDraftsOptions {
  serviceTypeId: string | null
  currentData: {
    topic: string
    requirements: string
    subject: string
  }
}

interface UseDraftsReturn {
  drafts: DraftsMap
  saveDraft: () => void
  loadDraft: () => { topic: string; requirements: string; subject: string } | null
  clearDraft: (serviceTypeId: string) => void
  clearAllDrafts: () => void
  hasDraft: boolean
}

export function useDrafts({ serviceTypeId, currentData }: UseDraftsOptions): UseDraftsReturn {
  const [drafts, setDrafts] = useState<DraftsMap>(() => {
    try {
      const saved = localStorage.getItem(DRAFTS_BY_TYPE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Persist drafts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DRAFTS_BY_TYPE_KEY, JSON.stringify(drafts))
    } catch (err) {
      console.warn('Failed to save drafts:', err)
    }
  }, [drafts])

  // Save current data as draft for current service type
  const saveDraft = useCallback(() => {
    if (!serviceTypeId) return

    // Only save if there's meaningful content
    const hasContent = currentData.topic.trim() || currentData.requirements.trim() || currentData.subject.trim()
    if (!hasContent) {
      // Clear draft if no content
      setDrafts(prev => {
        const next = { ...prev }
        delete next[serviceTypeId]
        return next
      })
      return
    }

    setDrafts(prev => ({
      ...prev,
      [serviceTypeId]: {
        topic: currentData.topic,
        requirements: currentData.requirements,
        subject: currentData.subject,
        timestamp: Date.now(),
      }
    }))
  }, [serviceTypeId, currentData])

  // Load draft for current service type
  const loadDraft = useCallback(() => {
    if (!serviceTypeId || !drafts[serviceTypeId]) return null

    const draft = drafts[serviceTypeId]
    // Check if draft is not too old (24 hours)
    const age = Date.now() - draft.timestamp
    if (age > 24 * 60 * 60 * 1000) {
      // Clear old draft
      setDrafts(prev => {
        const next = { ...prev }
        delete next[serviceTypeId]
        return next
      })
      return null
    }

    return {
      topic: draft.topic,
      requirements: draft.requirements,
      subject: draft.subject,
    }
  }, [serviceTypeId, drafts])

  // Clear draft for specific service type
  const clearDraft = useCallback((id: string) => {
    setDrafts(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  // Clear all drafts
  const clearAllDrafts = useCallback(() => {
    setDrafts({})
    try {
      localStorage.removeItem(DRAFTS_BY_TYPE_KEY)
    } catch {
      // Ignore
    }
  }, [])

  // Check if current service type has a draft
  const hasDraft = !!(serviceTypeId && drafts[serviceTypeId])

  return {
    drafts,
    saveDraft,
    loadDraft,
    clearDraft,
    clearAllDrafts,
    hasDraft,
  }
}
