import {
  SCHEDULE_DURATION_OPTIONS,
  newId,
  type ScheduleSlot,
} from "../types/config";
import { formatTimeInput } from "../utils/schedule";
import CycleDurationInput from "./CycleDurationInput";
import ToggleSwitch from "./ToggleSwitch";

interface Props {
  enabled: boolean;
  slots: ScheduleSlot[];
  onEnabledChange: (enabled: boolean) => void;
  onSlotsChange: (slots: ScheduleSlot[]) => void;
}

function createDefaultSlot(): ScheduleSlot {
  return {
    id: newId(),
    enabled: true,
    time: "08:00",
    durationSecs: 30,
  };
}

export default function ScheduleSlotsEditor({
  enabled,
  slots,
  onEnabledChange,
  onSlotsChange,
}: Props) {
  function updateSlot(id: string, partial: Partial<ScheduleSlot>) {
    onSlotsChange(slots.map((s) => (s.id === id ? { ...s, ...partial } : s)));
  }

  function removeSlot(id: string) {
    onSlotsChange(slots.filter((s) => s.id !== id));
  }

  function addSlot() {
    onSlotsChange([...slots, createDefaultSlot()]);
  }

  return (
    <div className="space-y-3">
      <ToggleSwitch
        id="schedule-enabled"
        checked={enabled}
        onChange={onEnabledChange}
        label="Bật hẹn giờ"
      />

      <p className="text-xs text-stone-500">
        Chạy song song với chu kỳ lặp — đến đúng giờ sẽ hiện thêm một lần.
      </p>

      {enabled && (
        <>
          <ul className="space-y-2">
            {slots.map((slot, index) => (
              <li
                key={slot.id}
                className="rounded-lg border border-stone-200 bg-stone-50/80 p-2.5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-stone-600">
                    Mốc {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <ToggleSwitch
                      id={`schedule-slot-${slot.id}`}
                      checked={slot.enabled}
                      onChange={(slotEnabled) =>
                        updateSlot(slot.id, { enabled: slotEnabled })
                      }
                      label="Bật"
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(slot.id)}
                      className="rounded border border-stone-300 px-2 py-0.5 text-[11px] text-stone-600 hover:bg-red-50 hover:text-red-700"
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-600">
                      Giờ hiển thị
                    </label>
                    <input
                      type="time"
                      value={formatTimeInput(slot.time)}
                      onChange={(e) =>
                        updateSlot(slot.id, {
                          time: formatTimeInput(e.target.value || "08:00"),
                        })
                      }
                      className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <CycleDurationInput
                    label="Thời gian hiện"
                    value={slot.durationSecs}
                    presets={SCHEDULE_DURATION_OPTIONS}
                    onChange={(durationSecs) =>
                      updateSlot(slot.id, { durationSecs })
                    }
                    compact
                  />
                </div>
              </li>
            ))}
          </ul>

          {slots.length === 0 && (
            <p className="text-xs text-stone-500">
              Chưa có mốc giờ. Thêm mốc để hẹn hiển thị theo đồng hồ.
            </p>
          )}

          <button
            type="button"
            onClick={addSlot}
            className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
          >
            Thêm mốc giờ
          </button>
        </>
      )}
    </div>
  );
}
