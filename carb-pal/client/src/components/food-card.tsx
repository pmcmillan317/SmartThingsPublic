import { type Food } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface FoodCardProps {
  food: Food;
  onClick?: () => void;
}

export function FoodCard({ food, onClick }: FoodCardProps) {
  return (
    <Card
      data-testid={`food-card-${food.id}`}
      className="p-4 hover-elevate active-elevate-2 cursor-pointer transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-base truncate" data-testid={`food-name-${food.id}`}>
            {food.name}
          </h3>
          <Badge
            variant="secondary"
            className="mt-2 text-xs"
            data-testid={`food-category-${food.id}`}
          >
            {food.category}
          </Badge>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="text-2xl font-mono font-semibold text-primary"
            data-testid={`food-ratio-${food.id}`}
          >
            {food.carbRatio.toFixed(2)}
          </span>
          <span className="text-xs text-muted-foreground">g per 1g</span>
        </div>
      </div>
    </Card>
  );
}
