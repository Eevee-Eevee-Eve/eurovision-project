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

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.documentElement.style.overscrollBehavior = "none";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.width = previousBodyWidth;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      window.scrollTo(0, scrollY);
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
            className="fixed inset-0 z-[80] bg-black/60 overscroll-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[90] flex items-end justify-center p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-12 pointer-events-none md:items-center md:p-5">
            <motion.div
              className="show-card pointer-events-auto flex max-h-full w-full flex-col overflow-hidden rounded-[1.8rem] shadow-[0_24px_60px_rgba(0,0,0,0.42)] md:max-h-[min(92vh,58rem)] md:max-w-[min(92vw,62rem)] md:rounded-[2rem] md:shadow-[0_24px_80px_rgba(0,0,0,0.45)] xl:max-w-[min(88vw,74rem)]"
              initial={{ y: "100%", opacity: 0.92 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.92 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="shrink-0 border-b border-white/6 bg-[linear-gradient(180deg,rgba(17,18,34,0.99),rgba(17,18,34,0.92))] px-4 pb-3 pt-3 md:px-6 md:pt-4">
                <div className="flex justify-center pb-3">
                  <div className="h-1.5 w-16 rounded-full bg-white/10" />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="z-20 inline-flex min-h-[3rem] min-w-[3rem] items-center justify-center rounded-full border border-white/12 bg-[#23253b]/95 p-0 text-white shadow-[0_8px_24px_rgba(0,0,0,0.24)] transition hover:bg-[#2b2d46] hover:text-white focus:outline-none focus:ring-2 focus:ring-arenaBeam/40 active:scale-[0.98]"
                    aria-label="Close details"
                  >
                    <X size={18} className="pointer-events-none" />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-[max(5rem,calc(env(safe-area-inset-bottom)+2.5rem))] pt-4 touch-pan-y [-webkit-overflow-scrolling:touch] md:px-6 md:pb-10 md:pt-5">
                <div className="relative z-10">{children}</div>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
    ,
    document.body,
  );
}
