import { useCallback, useState } from 'react';
import useSound from 'use-sound';

// ═══════════════════════════════════════════════════════════════════════════
//  TYPES & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export type SensoryFeedbackType =
    | 'touch'      // Light tap (Glass)
    | 'actuate'    // Medium click (Mechanical)
    | 'climax'     // Heavy thud (Vault Lock)
    | 'success'    // Success chime
    | 'failure'    // Error knock
    | 'selection'; // Scroll tick

interface SensoryConfig {
    volume?: number;
    soundEnabled?: boolean;
    hapticsEnabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
//  HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export const useSensoryFeedback = (config: SensoryConfig = {}) => {
    const {
        volume = 0.5,
        soundEnabled = true,
        hapticsEnabled = true,
    } = config;

    const [isMuted, setIsMuted] = useState(!soundEnabled);

    // 1. Initialize Sounds
    // Using string paths assuming Vite/public folder structure or assets
    const SOUND_PATHS = {
        touch: '/src/assets/sounds/touch.mp3',
        actuate: '/src/assets/sounds/actuate.mp3',
        climax: '/src/assets/sounds/climax.mp3',
        success: '/src/assets/sounds/success.mp3',
        failure: '/src/assets/sounds/failure.mp3',
        selection: '/src/assets/sounds/selection.mp3',
    };

    const [playTouch] = useSound(SOUND_PATHS.touch, { volume });
    const [playActuate] = useSound(SOUND_PATHS.actuate, { volume });
    const [playClimax] = useSound(SOUND_PATHS.climax, { volume });
    const [playSuccess] = useSound(SOUND_PATHS.success, { volume });
    const [playFailure] = useSound(SOUND_PATHS.failure, { volume });
    const [playSelection] = useSound(SOUND_PATHS.selection, { volume: volume * 0.5 });

    // 2. Haptic Engine Abstraction
    const triggerHaptic = useCallback((type: SensoryFeedbackType) => {
        if (!hapticsEnabled) return;

        // Check if Telegram WebApp is available
        const webApp = window.Telegram?.WebApp;
        const isTelegram = !!webApp?.initData;

        if (isTelegram && webApp.HapticFeedback) {
            try {
                switch (type) {
                    case 'touch':
                        webApp.HapticFeedback.impactOccurred('light');
                        break;
                    case 'actuate':
                        webApp.HapticFeedback.impactOccurred('medium');
                        break;
                    case 'climax':
                        webApp.HapticFeedback.impactOccurred('heavy');
                        break;
                    case 'success':
                        webApp.HapticFeedback.notificationOccurred('success');
                        break;
                    case 'failure':
                        webApp.HapticFeedback.notificationOccurred('error');
                        break;
                    case 'selection':
                        webApp.HapticFeedback.selectionChanged();
                        break;
                }
            } catch (e) {
                console.warn('Telegram haptics failed:', e);
            }
        } else {
            // Browser Fallback (Navigator API)
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                switch (type) {
                    case 'touch':
                        navigator.vibrate(10);
                        break;
                    case 'actuate':
                        navigator.vibrate(15);
                        break;
                    case 'climax':
                        navigator.vibrate(30);
                        break;
                    case 'success':
                        navigator.vibrate([10, 30, 10]);
                        break;
                    case 'failure':
                        navigator.vibrate([30, 50, 30]);
                        break;
                    case 'selection':
                        navigator.vibrate(5);
                        break;
                }
            }
        }
    }, [hapticsEnabled]);

    // 3. Audio Engine Abstraction
    const triggerSound = useCallback((type: SensoryFeedbackType) => {
        if (isMuted) return;

        try {
            switch (type) {
                case 'touch': playTouch(); break;
                case 'actuate': playActuate(); break;
                case 'climax': playClimax(); break;
                case 'success': playSuccess(); break;
                case 'failure': playFailure(); break;
                case 'selection': playSelection(); break;
            }
        } catch (e) {
            console.warn('Audio playback failed:', e);
        }
    }, [isMuted, playTouch, playActuate, playClimax, playSuccess, playFailure, playSelection]);

    // 4. Master Trigger
    const trigger = useCallback((type: SensoryFeedbackType) => {
        triggerHaptic(type);
        triggerSound(type);
    }, [triggerHaptic, triggerSound]);

    return {
        trigger,
        isMuted,
        toggleMute: () => setIsMuted(prev => !prev),
    };
};
