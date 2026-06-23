export function PhoneIcon({ className = "" }) {
  return (
    <svg
      className={"h-5 w-5 " + className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M2.5 3.5A2.5 2.5 0 015 1h2a2 2 0 012 1.72l.2 1.8a2 2 0 01-.55 1.63l-.99.99a10.5 10.5 0 005.55 5.55l.99-.99a2 2 0 011.63-.55l1.8.2A2 2 0 0119 15v2a2.5 2.5 0 01-2.5 2.5C8.8 19.5 0.5 11.2 0.5 4A3 3 0 012.5 3.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function ArrowRightIcon({ className = "" }) {
  return (
    <svg
      className={"h-5 w-5 " + className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function RefreshIcon({ className = "" }) {
  return (
    <svg
      className={"h-5 w-5 " + className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 10.293a1 1 0 00-1.414 1.414 4.5 4.5 0 11-1.06-4.998 1 1 0 001.402-1.414A6.5 6.5 0 1016.707 10.293z"
        clipRule="evenodd"
      />
      <path
        d="M13 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0V5.414l-2.293 2.293a1 1 0 01-1.414-1.414L16.586 4H14a1 1 0 01-1-1z"
      />
    </svg>
  );
}

