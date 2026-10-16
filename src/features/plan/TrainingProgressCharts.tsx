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
  addDaysToDateString,
  formatShortTrainingDate,
  getWeekVolume,
  type TrainingWeek,
} from "./trainingPlanTypes";
import { parseSeuilTime } from "./workoutGenerator";

interface TrainingProgressChartsProps {
  weeks: TrainingWeek[];
}

export function TrainingProgressCharts({ weeks }: TrainingProgressChartsProps) {
  const chartData = weeks.map((week) => {
    const startDate = new Date(`${week.date}T12:00:00`);
    const endDateString = addDaysToDateString(week.date, 6);
    const endDate = new Date(`${endDateString}T12:00:00`);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const shortStartDate = formatShortTrainingDate(week.date, 0);
    const shortEndDate = formatShortTrainingDate(week.date, 6);

    return {
      shortDate: shortStartDate,
      fullWeekRange:
        startYear === endYear
          ? `Semaine du ${shortStartDate} au ${shortEndDate} ${endYear}`
          : `Semaine du ${shortStartDate} ${startYear} au ${shortEndDate} ${endYear}`,
      volumeKm: Number(getWeekVolume(week).toFixed(1)),
      thresholdMinutes: week.sessions.reduce(
        (total, session) => total + parseSeuilTime(session.type, session.details),
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
    };
  });

  if (weeks.length === 0) {
    return (
      <section aria-label="Progression de l’entraînement" className="space-y-3">
        <h2 className="text-lg font-semibold">Progression</h2>
        <p className="altis-card border-dashed p-6 text-sm text-slate-600 dark:text-slate-400">
          Ajoutez une semaine au plan pour afficher les graphiques de progression.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Progression de l’entraînement" className="space-y-4">
      <h2 className="text-lg font-semibold">Progression</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="altis-card p-4">
          <h3 className="mb-3 text-sm font-medium">Volume hebdomadaire (km)</h3>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="var(--altis-chart-grid)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="shortDate"
                  interval="preserveStartEnd"
                  tick={{ fill: "var(--altis-chart-text)", fontSize: 12 }}
                />
                <YAxis allowDecimals tick={{ fill: "var(--altis-chart-text)" }} />
                <Tooltip
                  labelFormatter={(_label, payload) =>
                    payload[0]?.payload.fullWeekRange ?? _label
                  }
                  contentStyle={{
                    backgroundColor: "var(--altis-chart-surface)",
                    border: "1px solid var(--altis-chart-border)",
                    borderRadius: "0.5rem",
                    color: "var(--altis-chart-label)",
                  }}
                />
                <Line
                  dataKey="volumeKm"
                  name="Volume (km)"
                  stroke="#D4AF37"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="altis-card p-4">
          <h3 className="mb-3 text-sm font-medium">Temps au seuil (min)</h3>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="var(--altis-chart-grid)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="shortDate"
                  interval="preserveStartEnd"
                  tick={{ fill: "var(--altis-chart-text)", fontSize: 12 }}
                />
                <YAxis allowDecimals tick={{ fill: "var(--altis-chart-text)" }} />
                <Tooltip
                  labelFormatter={(_label, payload) =>
                    payload[0]?.payload.fullWeekRange ?? _label
                  }
                  contentStyle={{
                    backgroundColor: "var(--altis-chart-surface)",
                    border: "1px solid var(--altis-chart-border)",
                    borderRadius: "0.5rem",
                    color: "var(--altis-chart-label)",
                  }}
                />
                <Area
                  dataKey="thresholdMinutes"
                  fill="#D4AF37"
                  fillOpacity={0.2}
                  name="Temps au seuil (min)"
                  stroke="#C5A028"
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="altis-card p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-medium">Distances spécifiques (km)</h3>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="var(--altis-chart-grid)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="shortDate"
                  interval="preserveStartEnd"
                  tick={{ fill: "var(--altis-chart-text)", fontSize: 12 }}
                />
                <YAxis allowDecimals tick={{ fill: "var(--altis-chart-text)" }} />
                <Tooltip
                  labelFormatter={(_label, payload) =>
                    payload[0]?.payload.fullWeekRange ?? _label
                  }
                  contentStyle={{
                    backgroundColor: "var(--altis-chart-surface)",
                    border: "1px solid var(--altis-chart-border)",
                    borderRadius: "0.5rem",
                    color: "var(--altis-chart-label)",
                  }}
                />
                <Legend wrapperStyle={{ color: "var(--altis-chart-text)" }} />
                <Bar dataKey="hillDistanceKm" fill="#C5A028" name="Côtes (km)" />
                <Bar dataKey="vmaDistanceKm" fill="#94A3B8" name="VMA (km)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  );
}
