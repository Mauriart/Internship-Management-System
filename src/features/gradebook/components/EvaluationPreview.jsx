import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function scoreLabel(score) {
  if (score === 3) return "Esperado";
  if (score === 2) return "En desarrollo";
  return "Requiere apoyo";
}

function buildPrintableHtml({ group, stage, row, skills }) {
  const scoreRows = skills
    .map(
      (skill) => `
        <tr>
          <td>${skill.label}</td>
          <td style="text-align:center;font-weight:700;">${row.scores[skill.id]}</td>
          <td>${scoreLabel(row.scores[skill.id])}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Tarjeta de evaluacion</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
        .header { margin-bottom: 24px; }
        .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
        .card { border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #cbd5e1; padding: 10px; font-size: 14px; }
        th { background: #e2e8f0; text-align: left; }
        .observation { min-height: 100px; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Tarjeta de evaluacion de pasantia</h1>
        <p>${group.name} - ${group.specialty}</p>
        <p>${stage.name}</p>
      </div>
      <div class="meta">
        <div class="card">
          <strong>Estudiante</strong>
          <div>${row.student.fullName}</div>
          <div>${row.student.studentEmail}</div>
        </div>
        <div class="card">
          <strong>Encargado</strong>
          <div>${row.student.guardianEmail}</div>
        </div>
      </div>
      <div class="card">
        <table>
          <thead>
            <tr>
              <th>Habilidad</th>
              <th>Puntaje</th>
              <th>Lectura</th>
            </tr>
          </thead>
          <tbody>${scoreRows}</tbody>
        </table>
      </div>
      <div class="card">
        <strong>Observaciones</strong>
        <div class="observation">${row.observations || "Sin observaciones registradas."}</div>
      </div>
    </body>
  </html>`;
}

export function EvaluationPreview({ group, stage, row, skills, disabled }) {
  const total = skills.reduce((sum, skill) => sum + row.scores[skill.id], 0);
  const average = (total / skills.length).toFixed(2);

  function handlePrint() {
    const previewWindow = window.open("", "_blank", "width=960,height=720");
    if (!previewWindow) return;

    previewWindow.document.open();
    previewWindow.document.write(buildPrintableHtml({ group, stage, row, skills }));
    previewWindow.document.close();
    previewWindow.focus();
    previewWindow.print();
  }

  return (
    <section className="surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Vista previa
          </p>
          <h2 className="mt-1 text-lg font-bold">Tarjeta lista para PDF</h2>
        </div>
        <Badge tone={disabled ? "danger" : "default"}>
          {disabled ? "Cerrada" : "Borrador activo"}
        </Badge>
      </div>

      <div className="mt-4 rounded-3xl border bg-white p-5">
        <div className="border-b pb-4">
          <h3 className="text-xl font-extrabold">{row.student.fullName}</h3>
          <p className="text-sm text-muted-foreground">{group.name}</p>
          <p className="text-sm text-muted-foreground">{stage.name}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-muted/60 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Estudiante
            </p>
            <p className="mt-1 text-sm font-semibold">{row.student.studentEmail}</p>
          </div>
          <div className="rounded-2xl bg-muted/60 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Encargado
            </p>
            <p className="mt-1 text-sm font-semibold">{row.student.guardianEmail}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <span>Habilidad</span>
            <span>Puntaje</span>
            <span>Lectura</span>
          </div>
          <div className="max-h-72 overflow-auto">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="grid grid-cols-[1fr_auto_auto] gap-2 border-b px-3 py-2 text-sm last:border-b-0"
              >
                <span>{skill.label}</span>
                <span className="font-bold">{row.scores[skill.id]}</span>
                <span className="text-muted-foreground">{scoreLabel(row.scores[skill.id])}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-accent/60 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-foreground/70">
              Puntaje total
            </p>
            <p className="mt-1 text-2xl font-extrabold">{total}</p>
          </div>
          <div className="rounded-2xl bg-secondary/60 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary-foreground/70">
              Promedio
            </p>
            <p className="mt-1 text-2xl font-extrabold">{average}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Observaciones
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">
            {row.observations || "Sin observaciones registradas."}
          </p>
        </div>
      </div>

      <Button className="mt-4 w-full" onClick={handlePrint}>
        Abrir vista para PDF
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        Se abre la tarjeta en una ventana lista para imprimir o guardar como PDF.
      </p>
    </section>
  );
}
