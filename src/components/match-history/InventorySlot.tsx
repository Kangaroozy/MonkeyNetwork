import { useMemo, useState } from "react";
import type { WinnerInventorySlotItem } from "@contracts/match-history";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import InventoryItemTooltip from "./InventoryItemTooltip";

type Props = {
  item: WinnerInventorySlotItem | null;
  textureUrl: string | null;
  slotLabel?: string;
  className?: string;
};

function toVanillaTexture(material: string): string {
  return `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.5/assets/minecraft/textures/item/${material
    .toLowerCase()
    .replace(/^minecraft:/, "")}.png`;
}

function abbrevMaterial(material: string): string {
  return material
    .replace(/^minecraft:/i, "")
    .split("_")
    .filter(Boolean)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .slice(0, 3)
    .join("");
}

export default function InventorySlot({ item, textureUrl, slotLabel, className }: Props) {
  const [useVanillaFallback, setUseVanillaFallback] = useState(false);
  const [hideImage, setHideImage] = useState(false);
  const displayTexture = useMemo(() => {
    if (!item) return null;
    if (hideImage) return null;
    if (textureUrl && !useVanillaFallback) return textureUrl;
    return toVanillaTexture(item.material);
  }, [hideImage, item, textureUrl, useVanillaFallback]);

  const slotBody = (
    <div
      className={cn(
        "relative h-12 w-12 rounded border border-[rgba(255,255,255,0.08)] bg-[#12121A] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]",
        className,
      )}
    >
      {item ? (
        <>
          {displayTexture ? (
            <img
              src={displayTexture}
              alt={item.displayName}
              className="absolute inset-1 h-10 w-10 object-contain"
              style={{ imageRendering: "pixelated" }}
              onError={() => {
                if (!useVanillaFallback) {
                  setUseVanillaFallback(true);
                  return;
                }
                setHideImage(true);
              }}
            />
          ) : (
            <div className="absolute inset-1 flex items-center justify-center text-[10px] font-semibold text-[#A8A8BD]">
              {abbrevMaterial(item.material)}
            </div>
          )}
          <span className="absolute bottom-0.5 right-1 text-[10px] font-semibold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
            {item.amount > 1 ? item.amount : ""}
          </span>
        </>
      ) : (
        <div className="absolute inset-0.5 rounded border border-dashed border-[rgba(255,255,255,0.05)]" />
      )}
      {slotLabel ? (
        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] uppercase tracking-[0.06em] text-[#66667A]">
          {slotLabel}
        </span>
      ) : null}
    </div>
  );

  if (!item) return slotBody;

  return (
    <HoverCard openDelay={100} closeDelay={80}>
      <HoverCardTrigger asChild>{slotBody}</HoverCardTrigger>
      <HoverCardContent className="border-[rgba(255,255,255,0.12)] bg-[#0D0D14] p-3">
        <InventoryItemTooltip item={item} />
      </HoverCardContent>
    </HoverCard>
  );
}
