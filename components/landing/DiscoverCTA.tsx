'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ArrowUpRight, Droplet, Building2, TrendingUp, Clock } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import Bento2 from './Bento2';

function AnimatedCounter({ value, suffix = "", prefix = "" }: { value: number | string, suffix?: string, prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  
  // If the value is a number, we animate it. If it's a string (like "Day 30"), we just show it.
  const isNumber = typeof value === 'number';
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    if (inView && isNumber) {
      animate(count, value as number, { duration: 2, ease: "easeOut" });
    }
  }, [inView, isNumber, value, count]);

  return (
    <span ref={ref} className="flex items-baseline gap-0.5">
      {prefix && <span className="text-slate-400 dark:text-slate-500 text-lg font-bold">{prefix}</span>}
      <motion.span>{isNumber ? rounded : value}</motion.span>
      {suffix && <span className="text-slate-400 dark:text-slate-500 text-lg font-semibold">{suffix}</span>}
    </span>
  );
}

interface MiniBentoCardProps {
  icon: React.ReactNode;
  stat: number | string;
  statSuffix?: string;
  statPrefix?: string;
  title: string;
  description: string;
  glowColor: string;
  stripeColor: string;
  iconBg: string;
}

function MiniBentoCard({
  icon,
  stat,
  statSuffix,
  statPrefix,
  title,
  description,
  glowColor,
  stripeColor,
  iconBg,
}: Readonly<MiniBentoCardProps>) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className="relative rounded-2xl p-[1px] bg-slate-200 dark:bg-slate-800/80 transition-all duration-300 hover:shadow-md group"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(250px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 40%)`,
        }}
      />

      <div className="relative z-10 h-full w-full overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-30 transition-opacity group-hover:opacity-75"
          style={{
            background: `repeating-linear-gradient(-45deg, ${stripeColor}, ${stripeColor} 10px, transparent 10px, transparent 20px)`,
          }}
        />

        <div className="relative z-20 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-fit p-2 rounded-lg border shadow-sm ${iconBg}`}>
              {icon}
            </div>
            <h3 className="text-slate-900 dark:text-white text-sm font-bold tracking-tight">
              {title}
            </h3>
          </div>

          <div>
            <div className="text-slate-900 dark:text-white text-2xl sm:text-3xl font-extrabold tracking-tight">
              <AnimatedCounter value={stat} prefix={statPrefix} suffix={statSuffix} />
            </div>
          </div>

          <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DiscoverCTA() {
  const cards = [
    {
      icon: <Droplet className="h-4 w-4 text-emerald-500" />,
      stat: -30,
      statSuffix: "%",
      title: "Fuel reduction",
      description: "Extended idling, detours, siphoning — every leak is detected and stopped.",
      glowColor: "rgba(16, 185, 129, 0.4)",
      stripeColor: "rgba(16, 185, 129, 0.05)",
      iconBg: "bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-200/60 dark:border-emerald-800/60",
    },
    {
      icon: <Building2 className="h-4 w-4 text-blue-500" />,
      stat: 850,
      statSuffix: "+",
      title: "Businesses equipped",
      description: "Transport, distribution, construction, ambulances — across Morocco.",
      glowColor: "rgba(59, 130, 246, 0.4)",
      stripeColor: "rgba(59, 130, 246, 0.05)",
      iconBg: "bg-blue-50/80 dark:bg-blue-950/50 border-blue-200/60 dark:border-blue-800/60",
    },
    {
      icon: <TrendingUp className="h-4 w-4 text-amber-500" />,
      stat: 2,
      statPrefix: "×",
      title: "Field productivity",
      description: "Missions assigned, tracked, and confirmed from a single dashboard.",
      glowColor: "rgba(245, 158, 11, 0.4)",
      stripeColor: "rgba(245, 158, 11, 0.05)",
      iconBg: "bg-amber-50/80 dark:bg-amber-950/50 border-amber-200/60 dark:border-amber-800/60",
    },
    {
      icon: <Clock className="h-4 w-4 text-purple-500" />,
      stat: "Day 30",
      title: "Return on investment",
      description: "Our clients see concrete savings from their very first month of use.",
      glowColor: "rgba(168, 85, 247, 0.4)",
      stripeColor: "rgba(168, 85, 247, 0.05)",
      iconBg: "bg-purple-50/80 dark:bg-purple-950/50 border-purple-200/60 dark:border-purple-800/60",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 space-y-12 pb-12">
      {/* Header Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h2 className="text-slate-900 dark:text-white text-3xl md:text-5xl font-extrabold tracking-tight">
          Transform your fleet ops
        </h2>

        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed">
          Harness real-time data to automate incident management, reduce fuel consumption, and empower your dispatchers and technicians to move at the speed of thought.
        </p>
      </div>

      {/* The New Bento2 Grid */}
      <div className="w-full pt-4">
        <Bento2 />
      </div>

      {/* 4 Mini Watermelon bento-02 Blocks Inline Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl mx-auto">
        {cards.map((card) => (
          <MiniBentoCard key={card.title} {...card} />
        ))}
      </div>

      {/* Action CTA Button */}
      <div className="flex justify-center pt-8">
        <a
          href="https://www.powerfleet.ma/"
          target="_blank"
          rel="noreferrer"
          className="bg-emerald-500 text-white hover:bg-emerald-600 inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
        >
          Discover PowerFleet.ma
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
