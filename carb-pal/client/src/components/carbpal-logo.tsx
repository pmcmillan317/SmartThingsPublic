import { Calculator, Apple } from "lucide-react";
import { cn } from "@/lib/utils";

interface CarbPalLogoProps {
  className?: string;
  size?: number;
}

export function CarbPalLogo({ className, size = 24 }: CarbPalLogoProps) {
  return (
    <div className={cn("relative inline-flex items-center", className)} style={{ width: size, height: size }}>
      {/* Left half: Apple */}
      <div className="absolute left-0 top-0 overflow-hidden" style={{ width: size / 2, height: size }}>
        <Apple className="text-primary" style={{ width: size, height: size }} />
      </div>

      {/* Right half: Calculator */}
      <div className="absolute right-0 top-0 overflow-hidden" style={{ width: size / 2, height: size }}>
        <Calculator
          className="text-primary"
          style={{ width: size, height: size, transform: `translateX(-${size / 2}px)` }}
        />
      </div>
    </div>
  );
}
