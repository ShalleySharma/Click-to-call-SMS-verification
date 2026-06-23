import { useMemo, useState } from "react";

export default function CodeBlock({ value, onCopy, copied = false }) {
  const text = useMemo(() => {
    if (value == null) return "";
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-100">API Response</p>
        <span
          className="text-xs text-slate-400"
          aria-live="polite"
        >
          {copied ? "Copied" : ""}
        </span>
      </div>

      <pre
        className="min-h-[120px] overflow-auto rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-relaxed text-slate-200"
      >
        {text ? text : "—"}
      </pre>

      <button
        type="button"
        onClick={onCopy}
        className={
          "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm " +
          "text-slate-100 transition-all duration-200 " +
          "hover:bg-white/10 hover:border-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/10"
        }
        disabled={!text}
        aria-disabled={!text}
      >
        {copied ? "Copy again" : "Copy response"}
      </button>
    </div>
  );
}

