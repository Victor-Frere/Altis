export const TRAINING_DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;

export const TRAINING_TYPES = [
  "Off",
  "Footing facile",
  "Côtes",
  "Seuil",
  "VMA",
  "Sortie longue",
] as const;

export type TrainingDay = (typeof TRAINING_DAYS)[number];
export type TrainingType = (typeof TRAINING_TYPES)[number];

export interface TrainingSession {
  day: TrainingDay;
  type: TrainingType;
  distanceKm: number;
  thresholdMinutes: number;
  details: string;
}

export interface TrainingWeek {
  weekNumber: number;
  date: string;
  sessions: TrainingSession[];
}

export interface TrainingPlanRecord {
  id: string;
  weeks: TrainingWeek[];
}

export function getMondayDateString(date: Date = new Date()): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = monday.getDay();
  monday.setDate(monday.getDate() - ((dayOfWeek + 6) % 7));
  return formatDateForInput(monday);
}

export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(dateString: string, days: number): string {
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("La date de début de semaine est invalide.");
  }
  date.setDate(date.getDate() + days);
  return formatDateForInput(date);
}

export function normalizeWeekStartDate(dateString: string): string {
  const selectedDate = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(selectedDate.getTime())) {
    throw new Error("La date de début de semaine est invalide.");
  }
  return getMondayDateString(selectedDate);
}

export function formatTrainingDayDate(startDate: string, dayIndex: number): string {
  const dayDate = new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(dayDate.getTime())) {
    throw new Error("La date de début de semaine est invalide.");
  }
  dayDate.setDate(dayDate.getDate() + dayIndex);
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(dayDate);
  return formatted.charAt(0).toLocaleUpperCase("fr-FR") + formatted.slice(1);
}

export function formatShortTrainingDate(startDate: string, dayOffset: number): string {
  const date = new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("La date de début de semaine est invalide.");
  }
  date.setDate(date.getDate() + dayOffset);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatTrainingWeekRange(startDate: string): string {
  return `Du ${formatShortTrainingDate(startDate, 0)} au ${formatShortTrainingDate(startDate, 6)}`;
}

function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && formatDateForInput(date) === value;
}

export function createTrainingWeek(
  weekNumber: number,
  date: string = getMondayDateString(),
): TrainingWeek {
  return {
    weekNumber,
    date: normalizeWeekStartDate(date),
    sessions: TRAINING_DAYS.map((day) => ({
      day,
      type: "Off",
      distanceKm: 0,
      thresholdMinutes: 0,
      details: "",
    })),
  };
}

export function parseTrainingWeeks(value: unknown): TrainingWeek[] {
  if (!Array.isArray(value)) {
    throw new Error("Les semaines du plan reçues depuis Supabase sont invalides.");
  }

  const fallbackMonday = getMondayDateString();

  return value.map((week, weekIndex) => {
    if (
      typeof week !== "object" ||
      week === null ||
      !("weekNumber" in week) ||
      typeof week.weekNumber !== "number" ||
      !Number.isInteger(week.weekNumber) ||
      !("sessions" in week) ||
      !Array.isArray(week.sessions)
    ) {
      throw new Error(`La semaine ${weekIndex + 1} du plan est invalide.`);
    }

    if (week.sessions.length !== TRAINING_DAYS.length) {
      throw new Error(`La semaine ${week.weekNumber} doit contenir sept jours.`);
    }

    let date: string;
    const storedDate = "date" in week ? week.date : "startDate" in week ? week.startDate : null;
    if (storedDate !== null) {
      if (!isDateString(storedDate)) {
        throw new Error(`La date de début de la semaine ${week.weekNumber} est invalide.`);
      }
      date = normalizeWeekStartDate(storedDate);
    } else {
      date = addDaysToDateString(fallbackMonday, weekIndex * 7);
    }

    const sessions = week.sessions.map((session: unknown, sessionIndex: number): TrainingSession => {
      if (
        typeof session !== "object" ||
        session === null ||
        !("day" in session) ||
        !TRAINING_DAYS.includes(session.day as TrainingDay) ||
        !("type" in session) ||
        !TRAINING_TYPES.includes(session.type as TrainingType) ||
        !("distanceKm" in session) ||
        typeof session.distanceKm !== "number" ||
        !Number.isFinite(session.distanceKm) ||
        session.distanceKm < 0 ||
        !("thresholdMinutes" in session) ||
        typeof session.thresholdMinutes !== "number" ||
        !Number.isFinite(session.thresholdMinutes) ||
        session.thresholdMinutes < 0 ||
        !("details" in session) ||
        typeof session.details !== "string"
      ) {
        throw new Error(
          `La séance ${sessionIndex + 1} de la semaine ${week.weekNumber} est invalide.`,
        );
      }

      return {
        day: session.day as TrainingDay,
        type: session.type as TrainingType,
        distanceKm: session.distanceKm,
        thresholdMinutes: session.thresholdMinutes,
        details: session.details,
      };
    });

    return { weekNumber: week.weekNumber, date, sessions };
  });
}

export function getSessionVolume(session: TrainingSession): number {
  return session.type === "Off" ? 0 : session.distanceKm;
}

export function getWeekVolume(week: TrainingWeek): number {
  return week.sessions.reduce((total, session) => total + getSessionVolume(session), 0);
}

export function getTotalVolume(weeks: TrainingWeek[]): number {
  return weeks.reduce((total, week) => total + getWeekVolume(week), 0);
}
