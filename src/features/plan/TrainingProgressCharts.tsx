import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getWeekVolume,
  type TrainingWeek,
} from "./trainingPlanTypes";

interface TrainingProgressChartsProps {
  weeks: TrainingWeek[];
}

export function TrainingProgressCharts({ weeks }: TrainingProgressChartsProps) {
  const chartData = weeks.map((week) => ({
    week: `S${week.weekNumber}`,
    volumeKm: Number(getWeekVolume(week).toFixed(1)),
    thresholdMinutes: week.sessions.reduce(
      (total, session) =>
        total + (session.type === "Seuil" ? session.thresholdMinutes : 0),
      0,
    ),
    hillDistanceKm: Number(
      week.sessions
        .filter((session) => session.type === "Côtes")
        .reduce((total, session) => total + session.distanceKm, 0)
        .toFixed(1),
    ),
    vmaDistanceKm: Number(
      week.sessions
        .filter((session) => session.type === "VMA")
        .reduce((total, session) => total + session.distanceKm, 0)
        .toFixed(1),
    ),
  }));

  if (weeks.length === 0) {
    return (
      <section aria-label="Progression de l’entraînement" className="space-y-3">
        <h2 className="text-lg font-semibold">Progression</h2>
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
          Ajoutez une semaine au plan pour afficher les graphiques de progression.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Progression de l’entraînement" className="space-y-4">
      <h2 className="text-lg font-semibold">Progression</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-medium">Volume hebdomadaire (km)</h3>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis allowDecimals />
                <Tooltip />
                <Line
                  dataKey="volumeKm"
                  name="Volume (km)"
                  stroke="#2563eb"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-medium">Temps au seuil (min)</h3>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis allowDecimals />
                <Tooltip />
                <Area
                  dataKey="thresholdMinutes"
                  fill="#c4b5fd"
                  name="Temps au seuil (min)"
                  stroke="#7c3aed"
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-medium">Distances spécifiques (km)</h3>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis allowDecimals />
                <Tooltip />
                <Legend />
                <Bar dataKey="hillDistanceKm" fill="#f97316" name="Côtes (km)" />
                <Bar dataKey="vmaDistanceKm" fill="#16a34a" name="VMA (km)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  );
}
