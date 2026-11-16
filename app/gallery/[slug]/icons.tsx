export function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4.5 17.25v1.5A2.25 2.25 0 006.75 21h10.5a2.25 2.25 0 002.25-2.25v-1.5"
      />
    </svg>
  );
}
