import { useCallback, useEffect, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import {
  createTrainingWeek,
  parseTrainingWeeks,
  type TrainingPlanRecord,
  type TrainingWeek,
} from "./trainingPlanTypes";

interface UseTrainingPlanOptions {
  client: SupabaseClient;
  athleteId: string;
  viewerId: string;
  isAthleteOwner: boolean;
}

interface TrainingPlanState {
  record: TrainingPlanRecord | null;
  weeks: TrainingWeek[];
  isEditable: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveWeeks: (weeks: TrainingWeek[]) => Promise<boolean>;
}

const EMPTY_WEEKS: TrainingWeek[] = [];

function parsePlanRecord(value: unknown): TrainingPlanRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !("weeks" in value)
  ) {
    throw new Error("Le plan d’entraînement reçu depuis Supabase est invalide.");
  }

  return { id: value.id, weeks: parseTrainingWeeks(value.weeks) };
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Une erreur inattendue est survenue lors du chargement du plan.";
}

export function useTrainingPlan({
  client,
  athleteId,
  viewerId,
  isAthleteOwner,
}: UseTrainingPlanOptions): TrainingPlanState {
  const [record, setRecord] = useState<TrainingPlanRecord | null>(null);
  const [isEditable, setIsEditable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlan = useCallback(async (): Promise<{
    record: TrainingPlanRecord | null;
    isEditable: boolean;
  }> => {
    let canEdit = isAthleteOwner;
    if (!isAthleteOwner) {
      const { data: relationship, error: relationshipError } = await client
        .from("trainer_athletes")
        .select("edit_consent")
        .eq("trainer_id", viewerId)
        .eq("athlete_id", athleteId)
        .maybeSingle();

      if (relationshipError) {
        throw relationshipError;
      }
      if (!relationship) {
        throw new Error("Vous n’êtes pas lié à cet athlète.");
      }
      canEdit = relationship.edit_consent === true;
    }

    const { data, error: planError } = await client
      .from("training_plans")
      .select("id, weeks")
      .eq("athlete_id", athleteId)
      .limit(1)
      .maybeSingle();

    if (planError) {
      throw planError;
    }

    let nextRecord = data ? parsePlanRecord(data) : null;
    if (!nextRecord && isAthleteOwner) {
      const initialWeeks = [createTrainingWeek(1)];
      const { data: createdPlan, error: createError } = await client
        .from("training_plans")
        .insert({ athlete_id: athleteId, weeks: initialWeeks })
        .select("id, weeks")
        .single();

      if (createError) {
        if (createError.code !== "23505") {
          throw createError;
        }

        const { data: existingPlan, error: existingPlanError } = await client
          .from("training_plans")
          .select("id, weeks")
          .eq("athlete_id", athleteId)
          .limit(1)
          .maybeSingle();

        if (existingPlanError) {
          throw existingPlanError;
        }
        if (!existingPlan) {
          throw createError;
        }
        nextRecord = parsePlanRecord(existingPlan);
      } else {
        nextRecord = parsePlanRecord(createdPlan);
      }
    }

    return { record: nextRecord, isEditable: canEdit };
  }, [athleteId, client, isAthleteOwner, viewerId]);

  useEffect(() => {
    let isMounted = true;
    setRecord(null);
    setIsEditable(false);
    setIsLoading(true);
    setError(null);

    let latestLoad = 0;
    const runLoad = async () => {
      const requestId = ++latestLoad;
      try {
        const loadedPlan = await loadPlan();
        if (isMounted && requestId === latestLoad) {
          setRecord(loadedPlan.record);
          setIsEditable(loadedPlan.isEditable);
          setError(null);
        }
      } catch (loadError) {
        if (isMounted && requestId === latestLoad) {
          setError(getErrorMessage(loadError));
          setRecord(null);
          setIsEditable(false);
        }
      } finally {
        if (isMounted && requestId === latestLoad) {
          setIsLoading(false);
        }
      }
    };

    const channel: RealtimeChannel = client
      .channel(`training-plan-${athleteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_plans",
          filter: `athlete_id=eq.${athleteId}`,
        },
        () => {
          void runLoad();
        },
      );

    if (!isAthleteOwner) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trainer_athletes",
          filter: `trainer_id=eq.${viewerId}`,
        },
        (payload) => {
          const changedAthleteId =
            "athlete_id" in payload.new
              ? payload.new.athlete_id
              : "athlete_id" in payload.old
                ? payload.old.athlete_id
                : null;
          if (changedAthleteId === athleteId) {
            void runLoad();
          }
        },
      );
    }

    channel.subscribe((status, subscribeError) => {
      if (
        isMounted &&
        subscribeError &&
        (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
      ) {
        setError(`La synchronisation temps réel a échoué : ${subscribeError.message}`);
      }
    });

    void runLoad();

    return () => {
      isMounted = false;
      void client.removeChannel(channel);
    };
  }, [athleteId, client, isAthleteOwner, loadPlan, viewerId]);

  const saveWeeks = useCallback(
    async (weeks: TrainingWeek[]): Promise<boolean> => {
      if (!isEditable || !record) {
        setError("Ce plan est en lecture seule.");
        return false;
      }

      setIsSaving(true);
      setError(null);
      try {
        const { data, error: saveError } = await client
          .from("training_plans")
          .update({ weeks })
          .eq("id", record.id)
          .eq("athlete_id", athleteId)
          .select("id, weeks")
          .single();

        if (saveError) {
          throw saveError;
        }

        const savedRecord = parsePlanRecord(data);
        setRecord(savedRecord);
        return true;
      } catch (saveError) {
        setError(getErrorMessage(saveError));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [athleteId, client, isEditable, record],
  );

  return {
    record,
    weeks: record?.weeks ?? EMPTY_WEEKS,
    isEditable,
    isLoading,
    isSaving,
    error,
    saveWeeks,
  };
}
