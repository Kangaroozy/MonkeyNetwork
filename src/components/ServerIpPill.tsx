import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { MONKEY_NETWORK_SERVER_IP } from "@/lib/server";

type ServerIpPillProps = {
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
};

async function writeToClipboard(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

export default function ServerIpPill({
  className = "",
  compact = false,
  showLabel = true,
}: ServerIpPillProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (copyState !== "copied") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 1500);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const handleCopy = async () => {
    try {
      await writeToClipboard(MONKEY_NETWORK_SERVER_IP);
      setCopyState("copied");
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1500);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border border-mn-lime/25 bg-mn-leaf/70 backdrop-blur-sm ${
        compact ? "px-2.5 py-1.5" : "px-3 py-2"
      } ${className}`}
    >
      {showLabel && (
        <span className={`font-mono uppercase tracking-[0.08em] text-mn-dim ${compact ? "text-[10px]" : "text-[11px]"}`}>
          Server IP
        </span>
      )}
      <span className={`font-semibold text-mn-mist ${compact ? "text-[12px]" : "text-[13px]"}`}>{MONKEY_NETWORK_SERVER_IP}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-mn-void/50 text-mn-fog transition-colors hover:text-mn-mist hover:border-mn-lime/35"
        aria-label="Copy server IP"
        title={copyState === "copied" ? "Copied!" : "Copy server IP"}
      >
        {copyState === "copied" ? <Check className="h-3.5 w-3.5 text-mn-lime" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      {copyState === "error" && <span className="text-[11px] text-red-300">Copy failed</span>}
    </div>
  );
}
