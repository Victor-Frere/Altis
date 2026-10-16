import { useEffect, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

interface TrainerConsent {
  trainer_id: string;
  edit_consent: boolean;
  trainer: {
    username: string;
  } | null;
}

type ConsentToggleProps =
  | {
      client: SupabaseClient;
      mode: "athlete";
      athleteId: string;
    }
  | {
      mode: "trainer";
      editConsent: boolean;
      children: ReactNode;
    };

function isTrainerConsent(value: unknown): value is TrainerConsent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const trainer = "trainer" in value ? value.trainer : null;
  return (
    "trainer_id" in value &&
    typeof value.trainer_id === "string" &&
    "edit_consent" in value &&
    typeof value.edit_consent === "boolean" &&
    typeof trainer === "object" &&
    trainer !== null &&
    "username" in trainer &&
    typeof trainer.username === "string"
  );
}

function AthleteConsentControls({
  client,
  athleteId,
}: {
  client: SupabaseClient;
  athleteId: string;
}) {
  const [trainers, setTrainers] = useState<TrainerConsent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingTrainerId, setPendingTrainerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTrainers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: loadError } = await client
          .from("trainer_athletes")
          .select(
            "trainer_id, edit_consent, trainer:profiles!trainer_athletes_trainer_id_fkey(username)",
          )
          .eq("athlete_id", athleteId);

        if (loadError) {
          throw loadError;
        }
        if (!Array.isArray(data) || !data.every(isTrainerConsent)) {
          throw new Error("Les relations entraîneur-athlète reçues sont invalides.");
        }
        if (isMounted) {
          setTrainers(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les consentements.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTrainers();
    return () => {
      isMounted = false;
    };
  }, [athleteId, client]);

  const updateConsent = async (trainerId: string, editConsent: boolean) => {
    setPendingTrainerId(trainerId);
    setError(null);

    try {
      const { data, error: updateError } = await client
        .from("trainer_athletes")
        .update({ edit_consent: editConsent })
        .eq("trainer_id", trainerId)
        .eq("athlete_id", athleteId)
        .select("trainer_id");

      if (updateError) {
        throw updateError;
      }
      if (!data || data.length !== 1) {
        throw new Error(
          "Le consentement n’a pas été modifié. Vérifiez la relation avec l’entraîneur.",
        );
      }

      setTrainers((current) =>
        current.map((trainer) =>
          trainer.trainer_id === trainerId
            ? { ...trainer, edit_consent: editConsent }
            : trainer,
        ),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Impossible de modifier le consentement.",
      );
    } finally {
      setPendingTrainerId(null);
    }
  };

  const removeTrainer = async (trainerId: string) => {
    setPendingTrainerId(trainerId);
    setError(null);

    try {
      const { data, error: deleteError } = await client
        .from("trainer_athletes")
        .delete()
        .eq("trainer_id", trainerId)
        .eq("athlete_id", athleteId)
        .select("trainer_id");

      if (deleteError) {
        throw deleteError;
      }
      if (!data || data.length !== 1) {
        throw new Error("Le lien avec cet entraîneur n’a pas pu être retiré.");
      }

      setTrainers((current) =>
        current.filter((trainer) => trainer.trainer_id !== trainerId),
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Impossible de retirer cet entraîneur.",
      );
    } finally {
      setPendingTrainerId(null);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-600">Chargement des consentements…</p>;
  }

  return (
    <section aria-labelledby="trainer-consent-title" className="space-y-3">
      <h2 className="text-sm font-semibold" id="trainer-consent-title">
        Demandes des entraîneurs
      </h2>

      {trainers.length === 0 ? (
        <p className="text-sm text-gray-600">Aucun entraîneur n’est encore lié à votre compte.</p>
      ) : (
        trainers.map((trainer) => (
          <div
            className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-gray-200 p-3"
            key={trainer.trainer_id}
          >
            <div>
              <p className="text-sm">
                L’entraîneur @{trainer.trainer.username} souhaite accéder à votre plan.
              </p>
              <label className="mt-2 inline-flex items-center gap-2 text-sm">
                <input
                  checked={trainer.edit_consent}
                  disabled={pendingTrainerId !== null}
                  onChange={(event) =>
                    void updateConsent(trainer.trainer_id, event.target.checked)
                  }
                  type="checkbox"
                />
                Autoriser la modification du plan
              </label>
            </div>
            <button
              className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pendingTrainerId !== null}
              onClick={() => void removeTrainer(trainer.trainer_id)}
              type="button"
            >
              {pendingTrainerId === trainer.trainer_id ? "Mise à jour…" : "Retirer"}
            </button>
          </div>
        ))
      )}

      {error && (
        <p aria-live="polite" className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

export function ConsentToggle(props: ConsentToggleProps) {
  if (props.mode === "trainer") {
    if (!props.editConsent) {
      return (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Consultation uniquement : l’athlète n’a pas autorisé la modification de son plan.
        </p>
      );
    }

    return <>{props.children}</>;
  }

  return <AthleteConsentControls client={props.client} athleteId={props.athleteId} />;
}
