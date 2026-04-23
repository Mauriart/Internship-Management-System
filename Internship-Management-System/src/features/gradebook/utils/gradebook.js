import {
  cognitiveSkillsBySpecialty,
  defaultChecklist,
  defaultStage,
  softSkills,
  students,
  teacherGroup,
} from "@/lib/mock-data";

export function buildSkillColumns(specialty) {
  return [...softSkills, ...(cognitiveSkillsBySpecialty[specialty] ?? [])];
}

export function createInitialRows() {
  const columns = buildSkillColumns(teacherGroup.specialty);

  return students.map((student) => ({
    student,
    scores: Object.fromEntries(columns.map((skill) => [skill.id, 3])),
    observations: "",
    status: "draft",
  }));
}

export function createInitialGradebook() {
  return {
    group: teacherGroup,
    stage: defaultStage,
    checklist: defaultChecklist,
    skills: buildSkillColumns(teacherGroup.specialty),
    rows: createInitialRows(),
  };
}

export function clampScore(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 3;
  return Math.min(3, Math.max(1, numeric));
}

export function buildSavePayload(gradebook) {
  return gradebook.rows.map((row) => ({
    student_id: row.student.id,
    stage_id: gradebook.stage.id,
    observations: row.observations,
    rubric_scores: Object.entries(row.scores).map(([skillId, score]) => ({
      skill_id: skillId,
      score,
    })),
  }));
}
