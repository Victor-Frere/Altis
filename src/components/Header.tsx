import type { AuthController } from "../features/auth/useAuth";
import { ThemeToggle } from "./ThemeToggle";

export type AppView = "athlete" | "trainer" | "my-trainers";

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
    <header className="border-b border-slate-200 bg-white px-4 py-3 transition-colors duration-200 dark:border-slate-800 dark:bg-altis-card-dark">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <nav aria-label="Navigation principale" className="hidden gap-2 md:flex" role="tablist">
          <button
            aria-selected={activeView === "athlete"}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activeView === "athlete"
                ? "altis-selected font-bold"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-altis-marble"
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
                ? "altis-selected font-bold"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-altis-marble"
            }`}
            onClick={() => onViewChange("trainer")}
            role="tab"
            type="button"
          >
            Mes Athlètes
          </button>
          <button
            aria-selected={activeView === "my-trainers"}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activeView === "my-trainers"
                ? "altis-selected font-bold"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-altis-marble"
            }`}
            onClick={() => onViewChange("my-trainers")}
            role="tab"
            type="button"
          >
            Mes entraîneurs
          </button>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <span className="text-sm text-slate-800 dark:text-altis-marble">{auth.profile.username}</span>
          <button
            className="altis-secondary-button rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
            disabled={auth.isSubmitting}
            onClick={() => void auth.signOut()}
            type="button"
          >
            Déconnexion
          </button>
        </div>
        <span className="font-bold tracking-[0.2em] text-altis-navy dark:text-altis-marble md:hidden">
          ALTIS
        </span>
      </div>

      {auth.error && (
        <p aria-live="polite" className="altis-error-text mx-auto mt-3 max-w-6xl text-sm" role="alert">
          {auth.error}
        </p>
      )}
    </header>
  );
}
