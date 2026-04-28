import { Suspense } from "react";
import { AccountStudio } from "../../components/AccountStudio";
import { SiteHeader } from "../../components/SiteHeader";

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-28 pt-6 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-5xl gap-5">
        <SiteHeader />
        <Suspense fallback={<div className="show-card p-6 text-sm text-arenaMuted">Загружаю аккаунт...</div>}>
          <AccountStudio />
        </Suspense>
      </div>
    </main>
  );
}
