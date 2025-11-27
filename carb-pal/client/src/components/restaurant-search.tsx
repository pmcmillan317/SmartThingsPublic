import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Crown, Loader2, ChevronsUpDown, Check, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { getCachedRestaurantMenu, cacheRestaurantMenu } from "@/lib/restaurantCache";
import { cn } from "@/lib/utils";
import { groupMenuItems, toggleGroupExpansion, type MenuGroup } from "@/lib/menuGrouping";
import type { Brand, BrandMenuItem } from "@/types/restaurant";

interface MealItem {
  id: string;
  itemName: string;
  carbs: number;
  brandName: string;
}

interface RestaurantSearchProps {
  onUpgradeClick?: () => void;
}

export function RestaurantSearch({ onUpgradeClick }: RestaurantSearchProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [mealItems, setMealItems] = useState<MealItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-search as user types (debounced)
  useEffect(() => {
    const searchBrands = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setBrands([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/brands/search?q=${encodeURIComponent(searchQuery.trim())}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setBrands(data);
        } else {
          setBrands([]);
        }
      } catch (error) {
        console.error('Brand search error:', error);
        setBrands([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchBrands, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Group menu items when brand is selected
  useEffect(() => {
    if (selectedBrand?.menu_items) {
      const groups = groupMenuItems(selectedBrand.menu_items);
      setMenuGroups(groups);
    }
  }, [selectedBrand]);

  const handleBrandSelect = (brand: Brand) => {
    // Check cache first
    const cached = getCachedRestaurantMenu(brand.brand_name);
    if (cached) {
      setSelectedBrand(cached);
    } else {
      setSelectedBrand(brand);
      cacheRestaurantMenu(brand);
    }
    setOpen(false);
    setSearchQuery("");
  };

  const handleAddItem = (item: BrandMenuItem) => {
    if (!user?.isPremium) {
      // Show upgrade modal for free users
      onUpgradeClick?.();
      return;
    }

    const newItem: MealItem = {
      id: Date.now().toString(),
      itemName: item.item_name,
      carbs: item.carbs,
      brandName: selectedBrand?.brand_name || "",
    };
    setMealItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setMealItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearTotal = () => {
    setMealItems([]);
  };

  const handleToggleGroup = (baseName: string) => {
    setMenuGroups(prev => toggleGroupExpansion(prev, baseName));
  };

  const totalCarbs = mealItems.reduce((sum, item) => sum + item.carbs, 0);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card>
        <CardHeader className="space-y-0 pb-4">
          <CardTitle className="text-lg">Search Restaurants & Brands</CardTitle>
          <CardDescription>Search restaurants and branded food items</CardDescription>
        </CardHeader>
        <CardContent>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
                data-testid="button-restaurant-search"
              >
                {selectedBrand
                  ? selectedBrand.brand_name
                  : "Search restaurants or brands..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Type to search..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  data-testid="input-restaurant-search"
                />
                <CommandList>
                  {isLoading && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!isLoading && searchQuery.length >= 2 && brands.length === 0 && (
                    <CommandEmpty>No brands found</CommandEmpty>
                  )}
                  {!isLoading && searchQuery.length < 2 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Type at least 2 characters to search
                    </div>
                  )}
                  {!isLoading && brands.length > 0 && (
                    <CommandGroup>
                      {brands.map((brand) => (
                        <CommandItem
                          key={brand.brand_name}
                          value={brand.brand_name}
                          onSelect={() => handleBrandSelect(brand)}
                          data-testid={`brand-item-${brand.brand_name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedBrand?.brand_name === brand.brand_name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{brand.brand_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {brand.item_count} items
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Menu View with Grouping */}
      {selectedBrand && menuGroups.length > 0 && (
        <Card>
          <CardHeader className="space-y-0 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{selectedBrand.brand_name}</CardTitle>
                <CardDescription>{menuGroups.length} menu categories</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBrand(null)}
                data-testid="button-back-to-brands"
              >
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {menuGroups.map((group) => {
                  const groupItem = group.items[0];
                  const hasVariations = groupItem.variations.length > 1;

                  return (
                    <div key={group.baseName} className="space-y-1">
                      {/* Group Header - clickable if variations exist */}
                      {hasVariations ? (
                        <button
                          onClick={() => handleToggleGroup(group.baseName)}
                          className="w-full flex items-center justify-between p-3 rounded-md border hover-elevate active-elevate-2 text-left"
                          data-testid={`group-${group.baseName.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {groupItem.isExpanded ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{group.baseName}</div>
                              <div className="text-sm text-muted-foreground">
                                {groupItem.variations.length} sizes
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            {groupItem.variations.length}
                          </Badge>
                        </button>
                      ) : (
                        /* Single item - show directly */
                        <div
                          className="flex items-center justify-between p-3 rounded-md border"
                          data-testid={`menu-item-${groupItem.baseItem.food_id}`}
                        >
                          <div className="flex-1">
                            <div className="font-medium">{groupItem.baseItem.item_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {groupItem.baseItem.serving_size}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {user?.isPremium ? (
                              <>
                                <div className="text-right">
                                  <div className="font-mono font-semibold text-lg" data-testid={`carbs-${groupItem.baseItem.food_id}`}>
                                    {groupItem.baseItem.carbs}g
                                  </div>
                                  <div className="text-xs text-muted-foreground">carbs</div>
                                </div>
                                <Button
                                  size="icon"
                                  onClick={() => handleAddItem(groupItem.baseItem)}
                                  data-testid={`button-add-${groupItem.baseItem.food_id}`}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <div className="text-right">
                                  <div className="font-mono font-semibold text-lg blur-sm select-none">
                                    {groupItem.baseItem.carbs}g
                                  </div>
                                  <div className="text-xs text-muted-foreground">carbs</div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => setLocation('/pricing')}
                                  data-testid={`button-add-locked-${groupItem.baseItem.food_id}`}
                                >
                                  <Crown className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Expanded Variations */}
                      {hasVariations && groupItem.isExpanded && (
                        <div className="ml-6 space-y-1">
                          {groupItem.variations.map((item) => (
                            <div
                              key={item.food_id}
                              className="flex items-center justify-between p-3 rounded-md border bg-muted/30"
                              data-testid={`menu-item-${item.food_id}`}
                            >
                              <div className="flex-1">
                                <div className="font-medium">{item.item_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {item.serving_size}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {user?.isPremium ? (
                                  <>
                                    <div className="text-right">
                                      <div className="font-mono font-semibold text-lg" data-testid={`carbs-${item.food_id}`}>
                                        {item.carbs}g
                                      </div>
                                      <div className="text-xs text-muted-foreground">carbs</div>
                                    </div>
                                    <Button
                                      size="icon"
                                      onClick={() => handleAddItem(item)}
                                      data-testid={`button-add-${item.food_id}`}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-right">
                                      <div className="font-mono font-semibold text-lg blur-sm select-none">
                                        {item.carbs}g
                                      </div>
                                      <div className="text-xs text-muted-foreground">carbs</div>
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() => setLocation('/pricing')}
                                      data-testid={`button-add-locked-${item.food_id}`}
                                    >
                                      <Crown className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Running Total */}
      {mealItems.length > 0 && (
        <Card className="border-primary">
          <CardHeader className="space-y-0 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Meal Total</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearTotal}
                data-testid="button-clear-total"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-h-[200px] overflow-auto">
              {mealItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  data-testid={`meal-item-${item.id}`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.itemName}</div>
                    <div className="text-xs text-muted-foreground">{item.brandName}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {item.carbs}g
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleRemoveItem(item.id)}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-lg font-semibold">Total Carbs</div>
              <div className="text-3xl font-mono font-bold text-primary" data-testid="text-total-carbs">
                {totalCarbs}g
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
