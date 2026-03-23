'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchSessionAccount } from "../lib/api";
import type { AccountProfile, PasswordResetMode } from "../lib/types";

const AccountContext = createContext<{
  account: AccountProfile | null;
  loading: boolean;
  passwordResetMode: PasswordResetMode;
  setAccount: (account: AccountProfile | null) => void;
  refreshAccount: () => Promise<AccountProfile | null>;
} | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordResetMode, setPasswordResetMode] = useState<PasswordResetMode>("disabled");

  async function refreshAccount() {
    try {
      const payload = await fetchSessionAccount();
      setAccount(payload.account);
      setPasswordResetMode(payload.passwordResetMode);
      return payload.account;
    } catch (error) {
      console.error(error);
      setAccount(null);
      setPasswordResetMode("disabled");
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAccount();
  }, []);

  const value = useMemo(() => ({
    account,
    loading,
    passwordResetMode,
    setAccount,
    refreshAccount,
  }), [account, loading, passwordResetMode]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within AccountProvider");
  }
  return context;
}
