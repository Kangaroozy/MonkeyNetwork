import type { WinnerInventorySlotItem } from "@contracts/match-history";
import InventorySlot from "./InventorySlot";

type Props = {
  items: WinnerInventorySlotItem[];
  resolveTexture: (item: WinnerInventorySlotItem) => string | null;
};

function indexItemsBySlot(items: WinnerInventorySlotItem[]): Map<string, WinnerInventorySlotItem> {
  const bySlot = new Map<string, WinnerInventorySlotItem>();
  for (const item of items) {
    bySlot.set(item.slotKey, item);
    bySlot.set(`index:${item.slotIndex}`, item);
  }
  return bySlot;
}

function pickItem(
  bySlot: Map<string, WinnerInventorySlotItem>,
  slotKey: string,
  slotIndex: number,
): WinnerInventorySlotItem | null {
  return bySlot.get(slotKey) ?? bySlot.get(`index:${slotIndex}`) ?? null;
}

export default function InventoryGrid({ items, resolveTexture }: Props) {
  const bySlot = indexItemsBySlot(items);
  const armorSlots: Array<{ key: string; label: string; index: number }> = [
    { key: "armor.helmet", label: "Helmet", index: 39 },
    { key: "armor.chestplate", label: "Chest", index: 38 },
    { key: "armor.leggings", label: "Legs", index: 37 },
    { key: "armor.boots", label: "Boots", index: 36 },
  ];
  const offhand = pickItem(bySlot, "offhand", 40);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex gap-2">
          {armorSlots.map((slot) => {
            const item = pickItem(bySlot, slot.key, slot.index);
            return (
              <InventorySlot
                key={slot.key}
                slotLabel={slot.label}
                item={item}
                textureUrl={item ? resolveTexture(item) : null}
              />
            );
          })}
        </div>
        <InventorySlot slotLabel="Offhand" item={offhand} textureUrl={offhand ? resolveTexture(offhand) : null} />
      </div>

      <div className="space-y-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="grid grid-cols-9 gap-1.5">
            {Array.from({ length: 9 }, (_, col) => {
              const slotIndex = 9 + row * 9 + col;
              const item = pickItem(bySlot, `inventory.${slotIndex}`, slotIndex);
              return (
                <InventorySlot key={slotIndex} item={item} textureUrl={item ? resolveTexture(item) : null} />
              );
            })}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-9 gap-1.5">
        {Array.from({ length: 9 }, (_, slotIndex) => {
          const item = pickItem(bySlot, `hotbar.${slotIndex}`, slotIndex);
          return <InventorySlot key={slotIndex} item={item} textureUrl={item ? resolveTexture(item) : null} />;
        })}
      </div>
    </div>
  );
}
