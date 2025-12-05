import { motion } from 'framer-motion';

export const LuxuryLoader = () => {
    // "The Golden Seal" - Rotating Typographic Emblem
    // Uses SVG textPath for perfect circular typography

    return (
        <div className="flex items-center justify-center w-full h-screen bg-[#050505] overflow-hidden">
            <div className="relative flex items-center justify-center">

                {/* 1. Ambient Glow (Behind) */}
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.15)_0%,transparent_70%)] blur-2xl scale-150" />

                {/* 2. Rotating Text Ring */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 10,
                        ease: "linear",
                        repeat: Infinity
                    }}
                    className="relative z-10 w-48 h-48"
                >
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                        <defs>
                            {/* Gold Gradient Definition */}
                            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#BF953F" />
                                <stop offset="50%" stopColor="#FCF6BA" />
                                <stop offset="100%" stopColor="#B38728" />
                            </linearGradient>
                        </defs>

                        {/* Circular Path for Text (Invisible) */}
                        <path
                            id="circlePath"
                            d="M 100, 100 m -75, 0 a 75,75 0 1,1 150,0 a 75,75 0 1,1 -150,0"
                            fill="none"
                        />

                        {/* The Text Itself */}
                        <text className="font-serif text-[13px] font-bold tracking-[0.25em] uppercase">
                            <textPath
                                href="#circlePath"
                                startOffset="0%"
                                fill="url(#goldGradient)"
                                textLength="470"
                            >
                                ACADEMIC • SALOON • ACADEMIC • SALOON •
                            </textPath>
                        </text>
                    </svg>
                </motion.div>

                {/* 3. Center Monogram "AS" */}
                <motion.div
                    className="absolute z-20 flex flex-col items-center justify-center"
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{
                        duration: 3,
                        ease: "easeInOut",
                        repeat: Infinity
                    }}
                >
                    <div className="relative">
                        {/* Monogram Text */}
                        <h1 className="font-serif text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] drop-shadow-lg">
                            AS
                        </h1>

                        {/* Subtle Inner Ring */}
                        <div className="absolute inset-[-12px] rounded-full border border-[rgba(252,246,186,0.3)]" />
                    </div>
                </motion.div>

            </div>
        </div>
    );
};
