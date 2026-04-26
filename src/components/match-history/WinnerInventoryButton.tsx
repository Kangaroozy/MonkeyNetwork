import { Button } from "@/components/ui/button";

type Props = {
  onClick: () => void;
  disabled?: boolean;
};

export default function WinnerInventoryButton({ onClick, disabled = false }: Props) {
  return (
    <Button
      type="button"
      size="lg"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-12 rounded-xl border border-[rgba(255,211,94,0.45)] bg-[linear-gradient(135deg,#B87918_0%,#D6A437_40%,#8C4A12_100%)] text-[#FFF8E6] text-[13px] font-semibold tracking-[0.04em] shadow-[0_10px_30px_rgba(214,164,55,0.25)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_12px_34px_rgba(214,164,55,0.35)] disabled:border-[rgba(255,255,255,0.12)] disabled:bg-[rgba(255,255,255,0.08)] disabled:text-[#A6A6B7] disabled:shadow-none"
    >
      View Winner Inventory
    </Button>
  );
}
