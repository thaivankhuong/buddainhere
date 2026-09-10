import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}

export default function SettingsSectionCard({ icon, title, extra, children }: Props) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-amber-200/80 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <span className="text-amber-700">{icon}</span>
          {title}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  );
}
