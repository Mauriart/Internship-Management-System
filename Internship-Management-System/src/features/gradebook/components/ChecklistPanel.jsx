import { Checkbox } from "@/components/ui/checkbox";

export function ChecklistPanel({ items, onToggle, disabled }) {
  return (
    <section className="surface p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Checklist de cierre
        </p>
        <h2 className="mt-1 text-lg font-bold">Validacion antes de generar tarjetas finales</h2>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <label
            key={item.id}
            className="flex items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm"
          >
            <Checkbox
              checked={item.done}
              disabled={disabled}
              onCheckedChange={() => onToggle(index)}
            />
            <span className="leading-6">{item.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
