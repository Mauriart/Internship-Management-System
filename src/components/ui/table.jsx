import { cn } from "@/lib/utils";

export function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader(props) {
  return <thead className="[&_tr]:border-b" {...props} />;
}

export function TableBody(props) {
  return <tbody className="[&_tr:last-child]:border-0" {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn("border-b transition hover:bg-muted/30", className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        "h-10 px-2 text-left align-middle text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return <td className={cn("p-2 align-middle", className)} {...props} />;
}
