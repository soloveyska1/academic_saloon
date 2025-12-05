import { motion } from 'framer-motion';

interface PrizeTickerProps {
  highlightId: string | null;
  state: 'idle' | 'spinning' | 'near-miss' | 'landed' | 'failed';
}

const PRIZES = [
  { id: 'dip', label: 'ДИПЛОМНАЯ РАБОТА', rarity: 'legendary', chance: '0.1%' },
  { id: 'dsc', label: 'СКИДКА 50%', rarity: 'epic', chance: '0.5%' },
  { id: 'bon', label: '200 БОНУСОВ', rarity: 'rare', chance: '5%' },
  { id: 'min', label: '50 БОНУСОВ', rarity: 'common', chance: '20%' },
  { id: 'off', label: 'СКИДКА 5%', rarity: 'common', chance: '25%' },
];

export const PrizeTicker = ({ highlightId }: PrizeTickerProps) => {
  return (
    <div className="w-full flex flex-col gap-2 p-4">
      {PRIZES.map((prize) => {
        const isHighlighted = highlightId === prize.id;
        const isLegendary = prize.rarity === 'legendary';

        return (
          <motion.div
            key={prize.id}
            initial={false}
            animate={{
              scale: isHighlighted ? 1.05 : 1,
              opacity: isHighlighted ? 1 : 0.5,
              x: isHighlighted ? 10 : 0,
              backgroundColor: isHighlighted ? 'rgba(212, 175, 55, 0.1)' : 'transparent'
            }}
            className={`
              relative p-3 border-l-2 flex justify-between items-center
              ${isLegendary ? 'border-[var(--roulette-danger)]' : 'border-[var(--roulette-gold)]'}
              ${isHighlighted ? 'shadow-[0_0_15px_rgba(212,175,55,0.2)]' : ''}
            `}
          >
            <div className="flex flex-col">
              <span className={`text-xs font-bold tracking-widest ${isLegendary ? 'text-[var(--roulette-danger)]' : 'text-[var(--roulette-text)]'}`}>
                {prize.label}
              </span>
              <span className="text-[8px] font-mono opacity-50 uppercase">
                КЛАСС: {prize.rarity} // ШАНС: {prize.chance}
              </span>
            </div>

            {isHighlighted && (
              <motion.div
                layoutId="indicator"
                className="w-2 h-2 bg-[var(--roulette-hacker)] rounded-full shadow-[0_0_5px_#0F0]"
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
