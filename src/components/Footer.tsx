import DiscordIcon from "@/components/DiscordIcon";
import BrandMark from "@/components/BrandMark";
import ServerIpPill from "@/components/ServerIpPill";

export default function Footer() {
  const discordUrl = "https://discord.gg/tkE6BzXA3Q";
  return (
    <footer className="relative border-t border-white/[0.07] bg-mn-canopy/80 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 mn-grid-overlay mn-grid-overlay--footer opacity-50" aria-hidden />
      <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-mn-lime">
              <BrandMark variant="icon" />
            </span>
            <div>
              <span className="font-display text-[15px] font-bold tracking-[-0.04em] text-mn-mist block">
                Monkey<span className="text-mn-lime">Network</span>
              </span>
              <span className="mn-eyebrow mt-1 block opacity-80">UHC rankings</span>
            </div>
          </div>
          <a
            href={discordUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-mn-fog transition-colors hover:text-mn-mist hover:bg-[rgba(88,101,242,0.2)] hover:border-[rgba(88,101,242,0.5)]"
            aria-label="Join Discord"
            title="Join Discord"
          >
            <DiscordIcon className="h-4 w-4" />
          </a>
        </div>
        <p className="text-[12px] text-mn-dim max-w-xl leading-relaxed">
          MonkeyNetwork 2026. Not affiliated with Mojang Studios or Microsoft.
        </p>
        <div className="mt-4">
          <ServerIpPill />
        </div>
      </div>
    </footer>
  );
}
