import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChecklistPanel } from "@/features/gradebook/components/ChecklistPanel";
import { EvaluationPreview } from "@/features/gradebook/components/EvaluationPreview";
import { GradebookTable } from "@/features/gradebook/components/GradebookTable";
import { StageHeader } from "@/features/gradebook/components/StageHeader";
import {
  buildSavePayload,
  clampScore,
  createInitialGradebook,
} from "@/features/gradebook/utils/gradebook";

export default function App() {
  const [gradebook, setGradebook] = useState(createInitialGradebook);
  const [dirtyRows, setDirtyRows] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [saveMessage, setSaveMessage] = useState("Sin cambios pendientes.");

  const allChecklistDone = gradebook.checklist.every((item) => item.done);

  const savePayload = useMemo(() => buildSavePayload(gradebook), [gradebook]);
  const selectedRow = gradebook.rows[selectedRowIndex];

  function markDirty(rowIndex) {
    setDirtyRows((previous) => new Set(previous).add(rowIndex));
  }

  function updateScore(rowIndex, skillId, value) {
    setGradebook((current) => {
      const nextRows = [...current.rows];
      nextRows[rowIndex] = {
        ...nextRows[rowIndex],
        scores: {
          ...nextRows[rowIndex].scores,
          [skillId]: clampScore(value),
        },
      };

      return { ...current, rows: nextRows };
    });
    markDirty(rowIndex);
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

          <EvaluationPreview
            group={gradebook.group}
            stage={gradebook.stage}
            row={selectedRow}
            skills={gradebook.skills}
            disabled={gradebook.stage.isLocked}
          />

          <section className="surface p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Estado de integracion
            </p>
            <div className="mt-3 space-y-3">
              <Badge>{saveMessage}</Badge>
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
