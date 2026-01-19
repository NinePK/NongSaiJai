"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

type Props = {
  open: boolean;
  state: "idle" | "saving" | "success" | "error";
  title?: string;
  message?: string;
};

export function SaveOverlay({ open, state, title, message }: Props) {
  const icon =
    state === "saving" ? (
      <Loader2 className="h-8 w-8 animate-spin" />
    ) : state === "success" ? (
      <CheckCircle2 className="h-9 w-9" />
    ) : (
      <XCircle className="h-9 w-9" />
    );

  const heading =
    title ??
    (state === "saving"
      ? "กำลังบันทึก..."
      : state === "success"
      ? "บันทึกสำเร็จ"
      : "บันทึกไม่สำเร็จ");

  const desc =
    message ??
    (state === "saving"
      ? "โปรดรอสักครู่"
      : state === "success"
      ? "ระบบได้บันทึกข้อมูลเรียบร้อยแล้ว"
      : "กรุณาลองใหม่อีกครั้ง");

  return (
    <AnimatePresence>
      {open && (
       <motion.div
  className="fixed inset-0 z-[9999] flex items-center justify-center"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            className="relative w-[360px] max-w-[92vw] rounded-2xl border bg-white/95 dark:bg-slate-950/92 p-6 shadow-2xl"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full border ${
                  state === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : state === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                    : "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200"
                }`}
              >
                {icon}
              </div>

              <div className="text-base font-semibold">{heading}</div>
              <div className="text-sm text-muted-foreground">{desc}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
