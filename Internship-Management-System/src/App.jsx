import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChecklistPanel } from "@/features/gradebook/components/ChecklistPanel";
import { EvaluationPreview } from "@/features/gradebook/components/EvaluationPreview";
import { GradebookTable } from "@/features/gradebook/components/GradebookTable";
import { StageHeader } from "@/features/gradebook/components/StageHeader";
import {
  buildSavePayload,
  clampScore,
  createGradebookFromSupabase,
  createInitialGradebook,
} from "@/features/gradebook/utils/gradebook";
import { supabase } from "@/lib/supabase";

export default function App() {
  const [useMock, setUseMock] = useState(false);
  const [gradebook, setGradebook] = useState(createInitialGradebook);
  const [evaluationIds, setEvaluationIds] = useState({});
  const [dirtyRows, setDirtyRows] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [saveMessage, setSaveMessage] = useState("Sin cambios pendientes.");

  const allChecklistDone = gradebook.checklist.every((item) => item.done);

  const savePayload = useMemo(() => buildSavePayload(gradebook), [gradebook]);
  const selectedRow = gradebook.rows[selectedRowIndex];

  useEffect(() => {
    if (useMock) {
      setGradebook(createInitialGradebook());
      setEvaluationIds({});
      setSelectedRowIndex(0);
      setIsLoading(false);
      setLoadError("");
      setSaveMessage("Usando datos mock locales.");
      return;
    }

    let ignore = false;

    async function loadGradebook() {
      if (!supabase) {
        setLoadError("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.");
        return;
      }

      setIsLoading(true);
      setLoadError("");

      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userResult?.user) {
        throw new Error("Debes iniciar sesion para consultar grupos y evaluaciones.");
      }

      const { data: groups, error: groupsError } = await supabase
        .from("student_groups")
        .select("id, code, label, school_year, specialty_id, specialties(name)")
        .order("code", { ascending: true });

      if (groupsError) throw groupsError;
      if (!groups?.length) {
        throw new Error("No se encontraron grupos disponibles para el usuario actual.");
      }

      const selectedGroup = groups[0];

      const [{ data: students, error: studentsError }, { data: skills, error: skillsError }, { data: stage, error: stageError }] =
        await Promise.all([
          supabase
            .from("students")
            .select("id, student_code, full_name, email, group_id")
            .eq("group_id", selectedGroup.id)
            .order("full_name", { ascending: true }),
          supabase
            .from("skills")
            .select("id, label, skill_type, specialty_id, sort_order")
            .eq("is_active", true)
            .or(`specialty_id.is.null,specialty_id.eq.${selectedGroup.specialty_id}`)
            .order("sort_order", { ascending: true }),
          supabase
            .from("stages")
            .select("id, name, starts_on, ends_on, is_open")
            .eq("is_open", true)
            .order("starts_on", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      if (studentsError) throw studentsError;
      if (skillsError) throw skillsError;
      if (stageError) throw stageError;
      if (!stage) throw new Error("No hay una etapa abierta configurada.");

      const studentIds = (students ?? []).map((student) => student.id);
      let evaluations = [];

      if (studentIds.length > 0) {
        const { data: existingEvaluations, error: evaluationsError } = await supabase
          .from("evaluations")
          .select("id, student_id, stage_id")
          .eq("stage_id", stage.id)
          .in("student_id", studentIds);

        if (evaluationsError) throw evaluationsError;

        evaluations = existingEvaluations ?? [];
        const existingStudentIds = new Set(evaluations.map((evaluation) => evaluation.student_id));
        const missingEvaluations = (students ?? [])
          .filter((student) => !existingStudentIds.has(student.id))
          .map((student) => ({
            student_id: student.id,
            stage_id: stage.id,
            evaluator_profile_id: userResult.user.id,
            group_id: selectedGroup.id,
          }));

        if (missingEvaluations.length > 0) {
          const { data: insertedEvaluations, error: insertError } = await supabase
            .from("evaluations")
            .insert(missingEvaluations)
            .select("id, student_id, stage_id");

          if (insertError) throw insertError;

          evaluations = [...evaluations, ...(insertedEvaluations ?? [])];
        }
      }

      if (!ignore) {
        setGradebook(
          createGradebookFromSupabase({
            group: selectedGroup,
            stage,
            skills: skills ?? [],
            students: students ?? [],
          }),
        );
        setEvaluationIds(
          Object.fromEntries(
            evaluations.map((evaluation) => [evaluation.student_id, evaluation.id]),
          ),
        );
        setDirtyRows(new Set());
        setSelectedRowIndex(0);
        setSaveMessage(
          `Datos reales cargados. ${evaluations.length} evaluaciones listas; scores aun no se guardan.`,
        );
      }
    }

    loadGradebook()
      .catch((error) => {
        if (!ignore) {
          setLoadError(error.message || "No se pudieron cargar datos desde Supabase.");
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [useMock]);

  function markDirty(rowIndex) {
    setDirtyRows((previous) => new Set(previous).add(rowIndex));
  }

  function clearDirty(rowIndex) {
    setDirtyRows((previous) => {
      const nextDirtyRows = new Set(previous);
      nextDirtyRows.delete(rowIndex);
      return nextDirtyRows;
    });
  }

  async function updateScore(rowIndex, skillId, value) {
    const nextScore = clampScore(value);
    const currentRow = gradebook.rows[rowIndex];
    const previousScore = currentRow?.scores[skillId];
    const studentId = currentRow?.student.id;
    const evaluationId = evaluationIds[studentId];

    function restorePreviousScore() {
      setGradebook((current) => {
        const nextRows = [...current.rows];
        nextRows[rowIndex] = {
          ...nextRows[rowIndex],
          scores: {
            ...nextRows[rowIndex].scores,
            [skillId]: previousScore,
          },
        };

        return { ...current, rows: nextRows };
      });
    }

    setGradebook((current) => {
      const nextRows = [...current.rows];
      nextRows[rowIndex] = {
        ...nextRows[rowIndex],
        scores: {
          ...nextRows[rowIndex].scores,
          [skillId]: nextScore,
        },
      };

      return { ...current, rows: nextRows };
    });
    markDirty(rowIndex);

    if (useMock) {
      setSaveMessage("Puntaje actualizado solo en mocks locales.");
      return;
    }

    if (!supabase || !evaluationId) {
      restorePreviousScore();
      clearDirty(rowIndex);
      setSaveMessage("No se pudo guardar el puntaje: falta la evaluacion vinculada.");
      return;
    }

    const { error } = await supabase
      .from("evaluation_scores")
      .upsert(
        {
          evaluation_id: evaluationId,
          skill_id: skillId,
          score: nextScore,
        },
        { onConflict: "evaluation_id,skill_id" },
      );

    if (error) {
      restorePreviousScore();
      clearDirty(rowIndex);
      setSaveMessage(`No se pudo guardar el puntaje: ${error.message}`);
      return;
    }

    clearDirty(rowIndex);
    setSaveMessage("Puntaje guardado en Supabase.");
  }

  function updateObservation(rowIndex, value) {
    setGradebook((current) => {
      const nextRows = [...current.rows];
      nextRows[rowIndex] = {
        ...nextRows[rowIndex],
        observations: value,
      };

      return { ...current, rows: nextRows };
    });
    markDirty(rowIndex);
  }

  function toggleChecklist(index) {
    setGradebook((current) => {
      const nextChecklist = [...current.checklist];
      nextChecklist[index] = {
        ...nextChecklist[index],
        done: !nextChecklist[index].done,
      };
      return { ...current, checklist: nextChecklist };
    });
  }

  async function handleSave() {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.info("Bulk payload ready for Supabase upsert", savePayload);
    setDirtyRows(new Set());
    setSaveMessage(
      `Se preparo un lote de ${savePayload.length} evaluaciones para upsert en Supabase.`,
    );
    setIsSaving(false);
  }

  async function handleFinalize() {
    if (!allChecklistDone) return;

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setGradebook((current) => ({
      ...current,
      stage: {
        ...current.stage,
        isLocked: true,
      },
    }));
    setDirtyRows(new Set());
    setSaveMessage(
      "Etapa cerrada. A partir de aqui la UI queda en solo lectura y se puede disparar el correo automatico.",
    );
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:px-8">
        <section className="surface p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Cargando
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">Leyendo datos desde Supabase...</h1>
        </section>
      </main>
    );
  }

  if (loadError && !useMock) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:px-8">
        <section className="surface p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-destructive">
            Error de lectura
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">No se pudieron cargar datos reales.</h1>
          <p className="mt-3 text-sm text-muted-foreground">{loadError}</p>
          <Button className="mt-5" variant="outline" onClick={() => setUseMock(true)}>
            Usar mocks locales
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:px-8">
      <StageHeader
        group={gradebook.group}
        stage={gradebook.stage}
        dirtyCount={dirtyRows.size}
        allChecklistDone={allChecklistDone}
        onSave={handleSave}
        onFinalize={handleFinalize}
        disabled={gradebook.stage.isLocked}
        isSaving={isSaving}
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <GradebookTable
          skills={gradebook.skills}
          rows={gradebook.rows}
          disabled={gradebook.stage.isLocked}
          selectedRowIndex={selectedRowIndex}
          onSelectRow={setSelectedRowIndex}
          onScoreChange={updateScore}
          onObservationChange={updateObservation}
        />
        <div className="space-y-6">
          <ChecklistPanel
            items={gradebook.checklist}
            disabled={gradebook.stage.isLocked}
            onToggle={toggleChecklist}
          />

          {selectedRow ? (
            <EvaluationPreview
              group={gradebook.group}
              stage={gradebook.stage}
              row={selectedRow}
              skills={gradebook.skills}
              disabled={gradebook.stage.isLocked}
            />
          ) : (
            <section className="surface p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Sin estudiantes
              </p>
              <h2 className="mt-1 text-lg font-bold">
                El grupo seleccionado no tiene estudiantes registrados.
              </h2>
            </section>
          )}

          <section className="surface p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Estado de integracion
            </p>
            <div className="mt-3 space-y-3">
              <Badge>{saveMessage}</Badge>
              <Badge tone="muted">
                {Object.keys(evaluationIds).length} evaluaciones vinculadas
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              El payload masivo sigue disponible para conectar el `upsert` con Supabase cuando quieras.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(savePayload, null, 2))}
            >
              Copiar payload JSON
            </Button>
          </section>
        </div>
      </div>
    </main>
  );
}
