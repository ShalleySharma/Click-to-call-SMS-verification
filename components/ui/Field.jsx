import { useId } from "react";

import { PhoneIcon } from "./Icons";

export default function Field({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  error,
  maxLen = 10,
  minLen = 10,
  disabled = false,
  autoComplete = "off",
}) {
  const id = useId();

  const charCount = String(value ?? "").length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm font-semibold text-slate-100">
          {label}
        </label>
        <div className="text-xs text-slate-400 tabular-nums" aria-hidden="true">
          {charCount}/{maxLen}
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          <PhoneIcon className="opacity-90" />
        </div>
        <input
          id={id}
          name={name}
          inputMode="numeric"
          autoComplete={autoComplete}
          disabled={disabled}
          className={
            "w-full rounded-xl border bg-white/5 px-10 py-3 text-base outline-none " +
            "transition-all duration-200 " +
            (error
              ? "border-red-500/40 focus:border-red-500/60 focus:ring-4 focus:ring-red-500/10"
              : "border-white/10 focus:border-white/25 focus:ring-4 focus:ring-white/10")
          }
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            // Enforce digits only at UI level; backend will re-validate.
            const raw = e.target.value ?? "";
            const digitsOnly = raw.replace(/\D/g, "");
            onChange(name, digitsOnly.slice(0, maxLen));
          }}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          className="text-xs text-red-200"
          role="alert"
        >
          {error}
        </p>
      ) : (
        <p className="text-xs text-slate-400">
          Must be exactly {minLen} digits.
        </p>
      )}
    </div>
  );
}

