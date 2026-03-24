'use client';

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[80] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[90] flex items-end justify-center pointer-events-none md:items-center md:p-5">
            <motion.div
              className="show-card pointer-events-auto w-full max-h-[92svh] overflow-y-auto overscroll-y-contain rounded-t-[2rem] rounded-b-none p-5 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.25rem))] shadow-[0_-20px_60px_rgba(0,0,0,0.45)] md:max-h-[min(92vh,58rem)] md:max-w-[min(92vw,62rem)] md:rounded-[2rem] md:p-6 md:pb-8 md:shadow-[0_24px_80px_rgba(0,0,0,0.45)] xl:max-w-[min(88vw,74rem)]"
              initial={{ y: "100%", opacity: 0.92 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.92 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-center justify-center bg-[linear-gradient(180deg,rgba(17,18,34,0.98),rgba(17,18,34,0.88),transparent)] px-5 pb-3 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-5">
                <div className="mx-auto h-1.5 w-16 rounded-full bg-white/10" />
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-4 top-2 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-[#23253b]/95 text-white shadow-[0_8px_24px_rgba(0,0,0,0.24)] transition hover:bg-[#2b2d46] hover:text-white focus:outline-none focus:ring-2 focus:ring-arenaBeam/40 active:scale-[0.98] md:right-5 md:top-3"
                  aria-label="Close details"
                >
                  <X size={18} className="pointer-events-none" />
                </button>
              </div>
              <div className="relative z-10">{children}</div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
    ,
    document.body,
  );
}
