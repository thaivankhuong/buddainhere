interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

export default function ToggleSwitch({ checked, onChange, disabled, label, id }: Props) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-2 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span className="toggle-switch">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="toggle-switch-input"
        />
        <span className="toggle-switch-track" aria-hidden="true" />
      </span>
      {label && <span className="text-sm text-stone-700">{label}</span>}
    </label>
  );
}
