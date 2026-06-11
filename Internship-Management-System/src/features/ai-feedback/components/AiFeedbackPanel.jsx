import { BrainCircuit, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiFeedback } from "@/features/ai-feedback/hooks/useAiFeedback";

const riskCopy = {
  low: { label: "Riesgo bajo", tone: "default" },
  medium: { label: "Riesgo medio", tone: "warning" },
  high: { label: "Riesgo alto", tone: "danger" },
};

export function AiFeedbackPanel({ row, skills, stage, disabled, useMock }) {
  const { feedback, status, message, isFallback, generateFeedback } = useAiFeedback({
    row,
    skills,
    stage,
    useMock,
  });
  const isGenerating = status === "generating";
  const risk = riskCopy[feedback?.riskLevel] ?? riskCopy.medium;

  return (
    <section className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-700 text-white">
            <BrainCircuit className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-900/70">
              AI Feedback Assistant
            </p>
            <h4 className="mt-1 text-base font-extrabold text-slate-950">
              Retroalimentacion inteligente
            </h4>
          </div>
        </div>
        {feedback ? <Badge tone={risk.tone}>{risk.label}</Badge> : null}
      </div>

      {feedback ? (
        <div className="mt-4 space-y-4">
          <p className="rounded-xl bg-white/80 p-3 text-sm text-slate-700">{feedback.summary}</p>
          <FeedbackList title="Fortalezas" items={feedback.strengths} />
          <FeedbackList title="Areas de mejora" items={feedback.improvementAreas} />
          <FeedbackList title="Recomendaciones para estudiante" items={feedback.studentRecommendations} />
          <FeedbackList title="Recomendaciones para docente" items={feedback.teacherRecommendations} />
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <Badge tone="muted">{feedback.modelVersion}</Badge>
            {feedback.generatedAt ? (
              <span>Generado: {new Date(feedback.generatedAt).toLocaleString("es-CR")}</span>
            ) : null}
            {isFallback ? <span>Modo demostracion local</span> : null}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-700">
          Genera fortalezas, areas de mejora y recomendaciones a partir de los puntajes actuales.
        </p>
      )}

      {message ? (
        <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700">
          {message}
        </p>
      ) : null}

      <Button
        type="button"
        className="mt-4 w-full gap-2"
        variant={feedback ? "outline" : "default"}
        onClick={generateFeedback}
        disabled={disabled || isGenerating}
      >
        {feedback ? (
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        )}
        {isGenerating
          ? "Analizando..."
          : feedback
            ? "Regenerar retroalimentacion"
            : "Generar retroalimentacion"}
      </Button>
    </section>
  );
}

function FeedbackList({ title, items }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-950/70">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item} className="rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
