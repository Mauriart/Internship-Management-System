import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function GradebookTable({
  skills,
  rows,
  onScoreChange,
  onObservationChange,
  onObservationBlur,
  disabled,
  selectedRowIndex,
  onSelectRow,
}) {
  const [activeCell, setActiveCell] = useState(null);

  return (
    <section className="surface overflow-hidden">
      <div className="border-b px-6 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold">Matriz de calificacion rapida</h2>
            <p className="text-sm text-muted-foreground">
              Los puntajes son seleccionables por celda y la fila activa alimenta la vista PDF.
            </p>
          </div>
          <Badge tone={disabled ? "danger" : "default"}>
            {disabled ? "Solo lectura por cierre" : "Edicion intensiva habilitada"}
          </Badge>
        </div>
      </div>

      <Table className="min-w-[1200px]">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="sticky left-0 z-20 min-w-60 bg-muted/90">Estudiante</TableHead>
            {skills.map((skill) => (
              <TableHead key={skill.id} className="min-w-36 text-center">
                {skill.label}
              </TableHead>
            ))}
            <TableHead className="min-w-72">Observaciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow
              key={row.student.id}
              className={selectedRowIndex === rowIndex ? "bg-accent/20 hover:bg-accent/20" : ""}
              onClick={() => onSelectRow(rowIndex)}
            >
              <TableCell className="sticky left-0 z-10 bg-white">
                <div>
                  <p className="font-semibold">{row.student.fullName}</p>
                  <p className="text-xs text-muted-foreground">{row.student.studentEmail}</p>
                </div>
              </TableCell>

              {skills.map((skill) => {
                const isActive =
                  activeCell?.rowIndex === rowIndex && activeCell?.skillId === skill.id;

                return (
                  <TableCell key={skill.id} className="p-1">
                    <div
                      className={`grid grid-cols-3 gap-1 rounded-xl border bg-white p-1 ${
                        isActive ? "ring-2 ring-ring" : ""
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectRow(rowIndex);
                        setActiveCell({ rowIndex, skillId: skill.id });
                      }}
                    >
                      {[1, 2, 3].map((value) => {
                        const selected = row.scores[skill.id] === value;

                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={disabled}
                            className={`h-8 rounded-lg text-sm font-bold transition ${
                              selected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground hover:bg-accent"
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelectRow(rowIndex);
                              setActiveCell({ rowIndex, skillId: skill.id });
                              onScoreChange(rowIndex, skill.id, value);
                            }}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </TableCell>
                );
              })}

              <TableCell>
                <textarea
                  value={row.observations}
                  disabled={disabled}
                  rows={2}
                  className="min-h-20 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Observaciones para seguimiento, visita o cierre"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectRow(rowIndex);
                  }}
                  onChange={(event) => onObservationChange(rowIndex, event.target.value)}
                  onBlur={() => onObservationBlur?.(rowIndex)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
