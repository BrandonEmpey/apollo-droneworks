import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

/**
 * Renders "Digital Twin" with a small info icon that reveals a definition
 * tooltip on hover (desktop) or tap (mobile).
 *
 * Use at the FIRST occurrence of "Digital Twin" per page section.
 * For dense tables/lists, only the first row needs the icon — skip it on
 * subsequent occurrences to avoid visual clutter.
 *
 * Never use the terms "Gaussian Splatting" or "3DGS" in customer-facing copy.
 */
export function DigitalTwinTerm({ className }: { className?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-baseline gap-0.5 cursor-help ${className ?? ""}`}>
            <span>Digital Twin</span>
            <Info className="h-3 w-3 text-muted-foreground/70 translate-y-px shrink-0" />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[280px] text-sm leading-snug"
        >
          A Digital Twin — a true-to-life 3D model of the space you can explore
          from any angle, like you're actually walking through it.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
