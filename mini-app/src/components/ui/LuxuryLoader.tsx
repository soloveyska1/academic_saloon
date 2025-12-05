import { motion } from 'framer-motion';

export const LuxuryLoader = () => {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Rotating Ring */}
      <div className="relative w-16 h-16">
        {/* Outer Ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: '#D4AF37',
            borderRightColor: 'rgba(212, 175, 55, 0.3)',
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            ease: 'linear',
            repeat: Infinity,
          }}
        />

        {/* Inner Ring */}
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-transparent"
          style={{
            borderBottomColor: '#FCF6BA',
            borderLeftColor: 'rgba(252, 246, 186, 0.3)',
          }}
          animate={{ rotate: -360 }}
          transition={{
            duration: 2,
            ease: 'linear',
            repeat: Infinity,
          }}
        />

        {/* Center Dot */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{
            duration: 1.5,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #D4AF37, #FCF6BA)',
              boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)',
            }}
          />
        </motion.div>
      </div>

      {/* Loading Text */}
      <motion.p
        className="text-xs tracking-[0.3em] uppercase"
        style={{ color: 'rgba(212, 175, 55, 0.6)' }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{
          duration: 2,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      >
        Загрузка
      </motion.p>
    </div>
  );
};
