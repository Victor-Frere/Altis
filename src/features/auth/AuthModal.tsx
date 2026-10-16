import { useState, type FormEvent } from "react";
import type { AuthController } from "./useAuth";

interface AuthModalProps {
  auth: AuthController;
  onClose?: () => void;
}

type AuthMode = "signIn" | "signUp";

export function AuthModal({ auth, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isSignUp = mode === "signUp";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    auth.clearError();

    const succeeded = isSignUp
      ? await auth.signUp(username, password)
      : await auth.signIn(username, password);

    if (succeeded) {
      onClose?.();
    }
  };

  const switchMode = () => {
    setMode(isSignUp ? "signIn" : "signUp");
    auth.clearError();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
    >
      <section
        aria-labelledby="auth-modal-title"
        aria-modal="true"
        className="altis-card relative w-full max-w-md p-6 shadow-xl"
        role="dialog"
      >
        <h2 className="text-xl font-semibold" id="auth-modal-title">
          {isSignUp ? "Créer un compte" : "Connexion"}
        </h2>
        <p className="altis-muted-text mt-1 text-sm">
          {isSignUp
            ? "Inscrivez-vous avec un identifiant et un mot de passe."
            : "Connectez-vous avec votre identifiant et votre mot de passe."}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="auth-username">
              Identifiant
            </label>
            <input
              autoComplete="username"
              className="w-full rounded-md px-3 py-2"
              id="auth-username"
              maxLength={32}
              minLength={3}
              onChange={(event) => setUsername(event.target.value)}
              pattern="[A-Za-z0-9._-]{3,32}"
              required
              value={username}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="auth-password">
              Mot de passe
            </label>
            <input
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="w-full rounded-md px-3 py-2"
              id="auth-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          {auth.error && (
            <p aria-live="polite" className="altis-error-text text-sm" role="alert">
              {auth.error}
            </p>
          )}

          <button
            className="altis-primary-button w-full rounded-md px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={auth.isSubmitting}
            type="submit"
          >
            {auth.isSubmitting
              ? "Veuillez patienter…"
              : isSignUp
                ? "S’inscrire"
                : "Se connecter"}
          </button>
        </form>

        <p className="altis-muted-text mt-4 text-center text-sm">
          {isSignUp ? "Déjà inscrit ?" : "Pas encore de compte ?"}{" "}
          <button
            className="font-medium text-altis-navy underline hover:text-slate-600 dark:text-altis-gold dark:hover:text-altis-gold-hover"
            disabled={auth.isSubmitting}
            onClick={switchMode}
            type="button"
          >
            {isSignUp ? "Se connecter" : "Créer un compte"}
          </button>
        </p>

        {onClose && (
          <button
            aria-label="Fermer"
            className="absolute right-4 top-4 rounded p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-altis-marble"
            onClick={onClose}
            type="button"
          >
            Fermer
          </button>
        )}
      </section>
    </div>
  );
}
