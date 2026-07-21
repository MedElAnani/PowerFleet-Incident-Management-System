"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { Observer } from "gsap/Observer";
import { ChevronDown } from "lucide-react";

import BentoFeatures from "@/components/auth/BentoFeatures";
import SlidingAuth from "@/components/auth/SlidingAuth";
import DiscoverCTA from "@/components/landing/DiscoverCTA";
import Footer from "@/components/layout/Footer";
import { RevealSection } from "@/components/reveal-section";

gsap.registerPlugin(useGSAP, ScrollToPlugin, Observer);

/*
This helper function makes a group of elements animate along the x-axis in a seamless, responsive loop.
*/
/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const, @typescript-eslint/no-unused-expressions */
function horizontalLoop(items: any, config: any) {
  items = gsap.utils.toArray(items);
  config = config || {};
  let tl = gsap.timeline({repeat: config.repeat, paused: config.paused, defaults: {ease: "none"}, onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100)}),
    length = items.length,
    startX = items[0].offsetLeft,
    times: number[] = [],
    widths: number[] = [],
    xPercents: number[] = [],
    curIndex = 0,
    pixelsPerSecond = (config.speed || 1) * 100,
    snap = config.snap === false ? (v: any) => v : gsap.utils.snap(config.snap || 1),
    totalWidth, curX, distanceToStart, distanceToLoop, item, i;
  gsap.set(items, {
    xPercent: (i, el) => {
      let w = widths[i] = Number.parseFloat(gsap.getProperty(el, "width", "px") as string);
      xPercents[i] = snap(Number.parseFloat(gsap.getProperty(el, "x", "px") as string) / w * 100 + (gsap.getProperty(el, "xPercent") as number));
      return xPercents[i];
    }
  });
  gsap.set(items, {x: 0});
  totalWidth = items[length-1].offsetLeft + xPercents[length-1] / 100 * widths[length-1] - startX + items[length-1].offsetWidth * (gsap.getProperty(items[length-1], "scaleX") as number) + (Number.parseFloat(config.paddingRight) || 0);
  for (i = 0; i < length; i++) {
    item = items[i];
    curX = xPercents[i] / 100 * widths[i];
    distanceToStart = item.offsetLeft + curX - startX;
    distanceToLoop = distanceToStart + widths[i] * (gsap.getProperty(item, "scaleX") as number);
    tl.to(item, {xPercent: snap((curX - distanceToLoop) / widths[i] * 100), duration: distanceToLoop / pixelsPerSecond}, 0)
      .fromTo(item, {xPercent: snap((curX - distanceToLoop + totalWidth) / widths[i] * 100)}, {xPercent: xPercents[i], duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond, immediateRender: false}, distanceToLoop / pixelsPerSecond)
      .add("label" + i, distanceToStart / pixelsPerSecond);
    times[i] = distanceToStart / pixelsPerSecond;
  }
  function toIndex(index: number, vars?: any) {
    vars = vars || {};
    (Math.abs(index - curIndex) > length / 2) && (index += index > curIndex ? -length : length); // always go in the shortest direction
    let newIndex = gsap.utils.wrap(0, length, index),
      time = times[newIndex];
    if (time > tl.time() !== index > curIndex) { // if we're wrapping the timeline's playhead, make the proper adjustments
      vars.modifiers = {time: gsap.utils.wrap(0, tl.duration())};
      time += tl.duration() * (index > curIndex ? 1 : -1);
    }
    curIndex = newIndex;
    vars.overwrite = true;
    return tl.tweenTo(time, vars);
  }
  (tl as any).next = (vars: any) => toIndex(curIndex+1, vars);
  (tl as any).previous = (vars: any) => toIndex(curIndex-1, vars);
  (tl as any).current = () => curIndex;
  (tl as any).toIndex = (index: number, vars: any) => toIndex(index, vars);
  (tl as any).times = times;
  tl.progress(1, true).progress(0, true);
  if (config.reversed) {
    if (tl.vars.onReverseComplete) {
      tl.vars.onReverseComplete();
    }
    tl.reverse();
  }
  return tl;
}
/* eslint-enable @typescript-eslint/no-explicit-any, prefer-const, @typescript-eslint/no-unused-expressions */

export default function LandingPage() {
  const container = useRef<HTMLDivElement>(null);
  const authSectionRef = useRef<HTMLDivElement>(null);

  // Initial load animations scoped to the container
  useGSAP(() => {
    // Hero Animations
    gsap.from(".hero-title", {
      y: 100,
      opacity: 0,
      duration: 1.2,
      ease: "power4.out",
      stagger: 0.2,
    });

    // Arrow bounce animation
    gsap.to(".bounce-arrow", {
      y: 15,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
      duration: 1,
    });

    // Horizontal Loop Marquee
    const scrollingText = gsap.utils.toArray('.rail p');
    const tl = horizontalLoop(scrollingText, {
      repeat: -1,
      paddingRight: 30,
    });

    Observer.create({
      target: window,
      type: "wheel,touch,pointer",
      onChangeY: (self) => {
        let factor = 2.5;
        if (self.deltaY < 0) {
          factor *= -1;
        } 
        gsap.timeline({
          defaults: {
            ease: "none",
          }
        })
          .to(tl, { timeScale: factor * 2.5, duration: 0.2, overwrite: true })
          .to(tl, { timeScale: factor / 2.5, duration: 1 }, "+=0.3");
      }
    });
  }, { scope: container });

  // Use contextSafe for click handlers to ensure proper GSAP cleanup
  const { contextSafe } = useGSAP({ scope: container });

  // eslint-disable-next-line react-hooks/refs
  const scrollToAuth = contextSafe(() => {
    if (authSectionRef.current) {
      gsap.to(window, {
        duration: 1,
        scrollTo: authSectionRef.current,
        ease: "power3.inOut"
      });
    }
  });

  return (
    <div ref={container} className="bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Hero Section */}
      <section 
        className="relative h-screen flex flex-col items-center justify-center text-center px-4 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/hero-bg.png")' }}
      >
        <div className="absolute inset-0 bg-slate-950/60 z-0"></div>
        
        <div className="relative z-10 flex flex-col items-center w-full">
          <h1 className="hero-title text-5xl md:text-8xl font-extrabold tracking-tighter text-white mb-6">
            POWER FLEET <span className="text-emerald-400">IMS</span>
          </h1>
          
          <div className="hero-title w-full overflow-hidden mt-4">
            <div className="rail flex flex-nowrap items-center w-full">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <p key={i} className="text-xl md:text-4xl text-slate-300 font-bold tracking-widest whitespace-nowrap pr-[30px] uppercase">
                  Next-generation incident management system for your entire fleet.
                </p>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={scrollToAuth}
          className="bounce-arrow absolute bottom-12 flex flex-col items-center gap-2 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer z-10"
        >
          <span className="text-sm font-medium uppercase tracking-widest">Get Started</span>
          <ChevronDown size={32} />
        </button>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <RevealSection className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
              Everything you need to manage your fleet
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Power Fleet IMS brings dispatchers, mechanics, and drivers together on a single, secure platform.
            </p>
          </div>
          <BentoFeatures />
        </RevealSection>
      </section>

      {/* Auth Section */}
      <section ref={authSectionRef} className="min-h-screen flex flex-col items-center justify-center px-4 py-32 bg-slate-50 dark:bg-slate-950 gap-20 overflow-hidden">
        <SlidingAuth />
        {/* Discover PowerFleet CTA */}
        <DiscoverCTA />
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
