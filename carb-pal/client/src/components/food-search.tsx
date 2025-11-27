import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, Check, Loader2, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import type { Food } from "@shared/schema";

interface FoodSearchProps {
  onSelect: (food: Food) => void;
  placeholder?: string;
  testId?: string;
  allowFatSecret?: boolean; // Premium feature: branded/restaurant foods
  onSearchResults?: (results: Food[]) => void; // Callback for search results
}

// Helper function to format carb display based on food type
const formatCarbDisplay = (food: Food, isPremium: boolean): string => {
  const isFatSecret = food.id.startsWith('fatsecret-');

  if (isFatSecret && !isPremium) {
    // Free user viewing FatSecret item: blur the numbers
    if (food.isBranded && food.servingCarbs && food.servingSize) {
      return `••• g carbs (${food.servingSize})`;
    } else if (food.carbRatio > 0) {
      return `••• g carbs per 100g`;
    } else {
      return 'Premium data available';
    }
  }

  // Premium user or non-FatSecret item: show actual data
  if (food.isBranded && food.servingCarbs && food.servingSize) {
    return `${food.servingCarbs.toFixed(1)}g carbs (${food.servingSize})`;
  } else if (food.carbRatio > 0) {
    return `${(food.carbRatio * 100).toFixed(1)}g carbs per 100g`;
  } else {
    return 'Carb data unavailable';
  }
};

