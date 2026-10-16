import { useMemo, useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BottomNav, type MobileSection } from "./components/BottomNav";
import { Header, type AppView } from "./components/Header";
import { ThemeToggle } from "./components/ThemeToggle";
import { AuthModal } from "./features/auth/AuthModal";
import { useAuth } from "./features/auth/useAuth";
import { TrainingPlan } from "./features/plan/TrainingPlan";
import {
  AthleteSelector,
  type TrainerAthlete,
} from "./features/trainer/AthleteSelector";
import { TrainerAccessManagement } from "./features/trainer/TrainerAccessManagement";

function SupabaseApp({ client }: { client: SupabaseClient }) {
  const auth = useAuth(client);
  const [viewMode, setViewMode] = useState<AppView>("athlete");
  const [mobileSection, setMobileSection] = useState<MobileSection>("plan");
  const [selectedAthlete, setSelectedAthlete] = useState<TrainerAthlete | null>(null);

  if (auth.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p aria-live="polite" className="text-sm text-slate-600 dark:text-slate-400">
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
        <p aria-live="polite" className="altis-error-text max-w-lg text-center text-sm" role="alert">
          {auth.error ?? "Le profil de ce compte n’est pas disponible."}
        </p>
        <button
          className="altis-secondary-button rounded-md px-3 py-2 text-sm font-medium"
          disabled={auth.isSubmitting}
          onClick={() => void auth.signOut()}
          type="button"
        >
          Se déconnecter
        </button>
      </main>
    );
  }

  const navigateToSection = (section: MobileSection) => {
    setMobileSection(section);
    if (section === "plan") {
      setViewMode("athlete");
    } else if (section === "athletes") {
      setViewMode("trainer");
    } else if (section === "my-trainers") {
      setViewMode("my-trainers");
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        activeView={viewMode}
        auth={auth}
        onViewChange={(view) => {
          setViewMode(view);
          setMobileSection(
            view === "athlete"
              ? "plan"
              : view === "trainer"
                ? "athletes"
                : "my-trainers",
          );
        }}
      />
      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24 sm:p-6 sm:pb-24 md:pb-6">
        {mobileSection === "home" ? (
          <section className="altis-card space-y-5 p-5 sm:p-8">
            <div>
              <p className="altis-muted-text text-sm font-medium">Tableau de bord ALTIS</p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                Bonjour, {auth.profile.username}
              </h1>
              <p className="altis-muted-text mt-2">
                Retrouvez votre plan d’entraînement et le suivi de vos athlètes.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="altis-card flex items-center gap-4 p-4 text-left transition hover:border-altis-gold"
                onClick={() => navigateToSection("plan")}
                type="button"
              >
                <CalendarDays aria-hidden="true" className="text-altis-navy dark:text-altis-gold" />
                <span>
                  <span className="block font-semibold">Mon Plan</span>
                  <span className="altis-muted-text mt-1 block text-sm">
                    Consulter et modifier mes séances
                  </span>
                </span>
              </button>
              <button
                className="altis-card flex items-center gap-4 p-4 text-left transition hover:border-altis-gold"
                onClick={() => navigateToSection("athletes")}
                type="button"
              >
                <Users aria-hidden="true" className="text-altis-navy dark:text-altis-gold" />
                <span>
                  <span className="block font-semibold">Mes Athlètes</span>
                  <span className="altis-muted-text mt-1 block text-sm">
                    Accéder au suivi des athlètes liés
                  </span>
                </span>
              </button>
            </div>
          </section>
        ) : mobileSection === "profile" ? (
          <section aria-labelledby="profile-title" className="altis-card space-y-5 p-5 sm:p-8">
            <div>
              <p className="altis-muted-text text-sm font-medium">Compte</p>
              <h1 className="mt-2 text-2xl font-bold" id="profile-title">
                Profil et réglages
              </h1>
            </div>
            <div className="altis-panel flex flex-wrap items-center justify-between gap-4 rounded-xl p-4">
              <div>
                <p className="altis-muted-text text-sm">Connecté en tant que</p>
                <p className="mt-1 font-semibold">{auth.profile.username}</p>
              </div>
              <button
                className="altis-secondary-button rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                disabled={auth.isSubmitting}
                onClick={() => void auth.signOut()}
                type="button"
              >
                Déconnexion
              </button>
            </div>
            <button
              className="altis-card flex w-full items-center justify-between gap-4 p-4 text-left transition hover:border-altis-gold"
              onClick={() => navigateToSection("my-trainers")}
              type="button"
            >
              <span>
                <span className="block font-semibold">Mes entraîneurs</span>
                <span className="altis-muted-text mt-1 block text-sm">
                  Gérer les demandes et les accès à votre plan
                </span>
              </span>
              <Users aria-hidden="true" className="text-altis-navy dark:text-altis-gold" />
            </button>
            <div className="altis-panel flex items-center justify-between gap-4 rounded-xl p-4">
              <div>
                <p className="font-semibold">Apparence</p>
                <p className="altis-muted-text mt-1 text-sm">
                  Choisissez le mode Jour ou Nuit.
                </p>
              </div>
              <ThemeToggle />
            </div>
          </section>
        ) : mobileSection === "my-trainers" ? (
          <TrainerAccessManagement
            athleteId={auth.profile.id}
            client={client}
          />
        ) : mobileSection === "plan" ? (
          <>
            <TrainingPlan
              athleteId={auth.profile.id}
              client={client}
              isAthleteOwner
              viewerId={auth.profile.id}
            />
          </>
        ) : (
          <>
            <AthleteSelector
              client={client}
              onSelect={setSelectedAthlete}
              selectedAthleteId={selectedAthlete?.athlete_id ?? null}
            />
            {selectedAthlete && (
              <TrainingPlan
                athleteId={selectedAthlete.athlete_id}
                athleteName={selectedAthlete.username}
                client={client}
                isAthleteOwner={false}
                viewerId={auth.profile.id}
              />
            )}
          </>
        )}
      </main>
      <BottomNav
        activeSection={mobileSection}
        onNavigate={navigateToSection}
      />
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
        <p className="altis-error-text max-w-lg text-center text-sm" role="alert">
          Configuration Supabase manquante. Définissez VITE_SUPABASE_URL et
          VITE_SUPABASE_ANON_KEY dans votre environnement Vite local.
        </p>
      </main>
    );
  }

  return <SupabaseApp client={client} />;
}
