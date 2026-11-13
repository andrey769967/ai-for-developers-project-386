import { useState } from "react";
import { GuestPage } from "./pages/GuestPage";
import { OwnerPage } from "./pages/OwnerPage";

type View = "guest" | "owner";

export default function App() {
  const [view, setView] = useState<View>("guest");

  return (
    <div className="min-h-screen">
      <nav className="bg-indigo-600 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Запись на звонок</h1>
          <div className="flex gap-1">
            <button
              onClick={() => setView("guest")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === "guest"
                  ? "bg-white text-indigo-600"
                  : "text-indigo-100 hover:bg-indigo-500"
              }`}
            >
              Запись
            </button>
            <button
              onClick={() => setView("owner")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === "owner"
                  ? "bg-white text-indigo-600"
                  : "text-indigo-100 hover:bg-indigo-500"
              }`}
            >
              Календарь владельца
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {view === "guest" ? <GuestPage /> : <OwnerPage />}
      </main>
    </div>
  );
}