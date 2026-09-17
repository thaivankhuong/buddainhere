import { LotusFlowerGraphic } from "./SettingsIcons";

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
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin text-amber-600"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.18" />
        <LotusFlowerGraphic strokeWidth={1.2} />
      </svg>
      {label && <span className="text-sm text-amber-800">{label}</span>}
    </div>
  );
}
