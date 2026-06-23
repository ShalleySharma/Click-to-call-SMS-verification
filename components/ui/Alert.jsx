export default function Alert({ type = "success", title, message, className = "" }) {
  const palette =
    type === "error"
      ? {
          icon: (
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm0 7a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                clipRule="evenodd"
              />
            </svg>
          ),
          wrap: "bg-red-500/10 border-red-500/20 text-red-200",
        }
      : {
          icon: (
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.174a.75.75 0 00-1.214-.882l-3.483 4.23-1.88-1.72a.75.75 0 10-.999 1.117l2.4 2.2a.75.75 0 001.14-.07l3.036-3.795z"
                clipRule="evenodd"
              />
            </svg>
          ),
          wrap: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
        };

  return (
    <div
      className={
        "rounded-xl border p-4 " + palette.wrap + " " +
        "flex gap-3 items-start " +
        className
      }
      role={type === "error" ? "alert" : "status"}
    >
      <div className="mt-0.5">{palette.icon}</div>
      <div className="min-w-0">
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        {message ? <p className="text-sm opacity-90">{message}</p> : null}
      </div>
    </div>
  );
}

