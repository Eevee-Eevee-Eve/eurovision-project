'use client';

import { useEffect, useState } from "react";

export type DeviceTier = "phone" | "tablet" | "desktop";

export function getDeviceTier(width: number): DeviceTier {
  if (width < 768) {
    return "phone";
  }

  if (width < 1024) {
    return "tablet";
  }

  return "desktop";
}

export function useDeviceTier() {
  const [tier, setTier] = useState<DeviceTier | null>(null);

  useEffect(() => {
    const updateTier = () => {
      setTier(getDeviceTier(window.innerWidth));
    };

    updateTier();
    window.addEventListener("resize", updateTier);

    return () => {
      window.removeEventListener("resize", updateTier);
    };
  }, []);

  return {
    tier,
    isReady: tier !== null,
    isPhone: tier === "phone",
    isTablet: tier === "tablet",
    isDesktop: tier === "desktop",
  };
}
