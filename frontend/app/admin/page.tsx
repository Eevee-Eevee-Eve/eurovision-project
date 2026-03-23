import { Suspense } from "react";
import { AdminControlRoom } from "../../components/AdminControlRoom";

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="show-card mx-4 mt-6 p-6 text-sm text-arenaMuted md:mx-8">Загружаю пульт...</div>}>
      <AdminControlRoom />
    </Suspense>
  );
}
