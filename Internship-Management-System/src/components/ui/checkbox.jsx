export function Checkbox({ checked, onCheckedChange, ...props }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
      {...props}
    />
  );
}
