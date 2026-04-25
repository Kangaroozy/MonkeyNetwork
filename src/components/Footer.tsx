import { Crown } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#111114] border-t border-[rgba(255,255,255,0.06)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-4 h-4 text-[#D4A843]" />
          <span className="text-[14px] font-bold tracking-[0.08em] text-[#F0F0F2]">MonkeyNetwork</span>
        </div>
        <p className="text-[12px] text-[#5A5A65]">
          MonkeyNetwork 2026. Not affiliated with Mojang Studios or Microsoft.
        </p>
      </div>
    </footer>
  );
}
