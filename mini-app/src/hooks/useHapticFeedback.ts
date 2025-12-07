import { useSensoryFeedback } from './useSensoryFeedback'

export const useHapticFeedback = () => {
    const { trigger } = useSensoryFeedback()

    // Maintain compatibility with existing calls
    return {
        trigger,
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
            // Map styles to sensory types
            const typeMap: Record<string, 'touch' | 'actuate' | 'climax'> = {
                light: 'touch',
                medium: 'actuate',
                heavy: 'climax',
                rigid: 'actuate', // Fallback
                soft: 'touch'     // Fallback
            }
            trigger(typeMap[style] || 'actuate')
        },
        notificationOccurred: (type: 'error' | 'success' | 'warning') => {
            const typeMap: Record<string, 'success' | 'failure'> = {
                success: 'success',
                error: 'failure',
                warning: 'failure' // Fallback
            }
            trigger(typeMap[type] || 'success')
        },
        selectionChanged: () => trigger('selection')
    }
}
