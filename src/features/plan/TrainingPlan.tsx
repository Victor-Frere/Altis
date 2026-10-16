import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Eye,
  Lock,
  LockOpen,
  Plus,
  RotateCcw,
  Settings,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TrainingProgressCharts } from "./TrainingProgressCharts";
import { WorkoutAssistant } from "./WorkoutAssistant";
import { parseSeuilTime } from "./workoutGenerator";
import { useTrainingPlan } from "./useTrainingPlan";
import {
  createTrainingWeek,
  addDaysToDateString,
  formatTrainingWeekRange,
  formatTrainingDayDate,
  formatShortTrainingDate,
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

function getModifiedWeeks(
  savedWeeks: TrainingWeek[],
  draftWeeks: TrainingWeek[],
): TrainingWeek[] {
  const savedByNumber = new Map(
    savedWeeks.map((week): [number, TrainingWeek] => [week.weekNumber, week]),
  );
  const draftByNumber = new Map(
    draftWeeks.map((week): [number, TrainingWeek] => [week.weekNumber, week]),
  );
  const weekNumbers = new Set([...savedByNumber.keys(), ...draftByNumber.keys()]);

  return [...weekNumbers]
    .filter((weekNumber) => {
      const savedWeek = savedByNumber.get(weekNumber);
      const draftWeek = draftByNumber.get(weekNumber);
      return (
        !savedWeek ||
        !draftWeek ||
        JSON.stringify(savedWeek) !== JSON.stringify(draftWeek)
      );
    })
    .map((weekNumber) => draftByNumber.get(weekNumber) ?? savedByNumber.get(weekNumber))
    .filter((week): week is TrainingWeek => week !== undefined)
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) || left.weekNumber - right.weekNumber,
    );
}

