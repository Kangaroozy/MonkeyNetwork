import { useEffect, useMemo, useState } from "react";
import type { WinnerInventorySlotItem, WinnerInventorySnapshot } from "@contracts/match-history";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import InventoryGrid from "./InventoryGrid";
import WinnerInventoryButton from "./WinnerInventoryButton";

type ItemsAdderRow = {
  id: string;
  material: string;
  modelId: number | null;
  texturePath: string | null;
};

type ItemsAdderManifest = {
  byMaterialModelData?: Record<string, ItemsAdderRow>;
  byItemId?: Record<string, ItemsAdderRow>;
};

type Props = {
  inventory: WinnerInventorySnapshot | null;
  winnerName: string;
};

let manifestPromise: Promise<ItemsAdderManifest | null> | null = null;
function loadItemsAdderManifest(): Promise<ItemsAdderManifest | null> {
  if (!manifestPromise) {
    manifestPromise = fetch("/itemsadder/manifest.json")
      .then((res) => (res.ok ? (res.json() as Promise<ItemsAdderManifest>) : null))
      .catch(() => null);
  }
  return manifestPromise;
}

function inferLegacySlot(items: WinnerInventorySlotItem[]): WinnerInventorySlotItem[] {
  if (items.some((item) => item.slotKey.startsWith("hotbar.") || item.slotKey.startsWith("inventory."))) {
    return items;
  }
  return items.map((item, index) => {
    const mappedIndex = index < 9 ? index : Math.min(35, index);
    const slotKey = mappedIndex < 9 ? `hotbar.${mappedIndex}` : `inventory.${mappedIndex}`;
    return {
      ...item,
      slotIndex: mappedIndex,
      slotKey,
    };
  });
}

export default function WinnerInventoryDialog({ inventory, winnerName }: Props) {
  const [open, setOpen] = useState(false);
  const [manifest, setManifest] = useState<ItemsAdderManifest | null>(null);

  useEffect(() => {
    loadItemsAdderManifest().then((data) => setManifest(data));
  }, []);

  const normalizedItems = useMemo(() => inferLegacySlot(inventory?.items ?? []), [inventory]);

  const resolveTexture = (item: WinnerInventorySlotItem): string | null => {
    if (!manifest) return null;
    const cmdKey =
      item.customModelData !== null && Number.isFinite(item.customModelData)
        ? `${item.material}:${item.customModelData}`
        : null;
    if (cmdKey && manifest.byMaterialModelData?.[cmdKey]?.texturePath) {
      return manifest.byMaterialModelData[cmdKey].texturePath;
    }
    for (const keyCandidate of item.customKeyCandidates) {
      const normalized = keyCandidate.toLowerCase();
      if (manifest.byItemId?.[normalized]?.texturePath) {
        return manifest.byItemId[normalized].texturePath;
      }
    }
    return null;
  };

  const disabled = normalizedItems.length === 0;

  return (
    <>
      <WinnerInventoryButton onClick={() => setOpen(true)} disabled={disabled} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[820px] border-[rgba(255,255,255,0.12)] bg-[#090912] text-[#ECECF4]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Winner Inventory</DialogTitle>
            <DialogDescription className="text-[#9D9DB0]">
              Final loadout for {winnerName}
              {inventory?.source === "legacy" ? " (legacy snapshot format)" : ""}.
            </DialogDescription>
          </DialogHeader>
          {normalizedItems.length > 0 ? (
            <InventoryGrid items={normalizedItems} resolveTexture={resolveTexture} />
          ) : (
            <p className="text-sm text-[#A2A2B8]">Inventory snapshot not available for this match.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
