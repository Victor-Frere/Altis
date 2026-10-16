import type { AuthController } from "../features/auth/useAuth";

export type AppView = "athlete" | "trainer";

interface HeaderProps {
  auth: AuthController;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

export function Header({ auth, activeView, onViewChange }: HeaderProps) {
  if (!auth.profile) {
    return null;
  }

  return (
    <header className="border-b border-gray-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <nav aria-label="Navigation principale" className="flex gap-2" role="tablist">
          <button
            aria-selected={activeView === "athlete"}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activeView === "athlete"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => onViewChange("athlete")}
            role="tab"
            type="button"
          >
            Mon Plan
          </button>
          <button
            aria-selected={activeView === "trainer"}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activeView === "trainer"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => onViewChange("trainer")}
            role="tab"
            type="button"
          >
            Mes Athlètes
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-700">{auth.profile.username}</span>
          <button
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={auth.isSubmitting}
            onClick={() => void auth.signOut()}
            type="button"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {auth.error && (
        <p aria-live="polite" className="mx-auto mt-3 max-w-6xl text-sm text-red-700" role="alert">
          {auth.error}
        </p>
      )}
    </header>
  );
}
