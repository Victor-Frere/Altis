import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, ShieldCheck, UserRoundX, X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

type TrainerStatus = "pending" | "accepted";

interface TrainerRelationship {
  trainer_id: string;
  username: string;
  edit_consent: boolean;
  status: TrainerStatus;
}

function normalizeTrainerRelationship(value: unknown): TrainerRelationship | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  if (
    !("trainer_id" in value) ||
    typeof value.trainer_id !== "string" ||
    !("edit_consent" in value) ||
    typeof value.edit_consent !== "boolean" ||
    !("status" in value) ||
    (value.status !== "pending" && value.status !== "accepted") ||
    !("trainer" in value)
  ) {
    return null;
  }

  const relation = value.trainer;
  const trainer = Array.isArray(relation) ? relation[0] ?? null : relation;
  if (
    typeof trainer !== "object" ||
    trainer === null ||
    !("username" in trainer) ||
    typeof trainer.username !== "string"
  ) {
    return null;
  }

  return {
    trainer_id: value.trainer_id,
    username: trainer.username,
    edit_consent: value.edit_consent,
    status: value.status,
  };
}

export function TrainerAccessManagement({
  client,
  athleteId,
}: {
  client: SupabaseClient;
  athleteId: string;
}) {
  const [trainers, setTrainers] = useState<TrainerRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingTrainerId, setPendingTrainerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadTrainers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: loadError } = await client
        .from("trainer_athletes")
        .select(
          "trainer_id, edit_consent, status, trainer:profiles!trainer_athletes_trainer_id_fkey(username)",
        )
        .eq("athlete_id", athleteId)
        .order("status", { ascending: true });

      if (loadError) {
        throw loadError;
      }
      if (!Array.isArray(data)) {
        throw new Error("La liste des entraîneurs reçue est invalide.");
      }

      const normalizedTrainers: TrainerRelationship[] = [];
      for (const value of data) {
        const trainer = normalizeTrainerRelationship(value);
        if (!trainer) {
          throw new Error("La liste des entraîneurs reçue est invalide.");
        }
        normalizedTrainers.push(trainer);
      }
      setTrainers(normalizedTrainers);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger la liste des entraîneurs.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [athleteId, client]);

  useEffect(() => {
    void loadTrainers();
  }, [loadTrainers]);

  const updateRelationship = async (
    trainerId: string,
    values: { edit_consent: boolean } | { status: TrainerStatus },
    successMessage: string,
  ) => {
    setPendingTrainerId(trainerId);
    setError(null);
    setNotice(null);
    try {
      const { data, error: updateError } = await client
        .from("trainer_athletes")
        .update(values)
        .eq("trainer_id", trainerId)
        .eq("athlete_id", athleteId)
        .select("trainer_id");

      if (updateError) {
        throw updateError;
      }
      if (!data || data.length !== 1) {
        throw new Error("La mise à jour de l’accès entraîneur a échoué.");
      }

      setTrainers((current) =>
        current.map((trainer) =>
          trainer.trainer_id === trainerId
            ? { ...trainer, ...values }
            : trainer,
        ),
      );
      setNotice(successMessage);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Impossible de modifier l’accès entraîneur.",
      );
    } finally {
      setPendingTrainerId(null);
    }
  };

  const removeTrainer = async (trainer: TrainerRelationship) => {
    setPendingTrainerId(trainer.trainer_id);
    setError(null);
    setNotice(null);
    try {
      const { data, error: deleteError } = await client
        .from("trainer_athletes")
        .delete()
        .eq("trainer_id", trainer.trainer_id)
        .eq("athlete_id", athleteId)
        .select("trainer_id");

      if (deleteError) {
        throw deleteError;
      }
      if (!data || data.length !== 1) {
        throw new Error("Le lien avec cet entraîneur n’a pas pu être retiré.");
      }

      setTrainers((current) =>
        current.filter((item) => item.trainer_id !== trainer.trainer_id),
      );
      setNotice(
        trainer.status === "pending"
          ? `La demande de @${trainer.username} a été refusée.`
          : `L’accès de @${trainer.username} a été retiré.`,
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

  const pendingTrainers = trainers.filter((trainer) => trainer.status === "pending");
  const activeTrainers = trainers.filter((trainer) => trainer.status === "accepted");

  if (isLoading) {
    return (
      <p aria-live="polite" className="altis-card p-6 text-sm" role="status">
        Chargement des entraîneurs…
      </p>
    );
  }

  return (
    <section aria-labelledby="trainer-access-title" className="space-y-6">
      <header>
        <p className="altis-muted-text text-sm font-medium">Autorisations</p>
        <h1 className="mt-1 text-2xl font-bold" id="trainer-access-title">
          Mes entraîneurs
        </h1>
        <p className="altis-muted-text mt-2 text-sm">
          Validez les demandes et gérez l’accès à votre plan d’entraînement.
        </p>
      </header>

      {error && (
        <p aria-live="polite" className="altis-error-panel text-sm" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p aria-live="polite" className="altis-success-panel rounded-md p-3 text-sm" role="status">
          {notice}
        </p>
      )}

      {trainers.length === 0 && (
        <p className="altis-card border-dashed p-8 text-center text-sm">
          Aucun entraîneur n’a accès à votre plan pour le moment.
        </p>
      )}

      {pendingTrainers.length > 0 && (
        <section aria-labelledby="pending-trainers-title" className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold" id="pending-trainers-title">
            <Clock3 aria-hidden="true" className="text-altis-gold" size={20} />
            Demandes en attente
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
              {pendingTrainers.length}
            </span>
          </h2>
          {pendingTrainers.map((trainer) => (
            <article className="altis-card space-y-4 p-4 sm:p-5" key={trainer.trainer_id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    L’entraîneur @{trainer.username} souhaite accéder à votre plan.
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                    En attente
                  </span>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={trainer.edit_consent}
                  disabled={pendingTrainerId !== null}
                  onChange={(event) =>
                    void updateRelationship(
                      trainer.trainer_id,
                      { edit_consent: event.target.checked },
                      "Les autorisations de modification ont été mises à jour.",
                    )
                  }
                  type="checkbox"
                />
                Autoriser la modification du plan
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className="altis-primary-button inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={pendingTrainerId !== null}
                  onClick={() =>
                    void updateRelationship(
                      trainer.trainer_id,
                      { status: "accepted" },
                      `La demande de @${trainer.username} a été acceptée.`,
                    )
                  }
                  type="button"
                >
                  <Check aria-hidden="true" size={16} />
                  {pendingTrainerId === trainer.trainer_id ? "Mise à jour…" : "Accepter"}
                </button>
                <button
                  className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-400/50 dark:text-red-300 dark:hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={pendingTrainerId !== null}
                  onClick={() => void removeTrainer(trainer)}
                  type="button"
                >
                  <X aria-hidden="true" className="mr-1 inline" size={16} />
                  Refuser
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {activeTrainers.length > 0 && (
        <section aria-labelledby="active-trainers-title" className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold" id="active-trainers-title">
            <ShieldCheck aria-hidden="true" className="text-altis-gold" size={20} />
            Entraîneurs autorisés
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {activeTrainers.length}
            </span>
          </h2>
          {activeTrainers.map((trainer) => (
            <article
              className="altis-card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5"
              key={trainer.trainer_id}
            >
              <div>
                <p className="font-semibold">@{trainer.username}</p>
                <span className="mt-2 inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 dark:bg-green-500/15 dark:text-green-200">
                  Accès autorisé
                </span>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    checked={trainer.edit_consent}
                    disabled={pendingTrainerId !== null}
                    onChange={(event) =>
                      void updateRelationship(
                        trainer.trainer_id,
                        { edit_consent: event.target.checked },
                        "Les autorisations de modification ont été mises à jour.",
                      )
                    }
                    type="checkbox"
                  />
                  Autoriser la modification du plan
                </label>
              </div>
              <span className="altis-muted-text text-sm">
                {trainer.edit_consent ? "Édition autorisée" : "Lecture seule"}
              </span>
              <button
                className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-400/50 dark:text-red-300 dark:hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={pendingTrainerId !== null}
                onClick={() => void removeTrainer(trainer)}
                type="button"
              >
                <UserRoundX aria-hidden="true" className="mr-1 inline" size={16} />
                Retirer l’accès
              </button>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
