import { useEffect, useState } from "react";
import { WandSparkles, X } from "lucide-react";
import {
  generateWorkoutDetails,
  type WorkoutIntervalUnit,
} from "./workoutGenerator";

interface WorkoutAssistantProps {
  day: string;
  initialVolumeKm: number;
  onApply: (details: string, volumeKm: number) => void;
}

export function WorkoutAssistant({
  day,
  initialVolumeKm,
  onApply,
}: WorkoutAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [totalVolume, setTotalVolume] = useState(
    initialVolumeKm > 0 ? String(initialVolumeKm) : "10",
  );
  const [repetitions, setRepetitions] = useState("10");
  const [intervalUnit, setIntervalUnit] = useState<WorkoutIntervalUnit>("meters");
  const [intervalValue, setIntervalValue] = useState("400");
  const [targetPace, setTargetPace] = useState("3:45");
  const [recovery, setRecovery] = useState("1:30");

  useEffect(() => {
    if (!isOpen) {
      setTotalVolume(initialVolumeKm > 0 ? String(initialVolumeKm) : "10");
    }
  }, [initialVolumeKm, isOpen]);

  let generated: ReturnType<typeof generateWorkoutDetails> | null = null;
  let validationError: string | null = null;
  try {
    generated = generateWorkoutDetails({
      totalVolumeKm: Number(totalVolume),
      repetitions: Number(repetitions),
      intervalUnit,
      intervalValue: Number(intervalValue),
      targetPace,
      recovery,
    });
  } catch (generationError) {
    validationError =
      generationError instanceof Error
        ? generationError.message
        : "Impossible de calculer la séance avec les valeurs saisies.";
  }
  const hasInvalidInput = !generated;
  const volumeTooLow = generated !== null && generated.remainingKm < 0;

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-label={`Ouvrir l’assistant de séance pour ${day}`}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-200 px-2 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
        onClick={() => {
          setIsOpen((open) => !open);
        }}
        type="button"
      >
        <WandSparkles aria-hidden="true" size={15} />
        Assistant
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div
            aria-labelledby={`workout-assistant-title-${day}`}
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl"
            role="dialog"
          >
            <div className="flex items-center justify-between gap-3">
              <h4
                className="font-semibold text-slate-900"
                id={`workout-assistant-title-${day}`}
              >
                Générer la séance — {day}
              </h4>
              <button
                aria-label="Fermer l’assistant"
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <label className="block space-y-1 text-xs font-medium text-slate-700">
              Volume total visé (km)
              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                min="0.1"
                onChange={(event) => setTotalVolume(event.target.value)}
                step="0.1"
                type="number"
                value={totalVolume}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs font-medium text-slate-700">
                Répétitions
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  min="1"
                  onChange={(event) => setRepetitions(event.target.value)}
                  step="1"
                  type="number"
                  value={repetitions}
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-700">
                Type d’intervalle
                <select
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  onChange={(event) => {
                    const unit = event.target.value as WorkoutIntervalUnit;
                    setIntervalUnit(unit);
                    setIntervalValue(unit === "meters" ? "400" : "2");
                  }}
                  value={intervalUnit}
                >
                  <option value="meters">Distance (m)</option>
                  <option value="minutes">Temps (min)</option>
                </select>
              </label>
            </div>
            <label className="block space-y-1 text-xs font-medium text-slate-700">
              Valeur de l’intervalle ({intervalUnit === "meters" ? "mètres" : "minutes"})
              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                min={intervalUnit === "meters" ? "1" : "0.1"}
                onChange={(event) => setIntervalValue(event.target.value)}
                step={intervalUnit === "meters" ? "1" : "0.1"}
                type="number"
                value={intervalValue}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs font-medium text-slate-700">
                Allure cible (min/km)
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  onChange={(event) => setTargetPace(event.target.value)}
                  placeholder="3:45"
                  value={targetPace}
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-700">
                Récupération (min:sec)
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  onChange={(event) => setRecovery(event.target.value)}
                  placeholder="1:30"
                  value={recovery}
                />
              </label>
            </div>

            {validationError && (
              <p className="text-xs text-amber-700" role="alert">
                {validationError}
              </p>
            )}
            {volumeTooLow && (
              <p className="text-xs font-medium text-red-700" role="alert">
                Le volume total est inférieur à la distance des intervalles.
              </p>
            )}
            {generated && !volumeTooLow && (
              <p className="text-xs text-slate-600">
                Distance des intervalles : {generated.intervalDistanceKm.toFixed(2)} km ·
                échauffement/retour au calme : {generated.remainingKm.toFixed(2)} km
              </p>
            )}

            <button
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!generated?.details || hasInvalidInput || volumeTooLow}
              onClick={() => {
                if (generated?.details) {
                  onApply(generated.details, Number(totalVolume));
                  setIsOpen(false);
                }
              }}
              type="button"
            >
              Générer et appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
