interface Props {
  size?: number;
  className?: string;
  label?: string;
}

export default function DharmaSpinner({ size = 28, className = "", label }: Props) {
  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`} role="status" aria-live="polite">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        className="animate-spin text-amber-600"
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <g fill="currentColor">
          <rect x="28" y="12" width="8" height="16" rx="1" />
          <rect x="28" y="36" width="8" height="16" rx="1" />
          <rect x="12" y="28" width="16" height="8" rx="1" />
          <rect x="36" y="28" width="16" height="8" rx="1" />
          <rect x="18" y="18" width="8" height="8" rx="1" transform="rotate(-45 22 22)" />
          <rect x="38" y="18" width="8" height="8" rx="1" transform="rotate(45 42 22)" />
          <rect x="18" y="38" width="8" height="8" rx="1" transform="rotate(45 22 42)" />
          <rect x="38" y="38" width="8" height="8" rx="1" transform="rotate(-45 42 42)" />
        </g>
        <circle cx="32" cy="32" r="4" fill="currentColor" />
      </svg>
      {label && <span className="text-sm text-amber-800">{label}</span>}
    </div>
  );
}
