import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FoodCard } from "@/components/food-card";
import { type Food, type Category, CATEGORIES } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { mealStorage } from "@/lib/meal-storage";
import { randomUUID } from "@/lib/utils";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [weight, setWeight] = useState("");
  const [mealType, setMealType] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snack">("Breakfast");
  const { toast } = useToast();

  const { data: foods = [], isLoading } = useQuery<Food[]>({
    queryKey: ["/api/foods"],
  });

  const filteredFoods = useMemo(() => {
    return foods.filter((food) => {
      const matchesSearch = food.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || food.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [foods, searchQuery, selectedCategory]);

  const calculatedCarbs = useMemo(() => {
    if (!selectedFood || !weight) return 0;
    return parseFloat(weight) * selectedFood.carbRatio;
  }, [selectedFood, weight]);

  const handleLogMeal = async () => {
    if (!selectedFood || !weight) return;

    try {
      const now = new Date();
      const mealLog = {
        id: crypto.randomUUID(),
        foodId: selectedFood.id,
        foodName: selectedFood.name,
        category: selectedFood.category,
        weight: parseFloat(weight),
        carbsCalculated: calculatedCarbs,
        mealType,
        timestamp: now.toISOString(),
        date: now.toISOString().split("T")[0],
      };

      // Save to localStorage
      mealStorage.addMeal(mealLog);

      // Also sync with backend API
      try {
        await apiRequest("POST", "/api/meals", {
          foodId: selectedFood.id,
          foodName: selectedFood.name,
          category: selectedFood.category,
          weight: parseFloat(weight),
          carbsCalculated: calculatedCarbs,
          mealType,
        });
      } catch (apiError) {
        // API sync failed, but localStorage succeeded - that's okay
        console.warn("API sync failed, meal saved locally:", apiError);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/meals"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/summary"] });

      toast({
        title: "Meal logged!",
        description: `${selectedFood.name} added to ${mealType}`,
      });

      setSelectedFood(null);
      setWeight("");

      // Force page reload to show updated data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log meal. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold mb-2">Search Foods</h1>
          <p className="text-muted-foreground">
            Find and log foods with their carb content
          </p>
        </div>

        {/* Search Bar */}
        <div className="sticky top-0 z-10 bg-background pb-4 space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for a food..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-12 text-base"
              data-testid="input-search"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                data-testid="button-clear-search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap hover-elevate"
              onClick={() => setSelectedCategory(null)}
              data-testid="filter-all"
            >
              All Foods
            </Badge>
            {CATEGORIES.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap hover-elevate"
                onClick={() => setSelectedCategory(category)}
                data-testid={`filter-${category.toLowerCase().replace('/', '-')}`}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-3 mt-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredFoods.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory
                ? "No foods found matching your search"
                : "No foods available"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-6">
            {filteredFoods.map((food) => (
              <FoodCard
                key={food.id}
                food={food}
                onClick={() => setSelectedFood(food)}
              />
            ))}
          </div>
        )}

        {/* Log Meal Dialog */}
        <Dialog open={!!selectedFood} onOpenChange={(open) => !open && setSelectedFood(null)}>
          <DialogContent data-testid="dialog-log-meal">
            <DialogHeader>
              <DialogTitle>{selectedFood?.name}</DialogTitle>
              <DialogDescription>
                Log this food to track your carb intake
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Food Info */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Carb Ratio</span>
                <span className="text-lg font-mono font-semibold text-primary">
                  {selectedFood?.carbRatio.toFixed(2)}g per 1g
                </span>
              </div>

              {/* Weight Input */}
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (grams)</Label>
                <Input
                  id="weight"
                  type="number"
                  inputMode="decimal"
                  placeholder="Enter weight in grams"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="h-12 text-base"
                  data-testid="input-weight"
                />
              </div>

              {/* Calculated Carbs */}
              {weight && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Carbohydrates</p>
                  <p className="text-3xl font-mono font-bold text-primary" data-testid="calculated-carbs">
                    {calculatedCarbs.toFixed(1)}g
                  </p>
                </div>
              )}

              {/* Meal Type */}
              <div className="space-y-2">
                <Label>Meal Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Breakfast", "Lunch", "Dinner", "Snack"] as const).map((type) => (
                    <Button
                      key={type}
                      variant={mealType === type ? "default" : "outline"}
                      onClick={() => setMealType(type)}
                      data-testid={`button-meal-${type.toLowerCase()}`}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <Button
                onClick={handleLogMeal}
                disabled={!weight || parseFloat(weight) <= 0}
                className="w-full h-12"
                data-testid="button-submit-meal"
              >
                Log Meal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
