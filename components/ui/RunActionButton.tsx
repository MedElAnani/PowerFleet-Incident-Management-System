"use client";

import React from "react";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { Loader2, Check, AlertCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export type RunActionState = "idle" | "loading" | "success" | "error";

interface RunActionButtonProps extends HTMLMotionProps<"button"> {
  status: RunActionState;
  idleText?: string;
  successText?: string;
  errorText?: string;
  onRun?: () => void;
  className?: string;
}

export default function RunActionButton({
  status,
  idleText = "Submit Incident",
  successText = "Created",
  errorText = "Failed",
  onRun,
  className,
  disabled,
  type = "submit",
  ...props
}: RunActionButtonProps) {
  return (
    <motion.button
      type={type}
      disabled={disabled || status === "loading" || status === "success"}
      onClick={onRun}
      initial={false}
      animate={{
        width: status === "idle" || status === "error" ? "100%" : 140,
        backgroundColor:
          status === "success"
            ? "#10b981" // emerald-500
            : status === "error"
            ? "#ef4444" // red-500
            : "#10b981", // emerald-500 for idle/loading
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "relative flex h-12 items-center justify-center overflow-hidden rounded-xl font-semibold text-white shadow-lg transition-shadow",
        status === "idle" && "hover:shadow-emerald-500/25 shadow-emerald-500/10 hover:-translate-y-0.5",
        status === "error" && "shadow-red-500/25",
        className
      )}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <Send className="size-4" />
            <span>{idleText}</span>
          </motion.div>
        )}

        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <Loader2 className="size-6 animate-spin" />
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <Check className="size-5" />
            <span>{successText}</span>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <AlertCircle className="size-5" />
            <span>{errorText}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
