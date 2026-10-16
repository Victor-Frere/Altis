import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AddAthleteModal } from "./AddAthleteModal";

export interface TrainerAthlete {
  athlete_id: string;
  username: string;
  edit_consent: boolean;
  status: "pending" | "accepted";
}

interface AthleteSelectorProps {
  client: SupabaseClient;
  selectedAthleteId: string | null;
  onSelect: (athlete: TrainerAthlete | null) => void;
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

export function AthleteSelector({
  client,
  selectedAthleteId,
  onSelect,
}: AthleteSelectorProps) {
  const [athletes, setAthletes] = useState<TrainerAthlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAthletes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: loadError } = await client.rpc("list_my_trainer_athletes");
      if (loadError) {
        throw loadError;
      }

      if (!Array.isArray(data) || !data.every(isTrainerAthlete)) {
        throw new Error("La liste des athlètes reçue est invalide.");
      }

      setAthletes(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger la liste des athlètes.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void loadAthletes();
  }, [loadAthletes]);

  const handleAthleteAdded = (athlete: TrainerAthlete) => {
    if (athlete.status === "pending") {
      setNotice(`Demande envoyée à @${athlete.username} ; en attente d’acceptation.`);
      setIsAddModalOpen(false);
      return;
    }

    setAthletes((current) => {
      const existing = current.find((item) => item.athlete_id === athlete.athlete_id);
      if (existing) {
        return current;
      }
      return [...current, athlete].sort((left, right) =>
        left.username.localeCompare(right.username),
      );
    });
    onSelect(athlete);
    setIsAddModalOpen(false);
  };

  const selectedAthlete = athletes.find(
    (athlete) => athlete.athlete_id === selectedAthleteId,
  );

  return (
    <section aria-label="Sélection de l’athlète" className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="athlete-selector">
            Athlète
          </label>
          <select
            className="w-full rounded-md px-3 py-2"
            disabled={isLoading}
            id="athlete-selector"
            onChange={(event) => {
              const athlete =
                athletes.find((item) => item.athlete_id === event.target.value) ?? null;
              onSelect(athlete);
            }}
            value={selectedAthlete?.athlete_id ?? ""}
          >
            <option value="">
              {isLoading ? "Chargement…" : "Sélectionner un athlète"}
            </option>
            {athletes.map((athlete) => (
              <option key={athlete.athlete_id} value={athlete.athlete_id}>
                {athlete.username}
              </option>
            ))}
          </select>
        </div>
        <button
          className="altis-primary-button rounded-md px-3 py-2 text-sm"
          onClick={() => setIsAddModalOpen(true)}
          type="button"
        >
          Ajouter un athlète
        </button>
      </div>

      {error && (
        <p aria-live="polite" className="altis-error-text text-sm" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p aria-live="polite" className="altis-success-text text-sm" role="status">
          {notice}
        </p>
      )}

      {isAddModalOpen && (
        <AddAthleteModal
          client={client}
          onAdded={handleAthleteAdded}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </section>
  );
}
