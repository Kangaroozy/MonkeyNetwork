import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  /** "full" = larger hero / lockup; "icon" = nav default */
  variant?: "full" | "icon";
};

/**
 * Abstract mark: canopy arc + network node — reads as MN without being literal clip art.
 */
export default function BrandMark({ className, variant = "icon" }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(variant === "full" ? "h-11 w-11" : "h-7 w-7", "shrink-0", className)}
      aria-hidden
    >
      <path
        d="M4 22V10c0-1.5 1.2-2.6 2.7-2.3.9.2 1.7.9 2.1 1.8l3.4 7.4 2.9-6.1c.8-1.7 3.3-1.7 4.1 0l2.9 6.1 3.4-7.4c.4-.9 1.2-1.6 2.1-1.8 1.5-.3 2.7.8 2.7 2.3v12"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="9" r="2.75" fill="currentColor" />
    </svg>
  );
}
