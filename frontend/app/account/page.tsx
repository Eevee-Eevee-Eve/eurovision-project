import { Suspense } from "react";
import { AccountStudio } from "../../components/AccountStudio";
import { BrandLogo } from "../../components/BrandLogo";
import LanguageSwitcher from "../../components/LanguageSwitcher";

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-28 pt-6 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-5xl gap-5">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo variant="header" />
          <LanguageSwitcher />
        </div>
        <Suspense fallback={<div className="show-card p-6 text-sm text-arenaMuted">Загружаю аккаунт...</div>}>
          <AccountStudio />
        </Suspense>
      </div>
    </main>
  );
}
