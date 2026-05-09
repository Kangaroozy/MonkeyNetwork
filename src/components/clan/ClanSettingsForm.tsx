type ClanSettingsFormProps = {
  trims: readonly string[];
  materials: readonly string[];
  colors?: readonly string[];
  trim: string;
  material: string;
  color?: string;
  onTrimChange: (value: string) => void;
  onMaterialChange: (value: string) => void;
  onColorChange?: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitLabel?: string;
};

export default function ClanSettingsForm({
  trims,
  materials,
  colors = [],
  trim,
  material,
  color,
  onTrimChange,
  onMaterialChange,
  onColorChange,
  onSubmit,
  disabled = false,
  submitLabel = "Save",
}: ClanSettingsFormProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-mn-moss/70 p-4">
      <h3 className="mb-3 text-sm font-semibold text-mn-mist">Clan Cosmetics</h3>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-xs text-mn-fog">
          Armor Trim
          <select
            value={trim}
            onChange={(event) => onTrimChange(event.target.value)}
            disabled={disabled}
            className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
          >
            {trims.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs text-mn-fog">
          Trim Material
          <select
            value={material}
            onChange={(event) => onMaterialChange(event.target.value)}
            disabled={disabled}
            className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
          >
            {materials.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {onColorChange && color ? (
          <label className="flex flex-col gap-2 text-xs text-mn-fog">
            Clan Color
            <select
              value={color}
              onChange={(event) => onColorChange(event.target.value)}
              disabled={disabled}
              className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
            >
              {colors.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="mt-4">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="rounded-lg border border-mn-lime/40 bg-mn-lime/15 px-4 py-2 text-sm font-semibold text-mn-lime transition-all hover:bg-mn-lime/20 active:scale-[0.98] disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
