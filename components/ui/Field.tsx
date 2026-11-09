import { Input } from "@/components/ui/Input";
import type { InputProps } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

type FieldProps = Omit<InputProps, "id" | "aria-describedby" | "aria-invalid"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
};

/**
 * Поле с подписью и текстом ошибки. Ошибка и подсказка связаны с input через
 * aria-describedby, поэтому скринридер зачитывает их вместе с полем.
 */
export function Field({ id, label, hint, error, className, ...inputProps }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="block text-lg font-semibold text-ink">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-base text-muted">
          {hint}
        </p>
      ) : null}
      <Input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-base font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
