import { AlertTriangle, CheckCircle2, Search, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { generateLocalFeedback } from "@/features/ai-feedback/utils/feedbackEngine";

const riskOptions = [
  { value: "all", label: "Todos" },
  { value: "high", label: "Prioritario" },
  { value: "medium", label: "Preventivo" },
  { value: "low", label: "Regular" },
];

const riskLabels = {
  high: "Prioritario",
  medium: "Preventivo",
  low: "Regular",
};

export function GradebookDashboard({
  rows,
  skills,
  filteredCount,
  searchTerm,
  riskFilter,
  onSearchTermChange,
  onRiskFilterChange,
  dirtyCount,
}) {
  const metrics = buildMetrics(rows, skills);

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Estudiantes"
          value={rows.length}
          detail={`${filteredCount} visibles con filtros activos`}
        />
        <MetricCard
          icon={TrendingUp}
          label="Promedio grupal"
          value={metrics.average}
          detail="Escala de 1 a 3"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Seguimiento prioritario"
          value={metrics.highRisk}
          detail="Requieren revision cercana"
          tone={metrics.highRisk > 0 ? "danger" : "default"}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Observaciones"
          value={metrics.observed}
          detail={`${dirtyCount} cambios pendientes`}
          tone={dirtyCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Control de vista
            </p>
            <h2 className="mt-1 text-lg font-bold">Busqueda y seguimiento</h2>
          </div>
          <Badge tone="muted">{filteredCount} resultados</Badge>
        </div>

        <label className="mt-4 block">
          <span className="sr-only">Buscar estudiante</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={searchTerm}
              placeholder="Buscar por nombre o correo"
              onChange={(event) => onSearchTermChange(event.target.value)}
            />
          </div>
        </label>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {riskOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                riskFilter === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-white hover:bg-muted"
              }`}
              onClick={() => onRiskFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function getRowRisk(row, skills) {
  return generateLocalFeedback({ row, skills }).riskLevel;
}

function buildMetrics(rows, skills) {
  const totalScores = rows.flatMap((row) => skills.map((skill) => Number(row.scores[skill.id] ?? 0)));
  const average = totalScores.length
    ? (totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length).toFixed(2)
    : "0.00";
  const highRisk = rows.filter((row) => getRowRisk(row, skills) === "high").length;
  const observed = rows.filter((row) => row.observations?.trim()).length;

  return { average, highRisk, observed };
}

function MetricCard({ icon: Icon, label, value, detail, tone = "default" }) {
  const toneClass =
    tone === "danger"
      ? "bg-red-50 text-red-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : "bg-cyan-50 text-cyan-700";

  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-extrabold">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

export function riskLabel(riskLevel) {
  return riskLabels[riskLevel] ?? "Regular";
}