export function FoodSearch({ onSelect, placeholder = "Search foods...", testId = "search-food", allowFatSecret = false, onSearchResults }: FoodSearchProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [apiResults, setApiResults] = useState<{
    fatsecret: Food[];
    usda: Food[];
  }>({ fatsecret: [], usda: [] });
  const [searchLoading, setSearchLoading] = useState(false);

  const { data: builtInFoods = [] } = useQuery<Food[]>({
    queryKey: ["/api/foods"],
  });

  // Helper function to load custom foods from localStorage
  const loadCustomFoods = useCallback(() => {
    const stored = localStorage.getItem("carbpal_custom_foods");
    if (stored) {
      try {
        setCustomFoods(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load custom foods", e);
        setCustomFoods([]);
      }
    } else {
      setCustomFoods([]);
    }
  }, []);

  // Load custom foods on mount and when popover opens
  useEffect(() => {
    loadCustomFoods();
  }, [open, loadCustomFoods]);

  // Listen for custom food additions (always active)
  useEffect(() => {
    const handleCustomFoodAdded = () => {
      loadCustomFoods();
    };

    window.addEventListener('customFoodAdded', handleCustomFoodAdded);

    return () => {
      window.removeEventListener('customFoodAdded', handleCustomFoodAdded);
    };
  }, [loadCustomFoods]);

  // Multi-source API search with caching
  useEffect(() => {
    const searchAPIs = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setApiResults({ fatsecret: [], usda: [] });
        return;
      }

      // Check cache first - use allowFatSecret in key for cache isolation
      const cacheKey = `food_search_${searchQuery.toLowerCase()}_${allowFatSecret ? 'with_fatsecret' : 'usda_only'}`;
      const cached = sessionStorage.getItem(cacheKey);

      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          setApiResults(cachedData);
          return;
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }

      setSearchLoading(true);

      try {
        // Build API calls based on permissions
        const apiCalls = [
          fetch(`/api/foods/search/usda?q=${encodeURIComponent(searchQuery)}`).then(r => r.ok ? r.json() : []),
        ];

        // Only search FatSecret if allowed (premium feature)
        if (allowFatSecret) {
          apiCalls.unshift(
            fetch(`/api/foods/search/fatsecret?q=${encodeURIComponent(searchQuery)}`).then(r => r.ok ? r.json() : [])
          );
        }

        const apiResults = await Promise.allSettled(apiCalls);

        const results = allowFatSecret ? {
          fatsecret: apiResults[0].status === 'fulfilled' ? apiResults[0].value : [],
          usda: apiResults[1].status === 'fulfilled' ? apiResults[1].value : [],
        } : {
          fatsecret: [],
          usda: apiResults[0].status === 'fulfilled' ? apiResults[0].value : [],
        };

        setApiResults(results);

        // Notify parent of search results
        if (onSearchResults) {
          const allResults = [...results.fatsecret, ...results.usda];
          onSearchResults(allResults);
        }

        // Cache results for 5 minutes
        sessionStorage.setItem(cacheKey, JSON.stringify(results));
        setTimeout(() => sessionStorage.removeItem(cacheKey), 5 * 60 * 1000);
      } catch (error) {
        console.error("API search error:", error);
        setApiResults({ fatsecret: [], usda: [] });
      } finally {
        setSearchLoading(false);
      }
    };

    const debounce = setTimeout(searchAPIs, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery, allowFatSecret, onSearchResults]);

  const localFoods = useMemo(() => {
    return [...customFoods, ...builtInFoods];
  }, [customFoods, builtInFoods]);

  const filteredLocalFoods = useMemo(() => {
    if (!searchQuery.trim()) return localFoods.slice(0, 50);

    const query = searchQuery.toLowerCase();
    return localFoods
      .filter(food => food.name.toLowerCase().includes(query))
      .slice(0, 25);
  }, [localFoods, searchQuery]);

  const handleSelect = (food: Food) => {
    setSelectedFood(food);
    onSelect(food);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          data-testid={testId}
        >
          {selectedFood ? selectedFood.name : placeholder}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Type to search foods..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {searchLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Searching database...</span>
              </div>
            )}

            {!searchLoading && filteredLocalFoods.length === 0 && apiResults.fatsecret.length === 0 && apiResults.usda.length === 0 && (
              <CommandEmpty>No foods found. Try a different search term.</CommandEmpty>
            )}

            {/* Custom Foods */}
            {customFoods.length > 0 && filteredLocalFoods.some(f => f.id.startsWith('custom-')) && (
              <CommandGroup heading="Your Custom Foods">
                {filteredLocalFoods.filter(f => f.id.startsWith('custom-')).map((food) => (
                  <CommandItem
                    key={food.id}
                    value={food.name}
                    onSelect={() => handleSelect(food)}
                    data-testid={`food-item-${food.id}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedFood?.id === food.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCarbDisplay(food, user?.isPremium || false)}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Built-in Foods */}
            {filteredLocalFoods.filter(f => !f.id.startsWith('custom-')).length > 0 && (
              <CommandGroup heading="Built-in Foods">
                {filteredLocalFoods.filter(f => !f.id.startsWith('custom-')).map((food) => (
                  <CommandItem
                    key={food.id}
                    value={food.name}
                    onSelect={() => handleSelect(food)}
                    data-testid={`food-item-${food.id}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedFood?.id === food.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCarbDisplay(food, user?.isPremium || false)}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* FatSecret Restaurant/Branded Foods */}
            {apiResults.fatsecret.length > 0 && (
              <CommandGroup heading="Restaurant & Branded Foods">
                {apiResults.fatsecret.slice(0, 15).map((food) => (
                  <CommandItem
                    key={food.id}
                    value={food.name}
                    onSelect={() => handleSelect(food)}
                    data-testid={`food-item-${food.id}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedFood?.id === food.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 flex items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <p className="font-medium">{food.name}</p>
                          <Crown
                            className="h-3 w-3 text-primary shrink-0 cursor-pointer hover:text-primary/80 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation('/pricing');
                            }}
                            data-testid="icon-crown-premium"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatCarbDisplay(food, user?.isPremium || false)}
                        </p>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* USDA Whole Foods */}
            {apiResults.usda.length > 0 && (
              <CommandGroup heading="USDA Whole Foods">
                {apiResults.usda.slice(0, 15).map((food) => (
                  <CommandItem
                    key={food.id}
                    value={food.name}
                    onSelect={() => handleSelect(food)}
                    data-testid={`food-item-${food.id}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedFood?.id === food.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCarbDisplay(food, user?.isPremium || false)}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
