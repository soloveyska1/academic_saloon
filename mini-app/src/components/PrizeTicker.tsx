import { useEffect, useState } from 'react';
import '../styles/Roulette.css';

interface PrizeTickerProps {
  highlightId: string | null; // ID of the item to highlight/land on
  state: 'idle' | 'spinning' | 'near-miss' | 'landed';
}

const PRIZES = [
  { id: 'dip', label: 'ДИПЛОМ ПОД КЛЮЧ', rarity: 'LEGENDARY', color: 'text-[#FFD700]' },
  { id: 'crs', label: 'КУРСОВАЯ РАБОТА', rarity: 'EPIC', color: 'text-[#C0C0C0]' },
  { id: 'dsc', label: 'СКИДКА -500₽', rarity: 'RARE', color: 'text-[#D4AF37]' },
  { id: 'pre', label: 'PREMIUM ОТЧЕТ', rarity: 'EPIC', color: 'text-[#C0C0C0]' },
  { id: 'vip', label: 'VIP СТАТУС', rarity: 'LEGENDARY', color: 'text-[#FFD700]' },
  { id: 'bon', label: 'БОНУС 1000₽', rarity: 'RARE', color: 'text-[#D4AF37]' },
];

export const PrizeTicker = ({ highlightId, state }: PrizeTickerProps) => {
  // We render a window of items.
  // In a real slot machine, this matches the spin.
  // Here we will simplistically glitch/highlight.

  return (
    <div className="relative w-full max-w-sm mx-auto mt-8 mb-4 h-32 overflow-hidden border-y border-[#D4AF37]/30 bg-black/50 backdrop-blur-md">
      <div className="absolute top-2 left-2 text-[10px] text-[#D4AF37]/50">TARGET SELECTOR</div>

      <div className="flex flex-col items-center justify-center h-full space-y-2">
        {/* Logic for the theatrical "Near Miss" would ideally involve animating this list.
                     For the MVP React version without heavy GSAP, we will use a static "Selection" view 
                     that updates based on state.
                 */}

        {state === 'spinning' ? (
          <div className="flex flex-col gap-2 animate-pulse blur-sm opacity-50">
            {PRIZES.map(p => (
              <div key={p.id} className="text-center text-xs opacity-50">{p.label}</div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 w-full transition-all duration-300">
            {state === 'near-miss' && (
              <div className="scale-110 transition-transform duration-300">
                <div className="text-[#FF3B30] text-sm font-bold tracking-widest glitched-text shaking">
                  [ {PRIZES[0].label} ]
                </div>
                <div className="text-[10px] text-[#FF3B30] text-center">ERROR: ENCRYPTION TOO STRONG</div>
              </div>
            )}

            {state === 'landed' && (
              <div className="scale-125 transition-transform duration-500 ease-out">
                <div className="text-[#D4AF37] text-lg font-bold tracking-widest metallic-text">
                  {PRIZES.find(p => p.id === highlightId)?.label || 'УСПЕХ'}
                </div>
                <div className="text-[10px] text-[#0F0] text-center mt-1 tracking-widest border border-[#0F0] px-2 rounded">
                  VULNERABILITY FOUND
                </div>
              </div>
            )}

            {state === 'idle' && (
              <div className="text-[#D4AF37]/40 text-sm tracking-widest">
                WAITING FOR INPUT...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scanline overlay specific to this component */}
      <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiAvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDAsIDAsIDAsIDAuNCkiIC8+Cjwvc3ZnPg==')] opacity-50"></div>
    </div>
  );
};
