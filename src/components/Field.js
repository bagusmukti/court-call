// Label + control + error message. The control is passed as children and
// should set `id`, `aria-invalid` and `aria-describedby` (see fieldProps).
export default function Field({ id, label, error, hint, large = false, className = "", children }) {
  return (
    <div className={`flex min-w-0 flex-col ${large ? "gap-[7px]" : "gap-1.5"} ${className}`}>
      <label htmlFor={id} className={`cc-label ${large ? "text-[14px]" : ""}`}>
        {label}
      </label>
      {children}
      {hint && !error ? (
        <span id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} className="cc-field-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function fieldProps(id, { error, hint } = {}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return {
    id,
    name: id,
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": describedBy,
  };
}
