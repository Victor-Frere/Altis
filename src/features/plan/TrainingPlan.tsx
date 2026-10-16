import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Eye,
  Lock,
  LockOpen,
  Plus,
  Settings,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TrainingProgressCharts } from "./TrainingProgressCharts";
import { useTrainingPlan } from "./useTrainingPlan";
import {
  createTrainingWeek,
  addDaysToDateString,
  formatTrainingWeekRange,
  formatTrainingDayDate,
  getMondayDateString,
  getSessionVolume,
  getTotalVolume,
  getWeekVolume,
  normalizeWeekStartDate,
  TRAINING_TYPES,
  type TrainingSession,
  type TrainingType,
  type TrainingWeek,
} from "./trainingPlanTypes";

interface TrainingPlanProps {
  client: SupabaseClient;
  athleteId: string;
  viewerId: string;
  isAthleteOwner: boolean;
  athleteName?: string;
}

type PlanMode = "view" | "edit";

function updateSession(
  weeks: TrainingWeek[],
  weekIndex: number,
  sessionIndex: number,
  update: (session: TrainingSession) => TrainingSession,
): TrainingWeek[] {
  return weeks.map((week, currentWeekIndex) =>
    currentWeekIndex === weekIndex
      ? {
          ...week,
          sessions: week.sessions.map((session, currentSessionIndex) =>
            currentSessionIndex === sessionIndex ? update(session) : session,
          ),
        }
      : week,
  );
}

