import React, { useState, useEffect, useCallback, useRef } from "react";
import { THEME_COLORS } from "../config";

// ─── Banner data ─────────────────────────────────────────────
const SLIDES = [
  {
    id: 1,
    emoji: "🌿",
    title: "Nature's Healing Wisdom",
    subtitle: "Constitutional remedies crafted from pure botanical extracts",
    accent: "Arnica · Belladonna · Bryonia",
    bg: "from-emerald-950 via-emerald-900 to-emerald-800",
  },
  {
    id: 2,
    emoji: "💧",
    title: "Gentle. Potent. Holistic.",
    subtitle: "High-dilution remedies for chronic and acute conditions",
    accent: "Lycopodium · Sulphur · Pulsatilla",
    bg: "from-emerald-900 via-teal-800 to-teal-700",
  },
  {
    id: 3,
    emoji: "🌸",
    title: "Personalized Homeopathic Care",
    subtitle: "Every remedy matched to your unique constitutional type",
    accent: "Nux Vomica · Natrum Mur · Phosphorus",
    bg: "from-slate-900 via-emerald-900 to-emerald-800",
  },
];

const AUTO_PLAY_MS = 4200;

// ─── Component ────────────────────────────────────────────────
const BannerCarousel: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (idx: number) => {
      if (animating || idx === current) return;
      setAnimating(true);
      setTimeout(() => {
        setCurrent(idx);
        setAnimating(false);
      }, 280);
    },
    [animating, current]
  );

  // Auto-play
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, AUTO_PLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Reset timer on manual nav
  const handleDot = (idx: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    goTo(idx);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, AUTO_PLAY_MS);
  };

  const slide = SLIDES[current];

  return (
    <section
      className="relative w-full overflow-hidden rounded-2xl card-shadow"
      style={{ minHeight: "210px" }}
      aria-label="Homeopathy hero banner"
      aria-roledescription="carousel"
    >
      {/* Slide background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${slide.bg} transition-all duration-500`}
      />

      {/* Decorative circle blobs */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/8 blur-xl pointer-events-none" />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col justify-between h-full p-5 sm:p-7"
        style={{ minHeight: "210px" }}
      >
        <div
          key={slide.id}
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? "translateY(10px)" : "translateY(0)",
            transition: "opacity 0.28s ease, transform 0.28s ease",
          }}
        >
          <span
            className="text-5xl select-none"
            role="img"
            aria-label={slide.title}
          >
            {slide.emoji}
          </span>
          <h2 className="mt-3 text-[1.35rem] font-bold leading-snug text-white tracking-tight">
            {slide.title}
          </h2>
          <p className="mt-1 text-sm text-sage-200 font-medium leading-relaxed max-w-[80%]">
            {slide.subtitle}
          </p>
          <span className="mt-3 inline-block text-xs bg-white/15 text-sage-100 rounded-full px-3 py-1 font-medium tracking-wide">
            {slide.accent}
          </span>
        </div>

        {/* Slide indicator dots */}
        <div
          className="flex items-center gap-2 mt-4"
          role="tablist"
          aria-label="Slide indicators"
        >
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              id={`carousel-dot-${i}`}
              onClick={() => handleDot(i)}
              className="touch-target !min-w-0 !min-h-0 p-0"
              style={{ minWidth: "unset", minHeight: "unset", padding: "4px" }}
            >
              <span
                className="block rounded-full transition-all duration-400"
                style={{
                  width: i === current ? "24px" : "7px",
                  height: "7px",
                  background:
                    i === current ? THEME_COLORS.WHITE_ALPHA_95 : THEME_COLORS.WHITE_ALPHA_35,
                  animation:
                    i === current ? "pulse-dot 2s ease-in-out infinite" : "none",
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BannerCarousel;
