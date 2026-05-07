'use client';

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string | null;
  alt: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!src) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, src]);

  if (!mounted || !src) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-black/82 p-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/16 focus:outline-none focus:ring-2 focus:ring-arenaBeam/45 md:right-5 md:top-5 md:h-12 md:w-12"
          aria-label="Close image"
        >
          <X size={19} />
        </button>
        <motion.img
          src={src}
          alt={alt}
          width={1600}
          height={1200}
          className="max-h-[86svh] max-w-[94vw] rounded-[1.2rem] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          onClick={(event) => event.stopPropagation()}
        />
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