function PlanViewMode({
  weeks,
}: {
  weeks: TrainingWeek[];
}) {
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const selectedWeek =
    weeks.find((week) => week.weekNumber === selectedWeekNumber) ?? weeks[0] ?? null;

  useEffect(() => {
    if (selectedWeek && selectedWeek.weekNumber !== selectedWeekNumber) {
      setSelectedWeekNumber(selectedWeek.weekNumber);
      setSelectedDayIndex(null);
    } else if (!selectedWeek) {
      setSelectedWeekNumber(null);
      setSelectedDayIndex(null);
    }
  }, [selectedWeek, selectedWeekNumber]);

  const selectedDay =
    selectedWeek && selectedDayIndex !== null
      ? selectedWeek.sessions[selectedDayIndex] ?? null
      : null;
  const weekVolume = selectedWeek ? getWeekVolume(selectedWeek) : 0;
  const maxSessionVolume = selectedWeek
    ? Math.max(0, ...selectedWeek.sessions.map(getSessionVolume))
    : 0;

  return (
    <section aria-label="Visualisation du plan" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Votre semaine</h3>
          <p className="mt-1 text-sm text-gray-600">
            Consultez les séances et leur volume sans modifier le plan.
          </p>
        </div>
        <label className="space-y-1 text-sm font-medium text-gray-700">
          Sélectionner une semaine
          <select
            className="block min-w-48 rounded-md border border-gray-300 bg-white px-3 py-2"
            disabled={weeks.length === 0}
            onChange={(event) => {
              setSelectedWeekNumber(Number(event.target.value));
              setSelectedDayIndex(null);
            }}
            value={selectedWeek?.weekNumber ?? ""}
          >
            {weeks.length === 0 && <option value="">Aucune semaine</option>}
            {weeks.map((week) => (
              <option key={week.weekNumber} value={week.weekNumber}>
                {formatTrainingWeekRange(week.date)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedWeek ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">Volume total de la semaine</p>
              <p className="mt-1 text-2xl font-semibold text-blue-950">
                {weekVolume.toFixed(1)} <span className="text-base font-medium">km</span>
              </p>
            </article>
            <article className="rounded-lg border border-violet-100 bg-violet-50 p-4">
              <p className="text-sm text-violet-800">Volume maximal sur une journée</p>
              <p className="mt-1 text-2xl font-semibold text-violet-950">
                {maxSessionVolume.toFixed(1)}{" "}
                <span className="text-base font-medium">km</span>
              </p>
            </article>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {selectedWeek.sessions.map((session, dayIndex) => {
              const isSelected = selectedDayIndex === dayIndex;
              return (
                <button
                  aria-pressed={isSelected}
                  className={`min-w-0 rounded-lg border p-2 text-left transition sm:p-3 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                  }`}
                  key={session.day}
                  onClick={() =>
                    setSelectedDayIndex(isSelected ? null : dayIndex)
                  }
                  type="button"
                >
                  <span className="block truncate text-xs font-semibold sm:text-sm">
                    {formatTrainingDayDate(selectedWeek.date, dayIndex)}
                  </span>
                  <span className="mt-2 block truncate text-[10px] text-gray-600 sm:text-xs">
                    {session.type}
                  </span>
                  <span className="mt-1 block text-xs font-medium sm:text-sm">
                    {getSessionVolume(session).toFixed(1)} km
                  </span>
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <article
              aria-live="polite"
              className="rounded-lg border border-blue-200 bg-white p-4 shadow-sm"
            >
              <h4 className="font-semibold">
                Détails du {formatTrainingDayDate(selectedWeek.date, selectedDayIndex ?? 0)} —
                semaine {selectedWeek.weekNumber}
              </h4>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-gray-500">Type de séance</dt>
                  <dd className="font-medium">{selectedDay.type}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Volume</dt>
                  <dd className="font-medium">
                    {getSessionVolume(selectedDay).toFixed(1)} km
                  </dd>
                </div>
                {selectedDay.type === "Seuil" && (
                  <div>
                    <dt className="text-gray-500">Temps au seuil</dt>
                    <dd className="font-medium">{selectedDay.thresholdMinutes} min</dd>
                  </div>
                )}
              </dl>
              {selectedDay.details && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                  {selectedDay.details}
                </p>
              )}
            </article>
          )}
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
          Aucune semaine n’est encore disponible dans ce plan.
        </p>
      )}
    </section>
  );
}

function PlanEditMode({
  weeks,
  onWeeksChange,
  isSaving,
  onAddWeek,
  onRemoveWeek,
  onSave,
}: {
  weeks: TrainingWeek[];
  onWeeksChange: (update: (current: TrainingWeek[]) => TrainingWeek[]) => void;
  isSaving: boolean;
  onAddWeek: () => void;
  onRemoveWeek: (weekIndex: number) => void;
  onSave: () => void;
}) {
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>(() =>
    weeks.length > 0 ? [weeks[0].weekNumber] : [],
  );

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((current) =>
      current.includes(weekNumber)
        ? current.filter((number) => number !== weekNumber)
        : [...current, weekNumber],
    );
  };

  return (
    <section aria-label="Édition du plan" className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Tableau de bord</h3>
          <p className="mt-1 text-sm text-gray-600">
            Modifiez les séances, puis enregistrez vos changements.
          </p>
        </div>
      </div>

      <TrainingProgressCharts weeks={weeks} />

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Semaines du plan</h3>
        {weeks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
            Ajoutez une semaine pour commencer à planifier les séances.
          </p>
        ) : (
          weeks.map((week, weekIndex) => {
            const isExpanded = expandedWeeks.includes(week.weekNumber);
            const panelId = `training-week-${week.weekNumber}`;
            return (
              <section
                className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                key={`${week.weekNumber}-${weekIndex}`}
              >
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-3">
                  <button
                    aria-controls={panelId}
                    aria-expanded={isExpanded}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left hover:text-blue-700"
                    onClick={() => toggleWeek(week.weekNumber)}
                    type="button"
                  >
                    <span className="font-semibold">
                      {formatTrainingWeekRange(week.date)}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {formatTrainingDayDate(week.date, 0)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {getWeekVolume(week).toFixed(1)} km
                      </span>
                      {isExpanded ? (
                        <ChevronUp aria-hidden="true" size={18} />
                      ) : (
                        <ChevronDown aria-hidden="true" size={18} />
                      )}
                    </span>
                  </button>
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    Lundi
                    <input
                      aria-label={`Date du lundi de la semaine ${week.weekNumber}`}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900"
                      disabled={isSaving}
                      onChange={(event) => {
                        if (!event.target.value) {
                          return;
                        }
                        const date = normalizeWeekStartDate(event.target.value);
                        onWeeksChange((current) =>
                          current.map((item, index) =>
                            index === weekIndex ? { ...item, date } : item,
                          ),
                        );
                      }}
                      type="date"
                      value={week.date}
                    />
                  </label>
                  <button
                    className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    disabled={isSaving}
                    onClick={() => onRemoveWeek(weekIndex)}
                    type="button"
                  >
                    Supprimer
                  </button>
                </div>
                {isExpanded && (
                  <div className="overflow-x-auto p-3" id={panelId}>
                    <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                          <th className="px-2 py-3 font-medium" scope="col">
                            Jour
                          </th>
                          <th className="px-2 py-3 font-medium" scope="col">
                            Type de séance
                          </th>
                          <th className="px-2 py-3 font-medium" scope="col">
                            Volume (km)
                          </th>
                          <th className="px-2 py-3 font-medium" scope="col">
                            Seuil (min)
                          </th>
                          <th className="px-2 py-3 font-medium" scope="col">
                            Détails
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {week.sessions.map((session, sessionIndex) => (
                          <tr key={session.day}>
                            <th className="whitespace-nowrap px-2 py-2 font-medium" scope="row">
                              {formatTrainingDayDate(week.date, sessionIndex)}
                            </th>
                            <td className="px-2 py-2">
                              <select
                                aria-label={`${session.day}, type de séance`}
                                className="w-full rounded-md border border-gray-300 px-2 py-2 disabled:bg-gray-100"
                                disabled={isSaving}
                                onChange={(event) => {
                                  const type = event.target.value as TrainingType;
                                  onWeeksChange((current) =>
                                    updateSession(
                                      current,
                                      weekIndex,
                                      sessionIndex,
                                      (item) => ({
                                        ...item,
                                        type,
                                        distanceKm: type === "Off" ? 0 : item.distanceKm,
                                        thresholdMinutes:
                                          type === "Seuil" ? item.thresholdMinutes : 0,
                                      }),
                                    ),
                                  );
                                }}
                                value={session.type}
                              >
                                {TRAINING_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                aria-label={`${session.day}, volume en kilomètres`}
                                className="w-28 rounded-md border border-gray-300 px-2 py-2 disabled:bg-gray-100"
                                disabled={isSaving || session.type === "Off"}
                                max="300"
                                min="0"
                                onChange={(event) => {
                                  const distanceKm = Number(event.target.value);
                                  if (Number.isFinite(distanceKm) && distanceKm >= 0) {
                                    onWeeksChange((current) =>
                                      updateSession(
                                        current,
                                        weekIndex,
                                        sessionIndex,
                                        (item) => ({ ...item, distanceKm }),
                                      ),
                                    );
                                  }
                                }}
                                step="0.1"
                                type="number"
                                value={session.type === "Off" ? 0 : session.distanceKm}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                aria-label={`${session.day}, temps au seuil en minutes`}
                                className="w-24 rounded-md border border-gray-300 px-2 py-2 disabled:bg-gray-100"
                                disabled={isSaving || session.type !== "Seuil"}
                                max="600"
                                min="0"
                                onChange={(event) => {
                                  const thresholdMinutes = Number(event.target.value);
                                  if (
                                    Number.isFinite(thresholdMinutes) &&
                                    thresholdMinutes >= 0
                                  ) {
                                    onWeeksChange((current) =>
                                      updateSession(
                                        current,
                                        weekIndex,
                                        sessionIndex,
                                        (item) => ({ ...item, thresholdMinutes }),
                                      ),
                                    );
                                  }
                                }}
                                step="1"
                                type="number"
                                value={session.thresholdMinutes}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                aria-label={`${session.day}, détails`}
                                className="w-full min-w-48 rounded-md border border-gray-300 px-2 py-2 disabled:bg-gray-100"
                                disabled={isSaving}
                                maxLength={300}
                                onChange={(event) => {
                                  const details = event.target.value;
                                  onWeeksChange((current) =>
                                    updateSession(
                                      current,
                                      weekIndex,
                                      sessionIndex,
                                      (item) => ({ ...item, details }),
                                    ),
                                  );
                                }}
                                placeholder="Allure, répétitions, sensations…"
                                value={session.details}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })
        )}
        <button
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 py-4 font-bold text-slate-500 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSaving}
          onClick={onAddWeek}
          type="button"
        >
          <Plus aria-hidden="true" size={20} />
          Ajouter une semaine
        </button>
      </div>
      <div className="fixed bottom-0 left-0 z-50 flex w-full justify-end border-t border-slate-200 bg-white/90 p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] backdrop-blur-md md:px-8">
        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSaving}
          onClick={onSave}
          type="button"
        >
          {isSaving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </section>
  );
}

export function TrainingPlan({
  client,
  athleteId,
  viewerId,
  isAthleteOwner,
  athleteName,
}: TrainingPlanProps) {
  const plan = useTrainingPlan({ client, athleteId, viewerId, isAthleteOwner });
  const [mode, setMode] = useState<PlanMode>("view");
  const [draftWeeks, setDraftWeeks] = useState<TrainingWeek[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftWeeks(plan.weeks);
  }, [plan.weeks]);

  useEffect(() => {
    setMode("view");
    setSuccessMessage(null);
  }, [athleteId]);

  useEffect(() => {
    if (!plan.isEditable) {
      setMode("view");
    }
  }, [plan.isEditable]);

  const isDirty = useMemo(
    () => JSON.stringify(draftWeeks) !== JSON.stringify(plan.weeks),
    [draftWeeks, plan.weeks],
  );
  const canEnterEdit = plan.isEditable && plan.record !== null;

  const addWeek = () => {
    setDraftWeeks((current) => {
      const nextWeekNumber =
        current.reduce((highest, week) => Math.max(highest, week.weekNumber), 0) + 1;
      const latestWeek = current.reduce<TrainingWeek | null>((latest, week) => {
        if (!latest || week.date > latest.date) {
          return week;
        }
        return latest;
      }, null);
      const nextStartDate = latestWeek
        ? addDaysToDateString(latestWeek.date, 7)
        : getMondayDateString();
      return [...current, createTrainingWeek(nextWeekNumber, nextStartDate)];
    });
    setSuccessMessage(null);
  };

  const removeWeek = (weekIndex: number) => {
    setDraftWeeks((current) => current.filter((_, index) => index !== weekIndex));
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!canEnterEdit) {
      return;
    }
    const saved = await plan.saveWeeks(draftWeeks);
    setSuccessMessage(saved ? "Plan enregistré." : null);
  };

  if (plan.isLoading) {
    return (
      <p aria-live="polite" className="rounded-lg bg-white p-6 text-sm text-gray-600">
        Chargement du plan d’entraînement…
      </p>
    );
  }

  const maxWeeklyVolume = Math.max(0, ...draftWeeks.map(getWeekVolume));

  return (
    <div className="space-y-5">
      {plan.error && (
        <p
          aria-live="polite"
          className="rounded-md bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {plan.error}
        </p>
      )}

      {!isAthleteOwner && !plan.isEditable && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Lecture seule : l’athlète n’a pas accordé le droit de modifier ce plan.
        </p>
      )}

      <section
        aria-label={athleteName ? `Plan de ${athleteName}` : "Mon plan"}
        className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
              <CalendarDays aria-hidden="true" size={17} />
              Planification hebdomadaire
            </div>
            <h2 className="mt-2 text-2xl font-bold text-gray-950">
              {athleteName ? `Plan de ${athleteName}` : "Mon plan"}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {draftWeeks.length} semaine(s) · {getTotalVolume(draftWeeks).toFixed(1)} km
              au total · maximum {maxWeeklyVolume.toFixed(1)} km/semaine
            </p>
          </div>

          <div
            aria-label="Mode du plan"
            className="inline-flex rounded-lg bg-gray-100 p-1"
            role="tablist"
          >
            <button
              aria-selected={mode === "view"}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                mode === "view"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setMode("view")}
              role="tab"
              type="button"
            >
              <Eye aria-hidden="true" size={16} />
              Visualisation
            </button>
            <button
              disabled={!canEnterEdit}
              aria-selected={mode === "edit"}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed ${
                !canEnterEdit
                  ? "cursor-not-allowed text-gray-400"
                  : mode === "edit"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => {
                if (canEnterEdit) {
                  setMode("edit");
                }
              }}
              role="tab"
              title={
                canEnterEdit
                  ? "Ouvrir le mode édition"
                  : "Édition verrouillée : le consentement de l’athlète est requis"
              }
              type="button"
            >
              {canEnterEdit ? (
                <Settings aria-hidden="true" size={16} />
              ) : (
                <Lock aria-hidden="true" size={16} />
              )}
              Édition
            </button>
          </div>
        </div>

        {!isAthleteOwner && canEnterEdit && (
          <p className="inline-flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
            <LockOpen aria-hidden="true" size={15} />
            L’athlète a autorisé la modification de ce plan.
          </p>
        )}

        {successMessage && (
          <p aria-live="polite" className="text-sm text-green-700" role="status">
            {successMessage}
          </p>
        )}

        {mode === "view" ? (
          <PlanViewMode weeks={plan.weeks} />
        ) : canEnterEdit ? (
          <PlanEditMode
            isSaving={plan.isSaving}
            onAddWeek={addWeek}
            onRemoveWeek={removeWeek}
            onSave={() => void handleSave()}
            onWeeksChange={(update) => {
              setDraftWeeks(update);
              setSuccessMessage(null);
            }}
            weeks={draftWeeks}
          />
        ) : (
          <PlanViewMode weeks={plan.weeks} />
        )}

        {mode === "edit" && isDirty && (
          <p aria-live="polite" className="text-xs text-amber-800" role="status">
            Modifications non enregistrées.
          </p>
        )}
      </section>
    </div>
  );
}
