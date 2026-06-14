export const AI_FEEDBACK_MODEL_VERSION = "rules-v1";

export function normalizeFeedback(feedback) {
  if (!feedback) return null;

  return {
    id: feedback.id,
    riskLevel: feedback.riskLevel ?? feedback.risk_level ?? "medium",
    strengths: feedback.strengths ?? [],
    improvementAreas: feedback.improvementAreas ?? feedback.improvement_areas ?? [],
    studentRecommendations:
      feedback.studentRecommendations ?? feedback.student_recommendations ?? [],
    teacherRecommendations:
      feedback.teacherRecommendations ?? feedback.teacher_recommendations ?? [],
    summary: feedback.summary ?? "",
    modelVersion: feedback.modelVersion ?? feedback.model_version ?? AI_FEEDBACK_MODEL_VERSION,
    generatedAt: feedback.generatedAt ?? feedback.generated_at ?? null,
  };
}

export function generateLocalFeedback({ row, skills }) {
  const scoredSkills = skills
    .map((skill) => ({
      ...skill,
      score: Number(row.scores[skill.id] ?? 3),
    }))
    .filter((skill) => Number.isFinite(skill.score));

  const average =
    scoredSkills.reduce((sum, skill) => sum + skill.score, 0) / Math.max(scoredSkills.length, 1);
  const lowScores = scoredSkills.filter((skill) => skill.score <= 1);
  const developingScores = scoredSkills.filter((skill) => skill.score === 2);
  const strongScores = scoredSkills.filter((skill) => skill.score >= 3);
  const softAverage = averageByType(scoredSkills, "soft");
  const cognitiveAverage = averageByType(scoredSkills, "cognitive");
  const riskLevel =
    lowScores.length >= 2 || average < 2 ? "high" : developingScores.length >= 2 ? "medium" : "low";

  const strengths = strongScores.length
    ? strongScores
        .slice(0, 4)
        .map((skill) => `${skill.label}: evidencia un desempeno ${scoreLabel(skill.score)}.`)
    : ["Mantiene una base de trabajo que puede fortalecerse con acompanamiento continuo."];

  const improvementAreas = [...lowScores, ...developingScores]
    .slice(0, 4)
    .map((skill) => `${skill.label}: se encuentra ${scoreLabel(skill.score)} y requiere seguimiento.`);

  if (!improvementAreas.length) {
    improvementAreas.push("No se observan areas criticas en la evaluacion actual.");
  }

  return normalizeFeedback({
    riskLevel,
    strengths,
    improvementAreas,
    studentRecommendations: [
      "Revisar las observaciones del docente y convertirlas en dos metas concretas para la siguiente etapa.",
      lowScores.length
        ? `Practicar de forma prioritaria ${lowScores[0].label} con apoyo guiado.`
        : "Mantener los habitos que sostienen los puntajes esperados.",
      cognitiveAverage < softAverage
        ? "Dedicar sesiones cortas a resolver ejercicios tecnicos relacionados con la especialidad."
        : "Aplicar las fortalezas personales para apoyar el trabajo tecnico de la pasantia.",
    ],
    teacherRecommendations: [
      riskLevel === "high"
        ? "Programar una revision individual y definir acuerdos de mejora con fecha de seguimiento."
        : "Dar seguimiento en la siguiente evaluacion para confirmar estabilidad del desempeno.",
      developingScores.length
        ? `Observar especificamente ${developingScores[0].label} durante actividades practicas.`
        : "Reconocer las fortalezas observadas y asignar retos proporcionales al avance.",
      "Registrar evidencia breve de las acciones de apoyo aplicadas para mantener trazabilidad.",
    ],
    summary: `Promedio general ${average.toFixed(
      2,
    )}. Se identificaron ${lowScores.length} habilidad(es) que requieren apoyo prioritario.`,
    modelVersion: AI_FEEDBACK_MODEL_VERSION,
    generatedAt: new Date().toISOString(),
  });
}

function scoreLabel(score) {
  if (score >= 3) return "esperado";
  if (score === 2) return "en desarrollo";
  return "requiere apoyo";
}

function averageByType(skills, type) {
  const filtered = skills.filter((skill) => skill.type === type);
  if (!filtered.length) return 0;
  return filtered.reduce((sum, skill) => sum + skill.score, 0) / filtered.length;
}
