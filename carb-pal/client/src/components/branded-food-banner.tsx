import { AlertCircle, Crown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface BrandedFoodBannerProps {
  onUpgrade?: () => void;
}

export function BrandedFoodBanner({ onUpgrade }: BrandedFoodBannerProps) {
  const [, setLocation] = useLocation();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      setLocation('/pricing');
    }
  };

  return (
    <Alert className="border-primary/50 bg-primary/5" data-testid="alert-branded-food-info">
      <AlertCircle className="h-4 w-4 text-primary" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-sm flex-1">
          <strong>Restaurant items in USDA show per-100g values.</strong> Upgrade to Premium for actual serving sizes (e.g., "45g carbs per sandwich" vs "27g per 100g")
        </span>
        <Button
          size="sm"
          onClick={handleUpgrade}
          className="gap-1.5 shrink-0"
          data-testid="button-upgrade-from-banner"
        >
          <Crown className="h-3.5 w-3.5" />
          Upgrade
        </Button>
      </AlertDescription>
    </Alert>
  );
}
