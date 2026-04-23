import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCheck, Lock, Save } from "lucide-react";

export function StageHeader({
  group,
  stage,
  dirtyCount,
  allChecklistDone,
  onSave,
  onFinalize,
  disabled,
  isSaving,
}) {
  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-col gap-5 border-b p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
            Evaluacion de pasantias
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            {group.name} · {group.specialty}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge>{stage.name}</Badge>
            <Badge tone="muted">
              {stage.startsAt} al {stage.endsAt}
            </Badge>
            <Badge tone={stage.isLocked ? "danger" : "warning"}>
              {stage.isLocked ? "Etapa cerrada" : "Edicion abierta"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onSave} disabled={disabled || isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Guardando..." : `Guardar ${dirtyCount > 0 ? `(${dirtyCount})` : ""}`}
          </Button>
          <Button
            variant="secondary"
            onClick={onFinalize}
            disabled={disabled || !allChecklistDone || isSaving}
          >
            {stage.isLocked ? (
              <Lock className="mr-2 h-4 w-4" />
            ) : (
              <CheckCheck className="mr-2 h-4 w-4" />
            )}
            {stage.isLocked ? "Etapa bloqueada" : "Cerrar etapa y notificar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Profesor responsable
          </p>
          <p className="mt-1 text-base font-semibold">{group.teacherName}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Restricción
          </p>
          <p className="mt-1 text-base font-semibold">
            Solo edicion del grupo asignado; cierre irreversible por etapa.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Escala activa
        </p>
          <p className="mt-1 text-base font-semibold">1 = Bajo, 2 = Medio, 3 = Esperado</p>
        </div>
      </div>
    </section>
  );
}
