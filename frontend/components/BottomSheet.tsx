'use client';

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lockedScrollY = useRef(0);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const previousHtmlTouchAction = document.documentElement.style.touchAction;
    lockedScrollY.current = window.scrollY || window.pageYOffset || 0;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.touchAction = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY.current}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.documentElement.style.touchAction = "none";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    const resetScroll = () => scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    resetScroll();
    const frameId = window.requestAnimationFrame(resetScroll);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.body.style.touchAction = previousBodyTouchAction;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.width = previousBodyWidth;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      document.documentElement.style.touchAction = previousHtmlTouchAction;
      window.removeEventListener("keydown", handleEscape);
      window.cancelAnimationFrame(frameId);
      window.scrollTo({ top: lockedScrollY.current, behavior: "auto" });
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
          <div className="fixed inset-0 z-[90] flex items-end justify-center overflow-hidden overscroll-none p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] pointer-events-none md:items-center md:p-5">
            <motion.div
              className="pointer-events-auto relative flex h-[calc(100svh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] max-h-[calc(100svh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] w-full flex-col overflow-hidden rounded-[1.8rem] border border-white/6 bg-[linear-gradient(180deg,rgba(21,23,43,0.985),rgba(16,17,31,0.985))] shadow-[0_24px_60px_rgba(0,0,0,0.42)] md:h-auto md:max-h-[min(92vh,58rem)] md:max-w-[min(92vw,62rem)] md:rounded-[2rem] md:shadow-[0_24px_80px_rgba(0,0,0,0.45)] xl:max-w-[min(88vw,74rem)]"
              initial={{ y: "100%", opacity: 0.92 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.92 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
              >
                <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center md:top-4">
                  <div className="h-1.5 w-16 rounded-full bg-white/10" />
                </div>
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white shadow-[0_8px_24px_rgba(0,0,0,0.24)] transition hover:bg-white/[0.075] hover:text-white focus:outline-none focus:ring-2 focus:ring-arenaBeam/40 active:scale-[0.98] md:right-4 md:top-4 md:h-14 md:w-14"
                aria-label="Close details"
                >
                  <X size={18} className="pointer-events-none" />
                </button>
                <div
                  ref={scrollRef}
                  data-sheet-scroll
                  className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(7rem,calc(env(safe-area-inset-bottom)+4.5rem))] pt-16 touch-auto [-webkit-overflow-scrolling:touch] md:px-6 md:pb-10 md:pt-[5.5rem]"
                  style={{
                    WebkitOverflowScrolling: "touch",
                    overscrollBehaviorY: "contain",
                    touchAction: "pan-y",
                  }}
                >
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
