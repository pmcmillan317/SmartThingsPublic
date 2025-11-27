import { type MealLog } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface MealLogCardProps {
  log: MealLog;
  onDelete?: (id: string) => void;
}

const mealTypeColors = {
  Breakfast: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  Lunch: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  Dinner: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  Snack: "bg-chart-4/10 text-chart-4 border-chart-4/20",
};

export function MealLogCard({ log, onDelete }: MealLogCardProps) {
  const time = new Date(log.timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Card
      className="p-4"
      data-testid={`meal-log-${log.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              className={mealTypeColors[log.mealType]}
              data-testid={`meal-type-${log.id}`}
            >
              {log.mealType}
            </Badge>
            <span className="text-sm text-muted-foreground" data-testid={`meal-time-${log.id}`}>
              {time}
            </span>
          </div>
          <h4 className="font-medium text-base truncate" data-testid={`meal-food-${log.id}`}>
            {log.foodName}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {log.weight}g • {log.category}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <div className="text-2xl font-mono font-semibold text-primary" data-testid={`meal-carbs-${log.id}`}>
              {log.carbsCalculated.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">carbs (g)</div>
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(log.id)}
              data-testid={`button-delete-meal-${log.id}`}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
