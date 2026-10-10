import { fieldClass } from "@/lib/ui";

/** A labelled form control for the admin pages. */
export function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={"flex flex-col gap-1 text-sm " + className}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={fieldClass + " " + (props.className ?? "")} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={fieldClass + " " + (props.className ?? "")} />;
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">{children}</h1>;
}
