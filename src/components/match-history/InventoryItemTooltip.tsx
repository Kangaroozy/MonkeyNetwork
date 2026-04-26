import type { WinnerInventorySlotItem } from "@contracts/match-history";

type Props = {
  item: WinnerInventorySlotItem;
};

function prettifyToken(value: string): string {
  return value
    .replace(/^minecraft:/i, "")
    .replace(/[_:]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function InventoryItemTooltip({ item }: Props) {
  return (
    <div className="min-w-[220px] max-w-[280px] space-y-2">
      <p className="text-sm font-semibold text-[#F6F6FF]">
        {item.displayName} <span className="text-[#8E8EA2]">x{item.amount}</span>
      </p>
      {item.lore.length > 0 && (
        <div className="space-y-0.5">
          {item.lore.map((line, index) => (
            <p key={`${line}-${index}`} className="text-xs text-[#B7B7CC]">
              {line}
            </p>
          ))}
        </div>
      )}
      {item.enchantments.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.08em] text-[#8B8BA1]">Enchantments</p>
          <ul className="space-y-0.5">
            {item.enchantments.map((enchant) => (
              <li key={`${enchant.key}-${enchant.level}`} className="text-xs text-[#90B4FF]">
                {prettifyToken(enchant.key)} {enchant.level}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1 text-[11px] text-[#8D8DA2]">
        <span>Material</span>
        <span className="text-right text-[#C7C7D8]">{prettifyToken(item.material)}</span>
        {item.customModelData !== null && (
          <>
            <span>Custom Model Data</span>
            <span className="text-right text-[#C7C7D8]">{item.customModelData}</span>
          </>
        )}
        {item.damage !== null && (
          <>
            <span>Damage</span>
            <span className="text-right text-[#C7C7D8]">{item.damage}</span>
          </>
        )}
        <span>Unbreakable</span>
        <span className="text-right text-[#C7C7D8]">{item.unbreakable ? "Yes" : "No"}</span>
      </div>
    </div>
  );
}