function formatModifiedWeekSummary(weeks: TrainingWeek[]): string {
  if (weeks.length === 1) {
    return `Modifications non enregistrées : ${formatTrainingWeekRange(weeks[0].date)}`;
  }

  const firstDate = weeks[0].date;
  const lastDate = weeks[weeks.length - 1].date;
  return `Modifications non enregistrées sur ${weeks.length} semaines (Du ${formatShortTrainingDate(firstDate, 0)} au ${formatShortTrainingDate(lastDate, 6)})`;
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
          <p className="altis-muted-text mt-1 text-sm">
            Consultez les séances et leur volume sans modifier le plan.
          </p>
        </div>
        <label className="altis-muted-text space-y-1 text-sm font-medium">
          Sélectionner une semaine
          <select
            className="block min-w-48 rounded-md px-3 py-2"
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
            <article className="altis-card p-4">
              <p className="altis-muted-text text-sm">Volume total de la semaine</p>
              <p className="mt-1 text-2xl font-semibold text-altis-navy dark:text-altis-gold">
                {weekVolume.toFixed(1)} <span className="text-base font-medium">km</span>
              </p>
            </article>
            <article className="altis-card p-4">
              <p className="altis-muted-text text-sm">Volume maximal sur une journée</p>
              <p className="mt-1 text-2xl font-semibold text-altis-navy dark:text-altis-gold">
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
                      ? "border-altis-gold bg-amber-50 ring-2 ring-altis-gold/30 dark:bg-slate-800"
                      : "border border-slate-200 bg-white shadow-sm hover:border-altis-gold/60 hover:bg-amber-50 dark:border-slate-800 dark:bg-altis-card-dark dark:hover:bg-slate-800"
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
                  <span className="altis-muted-text mt-2 block truncate text-[10px] sm:text-xs">
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
              className="altis-card p-4"
            >
              <h4 className="font-semibold">
                Détails du {formatTrainingDayDate(selectedWeek.date, selectedDayIndex ?? 0)} —
                semaine {selectedWeek.weekNumber}
              </h4>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="altis-muted-text">Type de séance</dt>
                  <dd className="font-medium">{selectedDay.type}</dd>
                </div>
                <div>
                  <dt className="altis-muted-text">Volume</dt>
                  <dd className="font-medium">
                    {getSessionVolume(selectedDay).toFixed(1)} km
                  </dd>
                </div>
                {selectedDay.type === "Seuil" && (
                  <div>
                    <dt className="altis-muted-text">Temps au seuil</dt>
                    <dd className="font-medium">
                      {parseSeuilTime(selectedDay.type, selectedDay.details)} min
                    </dd>
                  </div>
                )}
              </dl>
              {selectedDay.details && (
                <p className="altis-muted-text mt-3 whitespace-pre-wrap text-sm">
                  {selectedDay.details}
                </p>
              )}
            </article>
          )}
        </>
      ) : (
        <p className="altis-card border-dashed p-6 text-sm text-slate-600 dark:text-slate-400">
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
  modifiedWeeks,
  onAddWeek,
  onCancel,
  onRemoveWeek,
  onSave,
}: {
  weeks: TrainingWeek[];
  onWeeksChange: (update: (current: TrainingWeek[]) => TrainingWeek[]) => void;
  isSaving: boolean;
  modifiedWeeks: TrainingWeek[];
  onAddWeek: () => void;
  onCancel: () => void;
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
          <p className="altis-muted-text mt-1 text-sm">
            Modifiez les séances, puis enregistrez vos changements.
          </p>
        </div>
      </div>

      <TrainingProgressCharts weeks={weeks} />

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Semaines du plan</h3>
        {weeks.length === 0 ? (
          <p className="altis-card border-dashed p-5 text-sm text-slate-600 dark:text-slate-400">
            Ajoutez une semaine pour commencer à planifier les séances.
          </p>
        ) : (
          weeks.map((week, weekIndex) => {
            const isExpanded = expandedWeeks.includes(week.weekNumber);
            const panelId = `training-week-${week.weekNumber}`;
            return (
              <section
                className="altis-card overflow-hidden"
                key={`${week.weekNumber}-${weekIndex}`}
              >
                <div className="flex flex-col gap-3 bg-slate-100 px-4 py-3 dark:bg-slate-800/70 sm:p-4 md:flex-row md:items-center">
                  <div className="flex min-w-0 items-center justify-between gap-3 md:flex-1">
                    <span className="min-w-0 truncate font-semibold">
                      {formatTrainingWeekRange(week.date)}
                    </span>
                    <button
                      aria-controls={panelId}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? "Replier" : "Déplier"} la semaine ${week.weekNumber}`}
                      className="altis-secondary-button flex shrink-0 cursor-pointer items-center justify-center rounded-xl p-2 shadow-sm transition-all hover:border-altis-gold hover:text-altis-navy dark:hover:text-altis-gold"
                      onClick={() => toggleWeek(week.weekNumber)}
                      type="button"
                    >
                      <ChevronDown
                        aria-hidden="true"
                        className={`transform transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        size={18}
                      />
                    </button>
                  </div>
                  <div className="altis-muted-text grid grid-cols-1 gap-1 text-xs sm:grid-cols-2 md:flex md:items-center md:gap-4 md:text-sm">
                    <span>Volume total : {getWeekVolume(week).toFixed(1)} km</span>
                    <span>
                      Sortie max :{" "}
                      {Math.max(0, ...week.sessions.map(getSessionVolume)).toFixed(1)} km
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:justify-start">
                    <label className="altis-muted-text flex items-center gap-2 text-xs">
                      Lundi
                      <input
                        aria-label={`Date du lundi de la semaine ${week.weekNumber}`}
                        className="rounded-md px-2 py-1.5 text-sm"
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
                      className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40 disabled:opacity-50"
                      disabled={isSaving}
                      onClick={() => onRemoveWeek(weekIndex)}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-3" id={panelId}>
                    <div className="space-y-3 md:hidden">
                      {week.sessions.map((session, sessionIndex) => (
                        <article
                          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-altis-card-dark"
                          key={session.day}
                        >
                          <div className="flex flex-col gap-2">
                            <h4 className="font-semibold">
                              {formatTrainingDayDate(week.date, sessionIndex)}
                            </h4>
                            <label className="sr-only" htmlFor={`mobile-type-${week.weekNumber}-${sessionIndex}`}>
                              {session.day}, type de séance
                            </label>
                            <select
                              aria-label={`${session.day}, type de séance`}
                              className="w-full rounded-md px-2 py-2 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                              disabled={isSaving}
                              id={`mobile-type-${week.weekNumber}-${sessionIndex}`}
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
                          </div>

                          <div className="flex items-end gap-3">
                            <label className="min-w-0 flex-1 space-y-1 text-sm font-medium">
                              Volume (km)
                              <input
                                aria-label={`${session.day}, volume en kilomètres`}
                                className="w-full rounded-md px-2 py-2 disabled:bg-slate-100 dark:disabled:bg-slate-800"
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
                            </label>
                            {["VMA", "Seuil", "Côtes"].includes(session.type) && (
                              <WorkoutAssistant
                                day={session.day}
                                initialVolumeKm={session.distanceKm}
                                onApply={(details, distanceKm) => {
                                  onWeeksChange((current) =>
                                    updateSession(
                                      current,
                                      weekIndex,
                                      sessionIndex,
                                      (item) => ({ ...item, details, distanceKm }),
                                    ),
                                  );
                                }}
                              />
                            )}
                          </div>

                          <label className="block space-y-1 text-sm font-medium">
                            Détails
                            <input
                              aria-label={`${session.day}, détails`}
                              className="w-full rounded-md px-2 py-2 disabled:bg-slate-100 dark:disabled:bg-slate-800"
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
                          </label>
                        </article>
                      ))}
                    </div>
                    <table className="hidden w-full min-w-[760px] border-collapse text-left text-sm md:table">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
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
                            Détails
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                        {week.sessions.map((session, sessionIndex) => (
                          <tr key={session.day}>
                            <th className="whitespace-nowrap px-2 py-2 font-medium" scope="row">
                              {formatTrainingDayDate(week.date, sessionIndex)}
                            </th>
                            <td className="px-2 py-2">
                              <select
                                aria-label={`${session.day}, type de séance`}
                                className="w-full rounded-md px-2 py-2 disabled:bg-slate-100 dark:disabled:bg-slate-800"
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
                                className="w-28 rounded-md px-2 py-2 disabled:bg-slate-100 dark:disabled:bg-slate-800"
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
                              <div className="flex min-w-[18rem] items-center gap-2">
                                <input
                                  aria-label={`${session.day}, détails`}
                                  className="min-w-0 flex-1 rounded-md px-2 py-2 disabled:bg-slate-100 dark:disabled:bg-slate-800"
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
                                {["VMA", "Seuil", "Côtes"].includes(session.type) && (
                                  <WorkoutAssistant
                                    day={session.day}
                                    initialVolumeKm={session.distanceKm}
                                    onApply={(details, distanceKm) => {
                                      onWeeksChange((current) =>
                                        updateSession(
                                          current,
                                          weekIndex,
                                          sessionIndex,
                                          (item) => ({ ...item, details, distanceKm }),
                                        ),
                                      );
                                    }}
                                  />
                                )}
                              </div>
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
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-4 font-bold text-slate-600 transition-all hover:border-altis-gold hover:bg-amber-50 hover:text-altis-navy dark:border-slate-600 dark:bg-slate-900/30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-altis-gold disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSaving}
          onClick={onAddWeek}
          type="button"
        >
          <Plus aria-hidden="true" size={20} />
          Ajouter une semaine
        </button>
      </div>
      {modifiedWeeks.length > 0 && (
        <div className="animate-slide-up fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 z-40 flex w-full items-center justify-between gap-4 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-slate-700/50 dark:bg-altis-card-dark/95 dark:shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.35)] md:bottom-0 md:z-50 md:px-8">
          <p aria-live="polite" className="min-w-0 text-sm font-medium text-slate-800 dark:text-altis-marble" role="status">
            {formatModifiedWeekSummary(modifiedWeeks)}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label="Annuler les modifications"
              className="altis-secondary-button flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving}
              onClick={onCancel}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={16} />
              Annuler
            </button>
            <button
              className="altis-primary-button rounded-md px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving}
              onClick={onSave}
              type="button"
            >
              {isSaving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
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
  const [savedWeeks, setSavedWeeks] = useState<TrainingWeek[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftWeeks(plan.weeks);
    setSavedWeeks(plan.weeks);
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

  const modifiedWeeks = useMemo(
    () => getModifiedWeeks(savedWeeks, draftWeeks),
    [savedWeeks, draftWeeks],
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
    const weeksToSave = draftWeeks;
    const saved = await plan.saveWeeks(weeksToSave);
    if (saved) {
      setSavedWeeks(weeksToSave);
    }
    setSuccessMessage(saved ? "Plan enregistré." : null);
  };

  const handleCancel = () => {
    setDraftWeeks(
      savedWeeks.map((week) => ({
        ...week,
        sessions: week.sessions.map((session) => ({ ...session })),
      })),
    );
    setSuccessMessage(null);
  };

  if (plan.isLoading) {
    return (
      <p aria-live="polite" className="altis-card p-6 text-sm text-slate-600 dark:text-slate-400">
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
          className="altis-error-panel text-sm"
          role="alert"
        >
          {plan.error}
        </p>
      )}

      {!isAthleteOwner && !plan.isEditable && (
        <p className="altis-warning-panel text-sm">
          Lecture seule : l’athlète n’a pas accordé le droit de modifier ce plan.
        </p>
      )}

      <section
        aria-label={athleteName ? `Plan de ${athleteName}` : "Mon plan"}
        className="altis-card space-y-5 p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-altis-navy dark:text-altis-gold">
              <CalendarDays aria-hidden="true" size={17} />
              Planification hebdomadaire
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-altis-marble">
              {athleteName ? `Plan de ${athleteName}` : "Mon plan"}
            </h2>
            <p className="altis-muted-text mt-1 text-sm">
              {draftWeeks.length} semaine(s) · {getTotalVolume(draftWeeks).toFixed(1)} km
              au total · maximum {maxWeeklyVolume.toFixed(1)} km/semaine
            </p>
          </div>

          <div
            aria-label="Mode du plan"
            className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-900/60"
            role="tablist"
          >
            <button
              aria-selected={mode === "view"}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                mode === "view"
                  ? "altis-selected font-bold shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-altis-marble"
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
                  ? "cursor-not-allowed text-slate-400 dark:text-slate-500"
                  : mode === "edit"
                    ? "altis-selected font-bold shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-altis-marble"
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
          <p className="altis-success-panel inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm">
            <LockOpen aria-hidden="true" size={15} />
            L’athlète a autorisé la modification de ce plan.
          </p>
        )}

        {successMessage && (
          <p aria-live="polite" className="altis-success-text text-sm" role="status">
            {successMessage}
          </p>
        )}

        {mode === "view" ? (
          <PlanViewMode weeks={plan.weeks} />
        ) : canEnterEdit ? (
          <PlanEditMode
            isSaving={plan.isSaving}
            modifiedWeeks={modifiedWeeks}
            onAddWeek={addWeek}
            onCancel={handleCancel}
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

      </section>
    </div>
  );
}
