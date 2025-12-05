import { useState, useCallback } from 'react';
import { useSound } from './useSound';
import { UserData, RouletteResult } from '../types';

// Prize Configuration
const PRIZES = [
    { id: 'jackpot', label: 'DIPLOMA', type: 'jackpot', value: 0, weight: 0.1, color: '#FFD700' }, // 0.1%
    { id: 'grand', label: '-50% OFF', type: 'discount', value: 50, weight: 0.5, color: '#C0C0C0' }, // 0.5%
    { id: 'major', label: '200 PTS', type: 'bonus', value: 200, weight: 5.0, color: '#CD7F32' },   // 5%
    { id: 'minor', label: '50 PTS', type: 'bonus', value: 50, weight: 20.0, color: '#4ade80' },    // 20%
    { id: 'consolation', label: '-5% OFF', type: 'discount', value: 5, weight: 25.0, color: '#60a5fa' }, // 25%
    { id: 'loss', label: 'TRY AGAIN', type: 'nothing', value: 0, weight: 49.4, color: '#ef4444' }, // 49.4%
] as const;

export const useRoulette = (user: UserData | null) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState<RouletteResult | null>(null);
    const [freeSpins, setFreeSpins] = useState(user?.free_spins || 3); // Default to 3 if undefined
    const { playSound } = useSound();

    const SPIN_COST = 100; // Cost in bonuses

    const spin = useCallback(() => {
        if (isSpinning) return;

        // Check funds
        if (freeSpins <= 0 && (user?.bonus_balance || 0) < SPIN_COST) {
            playSound('error');
            // TODO: Trigger "Not enough funds" modal
            return;
        }

        setIsSpinning(true);
        playSound('turbine'); // Start sound

        // Deduct cost (visual only for now, backend sync needed later)
        if (freeSpins > 0) {
            setFreeSpins(prev => prev - 1);
        } else {
            // Logic to deduct from user balance would go here
        }

        // RNG Logic
        const rand = Math.random() * 100;
        let cumulativeWeight = 0;
        let selectedPrize = PRIZES[PRIZES.length - 1]; // Default to loss

        for (const prize of PRIZES) {
            cumulativeWeight += prize.weight;
            if (rand <= cumulativeWeight) {
                selectedPrize = prize;
                break;
            }
        }

        // Simulate spin duration
        setTimeout(() => {
            setIsSpinning(false);
            setResult({
                prize: selectedPrize.label,
                type: selectedPrize.type as any,
                value: selectedPrize.value,
                message: `Вы выиграли ${selectedPrize.label}!`
            });

            if (selectedPrize.type === 'nothing') {
                playSound('error');
            } else {
                playSound('success');
                // Haptic feedback
                if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                }
            }
        }, 4000); // 4 seconds spin

    }, [isSpinning, freeSpins, user, playSound]);

    const reset = () => {
        setResult(null);
    };

    return {
        isSpinning,
        result,
        freeSpins,
        spin,
        reset,
        SPIN_COST
    };
};
