import { useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import type { MonitorInfo } from "../types/config";
import DharmaSpinner from "./DharmaSpinner";

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
}

export default function MonitorPicker({ value, onChange }: Props) {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isTauri()) {
      setLoading(false);
      return;
    }

    let disposed = false;

    invoke<MonitorInfo[]>("get_available_monitors")
      .then((list) => {
        if (!disposed) setMonitors(list);
      })
      .catch((err) => {
        if (!disposed) setError(String(err));
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-1 text-sm text-stone-500">
        <DharmaSpinner size={16} />
        Đang kiểm tra màn hình...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (monitors.length <= 1) {
    const only = monitors[0];
    return (
      <p className="text-sm text-stone-600">
        Máy tính có 1 màn hình — overlay hiển thị trên màn hình này
        {only ? ` (${only.width}×${only.height})` : ""}.
      </p>
    );
  }

  const selectedId = value ?? monitors.find((m) => m.isPrimary)?.id ?? monitors[0]?.id ?? null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-500">
        Phát hiện {monitors.length} màn hình — chọn nơi hiển thị overlay.
      </p>
      <div className="flex flex-col gap-1.5">
        {monitors.map((monitor) => (
          <label
            key={monitor.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              selectedId === monitor.id
                ? "border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-400"
                : "border-stone-200 bg-stone-50 text-stone-700 hover:border-amber-300 hover:bg-amber-50/50"
            }`}
          >
            <input
              type="radio"
              name="overlay-monitor"
              value={monitor.id}
              checked={selectedId === monitor.id}
              onChange={() => onChange(monitor.id)}
              className="accent-amber-600"
            />
            <span className="font-medium">{monitor.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
