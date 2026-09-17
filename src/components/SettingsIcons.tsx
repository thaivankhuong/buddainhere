export function IconMonitor() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function IconPosition() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEffects() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l1 2 2 1-1 2-2-1-1 2-1-2-2-1 1-2 2 1 1-2z" />
    </svg>
  );
}

export function IconSound() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 010 7M18 6a8 8 0 010 12" />
    </svg>
  );
}

export function IconGallery() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

export function IconPreview() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function LotusFlowerGraphic({ strokeWidth = 1.4 }: { strokeWidth?: number }) {
  return (
    <>
      <path
        d="M12 4.5 C12 4.5 10.8 7.5 10.8 9.8 C10.8 11.2 11.3 12.1 12 12.6 C12.7 12.1 13.2 11.2 13.2 9.8 C13.2 7.5 12 4.5 12 4.5Z"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M12 5 C12 5 9.8 6.5 8.7 8.6 C8.2 9.5 8.6 10.4 9.3 11 C10.2 10 10.6 9 10.6 8 C10.6 7.2 11.2 6.2 12 5Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M12 5 C12 5 14.2 6.5 15.3 8.6 C15.8 9.5 15.4 10.4 14.7 11 C13.8 10 13.4 9 13.4 8 C13.4 7.2 12.8 6.2 12 5Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M12 5.8 C12 5.8 9.2 7.2 7.8 9.5 C7.1 10.7 7.7 11.8 8.8 12.4 C9.6 11.2 10.1 9.8 10.3 8.7 C10.4 7.9 10.9 7.1 12 5.8Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M12 5.8 C12 5.8 14.8 7.2 16.2 9.5 C16.9 10.7 16.3 11.8 15.2 12.4 C14.4 11.2 13.9 9.8 13.7 8.7 C13.6 7.9 13.1 7.1 12 5.8Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path d="M12 12.6 L12 17.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M12 15.5 C11 16.2 10.2 16.7 9.5 17.2" stroke="currentColor" strokeWidth={strokeWidth * 0.85} strokeLinecap="round" />
      <path d="M12 15.5 C13 16.2 13.8 16.7 14.5 17.2" stroke="currentColor" strokeWidth={strokeWidth * 0.85} strokeLinecap="round" />
      <circle cx="12" cy="9.5" r="0.55" fill="currentColor" />
    </>
  );
}

export function IconLotus() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <LotusFlowerGraphic strokeWidth={1.3} />
    </svg>
  );
}
