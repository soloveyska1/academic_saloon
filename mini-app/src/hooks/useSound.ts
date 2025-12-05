import { useCallback, useRef, useEffect } from 'react';

type SoundType = 'click' | 'heavy_latch' | 'turbine' | 'glitch' | 'success' | 'error';

export const useSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Cleanup only
    return () => {
      try {
        audioContextRef.current?.close();
      } catch (e) {
        console.error('AudioContext close failed:', e);
      }
    };
  }, []);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        }
      } catch (e) {
        console.error('AudioContext init failed:', e);
      }
    }

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().catch((e: unknown) => console.error('Audio resume failed:', e));
    }
  }, []);

  const playSound = useCallback((type: SoundType) => {
    // Ensure initialized
    if (!audioContextRef.current) {
      initAudio();
    }

    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => { });
    }

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'click':
        // High-pitch tech chirp
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'heavy_latch':
        // Low-frequency thud
        osc.type = 'square';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.3);
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'turbine':
        // Rising sine wave
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(800, now + 2.0); // 2s spin up
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.5);
        gainNode.gain.linearRampToValueAtTime(0, now + 2.0);
        osc.start(now);
        osc.stop(now + 2.0);
        break;

      case 'glitch':
        // White noise burst logic requires a buffer usually, but using random frequency saw also works for cheap glitch
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, now);
        // Rapid frequency changes
        for (let i = 0; i < 10; i++) {
          osc.frequency.setValueAtTime(100 + Math.random() * 1000, now + i * 0.02);
        }
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;

      case 'success':
        // Heavenly chord
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C major
        freqs.forEach(f => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.value = f;
          g.gain.setValueAtTime(0.1, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
          o.start(now);
          o.stop(now + 1.5);
        });
        break;

      case 'error':
        // Low buzz "Wrong" sound
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
    }
  }, []);

  return { playSound, initAudio };
};
