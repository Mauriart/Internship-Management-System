import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type SkillScore = {
  label: string;
  type: "soft" | "cognitive";
  score: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function scoreLabel(score: number) {
  if (score >= 3) return "esperado";
  if (score === 2) return "en desarrollo";
  return "requiere apoyo";
}

function buildFeedback(scores: SkillScore[]) {
  const validScores = scores.filter((score) => Number.isFinite(score.score));
  const average =
    validScores.reduce((sum, item) => sum + item.score, 0) / Math.max(validScores.length, 1);
  const lowScores = validScores.filter((item) => item.score <= 1);
  const developingScores = validScores.filter((item) => item.score === 2);
  const strongScores = validScores.filter((item) => item.score >= 3);
  const softAverage = averageByType(validScores, "soft");
  const cognitiveAverage = averageByType(validScores, "cognitive");

  const riskLevel = lowScores.length >= 2 || average < 2 ? "high" : developingScores.length >= 2 ? "medium" : "low";

  const strengths = strongScores.length
    ? strongScores
        .slice(0, 4)
        .map((item) => `${item.label}: evidencia un desempeno ${scoreLabel(item.score)}.`)
    : ["Mantiene una base de trabajo que puede fortalecerse con acompanamiento continuo."];

  const improvementAreas = [...lowScores, ...developingScores]
    .slice(0, 4)
    .map((item) => `${item.label}: se encuentra ${scoreLabel(item.score)} y requiere seguimiento.`);

  if (!improvementAreas.length) {
    improvementAreas.push("No se observan areas criticas en la evaluacion actual.");
  }

  const studentRecommendations = [
    "Revisar las observaciones del docente y convertirlas en dos metas concretas para la siguiente etapa.",
    lowScores.length
      ? `Practicar de forma prioritaria ${lowScores[0].label} con apoyo guiado.`
      : "Mantener los habitos que sostienen los puntajes esperados.",
    cognitiveAverage < softAverage
      ? "Dedicar sesiones cortas a resolver ejercicios tecnicos relacionados con la especialidad."
      : "Aplicar las fortalezas personales para apoyar el trabajo tecnico de la pasantia.",
  ];

  const teacherRecommendations = [
    riskLevel === "high"
      ? "Programar una revision individual y definir acuerdos de mejora con fecha de seguimiento."
      : "Dar seguimiento en la siguiente evaluacion para confirmar estabilidad del desempeno.",
    developingScores.length
      ? `Observar especificamente ${developingScores[0].label} durante actividades practicas.`
      : "Reconocer las fortalezas observadas y asignar retos proporcionales al avance.",
    "Registrar evidencia breve de las acciones de apoyo aplicadas para mantener trazabilidad.",
  ];

  const summary = `Promedio general ${average.toFixed(
    2,
  )}. Se identificaron ${lowScores.length} habilidad(es) que requieren apoyo prioritario.`;

  return {
    risk_level: riskLevel,
    strengths,
    improvement_areas: improvementAreas,
    student_recommendations: studentRecommendations,
    teacher_recommendations: teacherRecommendations,
    summary,
    model_version: "rules-v1",
  };
}

function averageByType(scores: SkillScore[], type: SkillScore["type"]) {
  const filtered = scores.filter((item) => item.type === type);
  if (!filtered.length) return 0;
  return filtered.reduce((sum, item) => sum + item.score, 0) / filtered.length;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { studentId, stageId } = await request.json();

    if (!studentId || !stageId) {
      return jsonResponse({ error: "studentId y stageId son requeridos." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authorization = request.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !authorization) {
      return jsonResponse({ error: "La funcion no tiene configuracion completa de Supabase." }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });

    const { data: evaluation, error: evaluationError } = await supabase
      .from("evaluations")
      .select("id, student_id, stage_id, observations, evaluation_scores(score, skills(label, skill_type))")
      .eq("student_id", studentId)
      .eq("stage_id", stageId)
      .maybeSingle();

    if (evaluationError) throw evaluationError;
    if (!evaluation) {
      return jsonResponse({ error: "No se encontro evaluacion para el estudiante y etapa indicados." }, 404);
    }

    const scores = (evaluation.evaluation_scores ?? [])
      .map((scoreRow: { score: number; skills?: { label?: string; skill_type?: "soft" | "cognitive" } }) => ({
        label: scoreRow.skills?.label ?? "Habilidad sin nombre",
        type: scoreRow.skills?.skill_type ?? "soft",
        score: Number(scoreRow.score),
      }))
      .filter((item: SkillScore) => item.score >= 1 && item.score <= 3);

    if (!scores.length) {
      return jsonResponse({ error: "La evaluacion no tiene puntajes registrados." }, 422);
    }

    const feedback = buildFeedback(scores);
    const { data: savedFeedback, error: saveError } = await supabase
      .from("ai_feedback")
      .upsert(
        {
          student_id: studentId,
          stage_id: stageId,
          evaluation_id: evaluation.id,
          ...feedback,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,stage_id" },
      )
      .select("*")
      .single();

    if (saveError) throw saveError;

    return jsonResponse({ feedback: savedFeedback });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "No se pudo generar la retroalimentacion." },
      500,
    );
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
