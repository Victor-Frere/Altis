import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TrainerAthlete } from "./AthleteSelector";

interface AddAthleteModalProps {
  client: SupabaseClient;
  onAdded: (athlete: TrainerAthlete) => void;
  onClose: () => void;
}

function isTrainerAthlete(value: unknown): value is TrainerAthlete {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "athlete_id" in value &&
    typeof value.athlete_id === "string" &&
    "username" in value &&
    typeof value.username === "string" &&
    "edit_consent" in value &&
    typeof value.edit_consent === "boolean" &&
    "status" in value &&
    (value.status === "pending" || value.status === "accepted")
  );
}

function getErrorMessage(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }

  return "Une erreur inattendue est survenue pendant l’ajout de l’athlète.";
}

export function AddAthleteModal({
  client,
  onAdded,
  onClose,
}: AddAthleteModalProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const normalizedUsername = username.trim().toLowerCase();
      const { data, error: addError } = await client.rpc(
        "add_trainer_athlete_by_username",
        { target_username: normalizedUsername },
      );

      if (addError) {
        throw addError;
      }

      if (!Array.isArray(data) || !isTrainerAthlete(data[0])) {
        throw new Error("La réponse reçue pour l’ajout de l’athlète est invalide.");
      }

      onAdded(data[0]);
    } catch (addError) {
      const errorDetails =
        typeof addError === "object" && addError !== null
          ? {
              code: "code" in addError ? addError.code : undefined,
              message: getErrorMessage(addError),
              details: "details" in addError ? addError.details : undefined,
              hint: "hint" in addError ? addError.hint : undefined,
            }
          : { message: getErrorMessage(addError) };

      console.error("Échec de add_trainer_athlete_by_username", errorDetails);
      setError(errorDetails.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-labelledby="add-athlete-title"
        aria-modal="true"
        className="altis-card relative w-full max-w-md p-6 shadow-xl"
        role="dialog"
      >
        <h2 className="text-xl font-semibold" id="add-athlete-title">
          Ajouter un athlète
        </h2>
        <p className="altis-muted-text mt-1 text-sm">
          Saisissez l’identifiant exact du compte à rattacher.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="athlete-username">
              Identifiant
            </label>
            <input
              autoComplete="off"
              className="w-full rounded-md px-3 py-2"
              id="athlete-username"
              maxLength={32}
              minLength={3}
              onChange={(event) => setUsername(event.target.value)}
              pattern="[A-Za-z0-9._-]{3,32}"
              required
              value={username}
            />
          </div>

          {error && (
            <p aria-live="polite" className="altis-error-text text-sm" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              className="altis-secondary-button rounded-md px-3 py-2 text-sm"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Annuler
            </button>
            <button
              className="altis-primary-button rounded-md px-3 py-2 text-sm disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Recherche…" : "Ajouter"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
