import { Select } from "@/components/ui";
import { ISLANDS } from "@/lib/constants";

/** Area picker grouped by island (Koh Samui / Koh Phangan / Koh Tao), plus "Other". */
export function AreaSelect({
  name = "area",
  defaultValue,
  required,
  placeholder = "Where is it?",
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <Select name={name} defaultValue={defaultValue ?? ""} required={required}>
      <option value="">{placeholder}</option>
      {ISLANDS.map((island) => (
        <optgroup key={island.name} label={island.name}>
          {island.areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </optgroup>
      ))}
      <option value="Other">Other</option>
    </Select>
  );
}
