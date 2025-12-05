import { useEffect, useState } from 'react';
import '../styles/Roulette.css';

const ACTIONS = ['ВЗЛОМАЛ СИСТЕМУ', 'ПОЛУЧИЛ ДОСТУП', 'АКТИВИРОВАЛ КОД', 'НАШЕЛ УЯЗВИМОСТЬ'];
const ASSETS = ['ДИПЛОМ ПОД КЛЮЧ', 'СКИДКА -90%', 'PREMIUM АККАУНТ', 'ДОСТУП К БАЗЕ'];
const NAMES = ['ALEX_M', 'DIMITRI_K', 'GHOST_01', 'CYBER_V', 'KATYA_R', 'SYSTEM_ADMIN'];

export const LiveWinnersTicker = () => {
  const [feed, setFeed] = useState<string[]>([]);

  useEffect(() => {
    // Hydrate initial mock data
    const initial = Array.from({ length: 5 }).map(() => generateEntry());
    setFeed(initial);

    const interval = setInterval(() => {
      setFeed(prev => [generateEntry(), ...prev.slice(0, 4)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const generateEntry = () => {
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
    return `⚡ :: ${name} :: ${action} :: ${asset}`;
  };

  return (
    <div className="absolute top-0 left-0 w-full bg-black/80 border-b border-[#D4AF37] z-50 overflow-hidden h-8 flex items-center">
      {/* Gradient overlay for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#050505] to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#050505] to-transparent z-10"></div>

      <div className="flex whitespace-nowrap animate-slide text-xs font-mono tracking-widest text-[#D4AF37]">
        {feed.map((entry, i) => (
          <span key={i} className="mx-4 opacity-80 hover:opacity-100 hover:text-[#FBF5B7] transition-colors">
            {entry}
          </span>
        ))}
      </div>

      <style>{`
                @keyframes slide {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-20%); }
                }
                .animate-slide {
                    animation: slide 10s linear infinite;
                }
            `}</style>
    </div>
  );
};
