export type WorkoutIntervalUnit = "meters" | "minutes";

export interface WorkoutGeneratorInput {
  totalVolumeKm: number;
  repetitions: number;
  intervalUnit: WorkoutIntervalUnit;
  intervalValue: number;
  targetPace: string;
  recovery: string;
}

export interface GeneratedWorkout {
  details: string | null;
  intervalDistanceKm: number;
  remainingKm: number;
}

export function parseSeuilTime(type: string, details: string): number {
  if (type !== "Seuil") {
    return 0;
  }

  const intervalPattern =
    /(\d+)\s*(?:x|×|\*)\s*(\d+(?:[.,]\d+)?)\s*(?:min(?:ute(?:s)?)?\.?|['’′])/giu;
  let totalMinutes = 0;
  for (const match of details.matchAll(intervalPattern)) {
    const repetitions = Number(match[1]);
    const intervalMinutes = Number(match[2].replace(",", "."));
    totalMinutes += repetitions * intervalMinutes;
  }
  return totalMinutes;
}

function parsePace(value: string, label: string, allowZero = false): number {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`${label} doit être au format minutes:secondes, par exemple 3:45.`);
  }
  const paceMinutes = Number(match[1]) + Number(match[2]) / 60;
  if (paceMinutes === 0 && !allowZero) {
    throw new Error(`${label} doit être supérieure à 0.`);
  }
  return paceMinutes;
}

function formatKm(value: number): string {
  return value.toFixed(1);
}

export function generateWorkoutDetails(input: WorkoutGeneratorInput): GeneratedWorkout {
  const {
    totalVolumeKm,
    repetitions,
    intervalUnit,
    intervalValue,
    targetPace,
    recovery,
  } = input;

  if (!Number.isFinite(totalVolumeKm) || totalVolumeKm <= 0) {
    throw new Error("Le volume total visé doit être supérieur à 0 km.");
  }
  if (!Number.isInteger(repetitions) || repetitions <= 0) {
    throw new Error("Le nombre de répétitions doit être un entier supérieur à 0.");
  }
  if (!Number.isFinite(intervalValue) || intervalValue <= 0) {
    throw new Error("La valeur de l’intervalle doit être supérieure à 0.");
  }
  if (intervalUnit === "meters" && !Number.isInteger(intervalValue)) {
    throw new Error("La distance des intervalles doit être un nombre entier de mètres.");
  }

  const paceMinutes = parsePace(targetPace, "L’allure cible");
  parsePace(recovery, "La récupération", true);
  const intervalDistanceKm =
    intervalUnit === "meters"
      ? (repetitions * intervalValue) / 1000
      : (repetitions * intervalValue) / paceMinutes;
  const remainingKm = totalVolumeKm - intervalDistanceKm;
  const intervalLabel =
    intervalUnit === "meters"
      ? `${intervalValue}m`
      : `${intervalValue}min`;

  return {
    details:
      remainingKm < 0
        ? null
        : `Échauff/RAC : ${formatKm(remainingKm)}km. Corps : ${repetitions}x${intervalLabel} à ${targetPace.trim()}/km (r: ${recovery.trim()})`,
    intervalDistanceKm,
    remainingKm,
  };
}
