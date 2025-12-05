import { motion } from 'framer-motion';

interface PrizeTickerProps {
  highlightId: string | null;
}

const PRIZES = [
  { id: 'dip', label: 'ДИПЛОМНАЯ РАБОТА', rarity: 'legendary', chance: '0.1%' },
  { id: 'dsc', label: 'СКИДКА 50%', rarity: 'epic', chance: '0.5%' },
  { id: 'bon', label: '200 БОНУСОВ', rarity: 'rare', chance: '5%' },
  { id: 'min', label: '50 БОНУСОВ', rarity: 'common', chance: '20%' },
  { id: 'off', label: 'СКИДКА 5%', rarity: 'common', chance: '25%' },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 50 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 50,
      damping: 20
    }
  }
};

export const PrizeTicker = ({ highlightId }: PrizeTickerProps) => {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-50px" }}
      className="w-full flex flex-col gap-4 p-4 pb-32" // Added padding-bottom for scroll space
    >
      {PRIZES.map((prize) => {
        const isHighlighted = highlightId === prize.id;
        const isLegendary = prize.rarity === 'legendary';

        return (
          <motion.div
            key={prize.id}
            variants={item}
            className={`
              glass-panel relative p-6 rounded-xl flex justify-between items-center
              transition-all duration-500
              ${isHighlighted ? 'border-[var(--r-gold-300)] shadow-[0_0_30px_rgba(212,175,55,0.3)] scale-105' : 'border-[var(--r-glass-border)]'}
            `}
          >
            {/* Left Accent Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${isLegendary ? 'bg-[var(--r-danger)]' : 'bg-[var(--r-gold-500)]'}`}></div>

            <div className="flex flex-col pl-4">
              <span className={`text-sm font-bold tracking-widest font-serif metallic-text`}>
                {prize.label}
              </span>
              <span className="text-[9px] font-sans text-[var(--r-text-secondary)] uppercase mt-1 tracking-wider">
                КЛАСС: {prize.rarity} // ШАНС: {prize.chance}
              </span>
            </div>

            {/* Icon / Status */}
            <div className="w-8 h-8 rounded-full border border-[var(--r-gold-700)] flex items-center justify-center bg-[var(--r-bg-deep)] shadow-inner">
              {isHighlighted ? (
                <motion.div layoutId="active-dot" className="w-2 h-2 bg-[var(--r-hacker)] rounded-full shadow-[0_0_5px_#0F0]" />
              ) : (
                <div className="w-1 h-1 bg-[var(--r-gold-700)] rounded-full opacity-50" />
              )}
            </div>

          </motion.div>
        );
      })}
    </motion.div>
  );
};
