'use client';

import { AnimatePresence, motion } from "framer-motion";
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
          <motion.div
            className="show-card fixed inset-x-0 bottom-0 z-[90] max-h-[88svh] overflow-y-auto overscroll-y-contain rounded-t-[2rem] rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,0.45)] pointer-events-auto md:inset-x-6 md:bottom-6 md:mx-auto md:max-h-[88vh] md:max-w-4xl md:rounded-[2rem] md:p-6 md:shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-center justify-center bg-[linear-gradient(180deg,rgba(17,18,34,0.96),rgba(17,18,34,0.82),transparent)] px-5 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-5">
              <div className="mx-auto h-1.5 w-16 rounded-full bg-white/10" />
              <button
                type="button"
                onClick={onClose}
                className="absolute right-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:right-6"
                aria-label="Close details"
              >
                ×
              </button>
            </div>
            <div className="relative z-10">{children}</div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
    ,
    document.body,
  );
}
