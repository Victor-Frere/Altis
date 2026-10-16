import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Header, type AppView } from "./components/Header";
import { AuthModal } from "./features/auth/AuthModal";
import { useAuth } from "./features/auth/useAuth";
import { ConsentToggle } from "./features/plan/ConsentToggle";
import {
  AthleteSelector,
  type TrainerAthlete,
} from "./features/trainer/AthleteSelector";

function SupabaseApp({ client }: { client: SupabaseClient }) {
  const auth = useAuth(client);
  const [viewMode, setViewMode] = useState<AppView>("athlete");
  const [selectedAthlete, setSelectedAthlete] = useState<TrainerAthlete | null>(null);

  if (auth.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p aria-live="polite" className="text-sm text-gray-600">
          Chargement de votre session…
        </p>
      </main>
    );
  }

  if (!auth.session) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <AuthModal auth={auth} />
      </main>
    );
  }

  if (!auth.profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p aria-live="polite" className="max-w-lg text-center text-sm text-red-700" role="alert">
          {auth.error ?? "Le profil de ce compte n’est pas disponible."}
        </p>
        <button
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium"
          disabled={auth.isSubmitting}
          onClick={() => void auth.signOut()}
          type="button"
        >
          Se déconnecter
        </button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        activeView={viewMode}
        auth={auth}
        onViewChange={setViewMode}
      />
      <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        {viewMode === "athlete" ? (
          <>
            <ConsentToggle
              athleteId={auth.profile.id}
              client={client}
              mode="athlete"
            />
            <section
              aria-label="Mon plan d’entraînement"
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <p>Affichage du plan d'entraînement ici</p>
            </section>
          </>
        ) : (
          <>
            <AthleteSelector
              client={client}
              onSelect={setSelectedAthlete}
              selectedAthleteId={selectedAthlete?.athlete_id ?? null}
            />
            {selectedAthlete && (
              <section
                aria-label={`Plan d’entraînement de ${selectedAthlete.username}`}
                className="space-y-4 rounded-xl border border-gray-200 bg-white p-6"
              >
                <ConsentToggle
                  editConsent={selectedAthlete.edit_consent}
                  mode="trainer"
                >
                  <p className="text-sm text-green-800">
                    Le consentement autorise la modification du plan.
                  </p>
                </ConsentToggle>
                <p>Affichage du plan de l'athlète sélectionné ici</p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;
  const client = useMemo(
    () =>
      VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY
        ? createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
        : null,
    [VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY],
  );

  if (!client) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="max-w-lg text-center text-sm text-red-700" role="alert">
          Configuration Supabase manquante. Définissez VITE_SUPABASE_URL et
          VITE_SUPABASE_ANON_KEY dans votre environnement Vite local.
        </p>
      </main>
    );
  }

  return <SupabaseApp client={client} />;
}
