"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
}

interface InlineDisclosureMenuProps {
  actions: MenuAction[];
}

export default function InlineDisclosureMenu({ actions }: InlineDisclosureMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!actions || actions.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center size-8 rounded-lg transition-colors",
          isOpen
            ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:text-slate-300 dark:hover:bg-slate-800/50"
        )}
      >
        <MoreHorizontal className="size-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl z-50 origin-top-right"
          >
            <div className="flex flex-col gap-0.5">
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left",
                    action.destructive
                      ? "text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <action.icon className="size-4" />
                  {action.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
