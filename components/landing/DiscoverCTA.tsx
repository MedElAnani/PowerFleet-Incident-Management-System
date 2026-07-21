'use client';

import React, { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUpRight,
  Droplet,
  Building2,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';

function GlowingBorderCard({
  children,
  className,
  glowColor,
  repeatingGradient,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  glowColor: string;
  repeatingGradient: string;
}>) {
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
      className={`bg-slate-200 dark:bg-slate-800 relative rounded-2xl p-[2px] ${className || ''}`}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 40%)`,
        }}
      />

      <div className="bg-white dark:bg-slate-950 relative z-10 h-full overflow-hidden rounded-2xl">
        <div
          className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-50"
          style={{ background: repeatingGradient }}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-white/80 dark:to-slate-950/80" />

        <div className="relative z-20 flex h-full flex-col p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function DiscoverCTA() {
  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12">

          {/* Left Text Content */}
          <div className="flex flex-col gap-8 lg:col-span-5">
            <div className="inline-flex">
              <Badge
                variant="secondary"
                className="flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-sm bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-none"
              >
                <Sparkles className="h-4 w-4" />
                <span className="font-medium">Proven Results</span>
              </Badge>
            </div>

            <h2 className="text-slate-900 dark:text-white text-5xl leading-[1.05] font-bold tracking-tight md:text-6xl">
              Transform your <br className="hidden md:block" />
              fleet ops
            </h2>

            <p className="text-slate-600 dark:text-slate-400 max-w-md text-lg leading-relaxed">
              Harness real-time data to automate incident management, reduce fuel consumption, and empower your dispatchers to move at the speed of thought.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a 
                href="https://www.powerfleet.ma/"
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-500 text-white hover:bg-emerald-600 inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-sm font-semibold transition-colors shadow-lg shadow-emerald-500/20"
              >
                Discover PowerFleet.ma
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Right Glowing Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
            
            {/* Card 1 */}
            <GlowingBorderCard
              glowColor="rgba(16, 185, 129, 0.8)"
              repeatingGradient="repeating-linear-gradient(45deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.15) 15px, transparent 15px, transparent 30px)"
            >
              <div>
                <div className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mb-6 flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm">
                  <Droplet className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="text-slate-900 dark:text-white mb-2 text-5xl font-bold tracking-tight flex items-baseline">
                  -30<span className="text-slate-500 dark:text-slate-400 ml-1 text-3xl">%</span>
                </div>
                <h3 className="text-slate-900 dark:text-white mb-2 text-base font-semibold">
                  Fuel reduction
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm leading-relaxed">
                Extended idling, detours, siphoning — every leak is detected and stopped.
              </p>
            </GlowingBorderCard>

            {/* Card 2 */}
            <GlowingBorderCard
              glowColor="rgba(59, 130, 246, 0.8)"
              repeatingGradient="repeating-linear-gradient(-45deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.15) 15px, transparent 15px, transparent 30px)"
            >
              <div>
                <div className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mb-6 flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-slate-900 dark:text-white mb-2 text-5xl font-bold tracking-tight flex items-baseline">
                  850<span className="text-slate-500 dark:text-slate-400 ml-1 text-3xl">+</span>
                </div>
                <h3 className="text-slate-900 dark:text-white mb-2 text-base font-semibold">
                  Businesses equipped
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm leading-relaxed">
                Transport, distribution, construction, ambulances — across Morocco.
              </p>
            </GlowingBorderCard>

            {/* Card 3 */}
            <GlowingBorderCard
              glowColor="rgba(249, 115, 22, 0.8)"
              repeatingGradient="repeating-linear-gradient(45deg, rgba(249, 115, 22, 0.15), rgba(249, 115, 22, 0.15) 15px, transparent 15px, transparent 30px)"
            >
              <div>
                <div className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mb-6 flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </div>
                <div className="text-slate-900 dark:text-white mb-2 text-5xl font-bold tracking-tight flex items-baseline">
                  <span className="text-slate-500 dark:text-slate-400 mr-1 text-3xl">×</span>2
                </div>
                <h3 className="text-slate-900 dark:text-white mb-2 text-base font-semibold">
                  Field productivity
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm leading-relaxed">
                Missions assigned, tracked, and confirmed from a single dashboard.
              </p>
            </GlowingBorderCard>

            {/* Card 4 */}
            <GlowingBorderCard
              glowColor="rgba(168, 85, 247, 0.8)"
              repeatingGradient="repeating-linear-gradient(-45deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.15) 15px, transparent 15px, transparent 30px)"
            >
              <div>
                <div className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mb-6 flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm">
                  <Clock className="h-5 w-5 text-purple-500" />
                </div>
                <div className="text-slate-900 dark:text-white mb-2 text-5xl font-bold tracking-tight">
                  Day 30
                </div>
                <h3 className="text-slate-900 dark:text-white mb-2 text-base font-semibold">
                  Return on investment
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm leading-relaxed">
                Our clients see concrete savings from their very first month of use.
              </p>
            </GlowingBorderCard>

          </div>
        </div>
      </div>
    </div>
  );
}
