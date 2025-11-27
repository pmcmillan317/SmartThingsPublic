import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator as CalcIcon, Tag, Plus, X, History, Trash2, Save, Crown } from "lucide-react";
import { FoodSearch } from "@/components/food-search";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { lookupBarcode } from "@/lib/barcode-lookup";
import { PageHeader } from "@/components/page-header";
import { SuggestionDialog } from "@/components/suggestion-dialog";
import { AuthDialog } from "@/components/auth-dialog";
import { RestaurantSearch } from "@/components/restaurant-search";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import type { Food } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MealItem {
  id: string;
  foodName: string;
  weight: number;
  carbs: number;
}

interface HistoryItem {
  id: string;
  timestamp: number;
  type: 'weight-to-carbs' | 'carbs-to-weight' | 'nutrition-label' | 'recipe';
  foodName?: string;
  weight?: number;
  carbs?: number;
  servingSize?: number;
  servingCarbs?: number;
  recipeName?: string;
  servings?: number;
  totalCarbs?: number;
  carbsPerServing?: number;
}

export default function Calculator() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  // Quick Calculator State
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [weight, setWeight] = useState<string>("");
  const [calculatedCarbs, setCalculatedCarbs] = useState<number | null>(null);

  // Meal Tracking State
  const [mealItems, setMealItems] = useState<MealItem[]>([]);

  // Reverse Calculator State
  const [reverseFood, setReverseFood] = useState<Food | null>(null);
  const [targetCarbs, setTargetCarbs] = useState<string>("");
  const [calculatedWeight, setCalculatedWeight] = useState<number | null>(null);

  // Refs for auto-scroll on mobile
  const quickResultRef = useRef<HTMLDivElement>(null);
  const reverseResultRef = useRef<HTMLDivElement>(null);
  const labelResultRef = useRef<HTMLDivElement>(null);

  // Nutrition Label Calculator State
  const [servingSize, setServingSize] = useState<string>("");
  const [servingCarbs, setServingCarbs] = useState<string>("");
  const [actualWeight, setActualWeight] = useState<string>("");
  const [labelCalculatedCarbs, setLabelCalculatedCarbs] = useState<number | null>(null);
  const [customFoodName, setCustomFoodName] = useState<string>("");

  // Calculation History State
  const [calcHistory, setCalcHistory] = useState<HistoryItem[]>([]);
  const [showRecentActivity, setShowRecentActivity] = useState(true);

  // Load history from localStorage on mount
  useEffect(() => {
    const storedHistory = localStorage.getItem('carbpal_calc_history');
    if (storedHistory) {
      try {
        setCalcHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error('Failed to load calculation history', e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (calcHistory.length > 0) {
      localStorage.setItem('carbpal_calc_history', JSON.stringify(calcHistory));
      // Dispatch custom event to notify History page
      window.dispatchEvent(new CustomEvent('carbpal_history_changed'));
    }
  }, [calcHistory]);

  // Add to history (store all items, no limit)
  const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    setCalcHistory(prev => [newItem, ...prev]); // Store all items permanently
    setShowRecentActivity(true); // Show Recent Activity when new item is added
  };

  // Hide Recent Activity section (does NOT delete permanent history)
  const handleHideRecentActivity = () => {
    setShowRecentActivity(false);
  };

  // Quick Calculator: weight to carbs
  const handleQuickCalculate = () => {
    if (!selectedFood || !weight) return;

    const weightNum = parseFloat(weight);
    if (!isNaN(weightNum) && weightNum > 0) {
      const carbs = weightNum * selectedFood.carbRatio;
      const roundedCarbs = Math.round(carbs * 10) / 10;
      setCalculatedCarbs(roundedCarbs);

      // Add to history
      addToHistory({
        type: 'weight-to-carbs',
        foodName: selectedFood.name,
        weight: weightNum,
        carbs: roundedCarbs
      });

      // Auto-scroll to result on mobile (blur input first to dismiss keyboard)
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setTimeout(() => {
        quickResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  };

  // Reverse Calculator: carbs to weight
  const handleReverseCalculate = () => {
    if (!reverseFood || !targetCarbs) return;

    const carbsNum = parseFloat(targetCarbs);
    if (!isNaN(carbsNum) && carbsNum > 0 && reverseFood.carbRatio > 0) {
      const weight = carbsNum / reverseFood.carbRatio;
      const roundedWeight = Math.round(weight * 10) / 10;
      setCalculatedWeight(roundedWeight);

      // Add to history
      addToHistory({
        type: 'carbs-to-weight',
        foodName: reverseFood.name,
        weight: roundedWeight,
        carbs: carbsNum
      });

      // Auto-scroll to result on mobile (blur input first to dismiss keyboard)
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setTimeout(() => {
        reverseResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  };

  // Nutrition Label Calculator
  const handleLabelCalculate = () => {
    const serving = parseFloat(servingSize);
    const carbs = parseFloat(servingCarbs);
    const actual = parseFloat(actualWeight);

    if (!isNaN(serving) && !isNaN(carbs) && !isNaN(actual) && serving > 0) {
      const carbsPerGram = carbs / serving;
      const totalCarbs = carbsPerGram * actual;
      const roundedCarbs = Math.round(totalCarbs * 10) / 10;
      setLabelCalculatedCarbs(roundedCarbs);

      // Add to history
      addToHistory({
        type: 'nutrition-label',
        servingSize: serving,
        servingCarbs: carbs,
        weight: actual,
        carbs: roundedCarbs
      });

      // Auto-scroll to result on mobile (blur input first to dismiss keyboard)
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setTimeout(() => {
        labelResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  };

  // Save nutrition label as custom food
  const handleSaveAsCustomFood = () => {
    if (!customFoodName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your custom food",
        variant: "destructive"
      });
      return;
    }

    const serving = parseFloat(servingSize);
    const carbs = parseFloat(servingCarbs);

    if (isNaN(serving) || isNaN(carbs) || serving <= 0 || carbs < 0) {
      toast({
        title: "Invalid Values",
        description: "Please enter valid serving size and carbs values",
        variant: "destructive"
      });
      return;
    }

    try {
      // Calculate and round carbRatio to 6 decimal places for precision
      const carbRatio = Math.round((carbs / serving) * 1000000) / 1000000;

      const newFood: Food = {
        id: `custom-${Date.now()}`,
        name: customFoodName.trim(),
        category: "Other",
        carbRatio
      };

      // Load existing custom foods with error handling
      const stored = localStorage.getItem("carbpal_custom_foods");
      let existingFoods: Food[] = [];

      if (stored) {
        try {
          existingFoods = JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse existing custom foods", e);
          // Continue with empty array if parse fails
        }
      }

      // Add new food
      const updated = [...existingFoods, newFood];
      localStorage.setItem("carbpal_custom_foods", JSON.stringify(updated));

      // Dispatch custom event to notify FoodSearch components
      window.dispatchEvent(new CustomEvent('customFoodAdded'));

      toast({
        title: "Custom Food Saved",
        description: `"${customFoodName}" has been added to your custom foods`,
      });

      // Reset the name field
      setCustomFoodName("");
    } catch (error) {
      console.error("Error saving custom food:", error);
      toast({
        title: "Save Failed",
        description: "Unable to save custom food. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = async (barcode: string) => {
    toast({
      title: "Looking up barcode...",
      description: `Searching for product: ${barcode}`,
    });

    try {
      const productData = await lookupBarcode(barcode);

      if (productData) {
        // Auto-fill the nutrition label fields
        if (productData.servingSize && productData.carbsPerServing) {
          setServingSize(productData.servingSize.toString());
          setServingCarbs(productData.carbsPerServing.toFixed(1));
          setCustomFoodName(productData.productName);

          toast({
            title: "Product Found!",
            description: `${productData.productName} - ${productData.servingSize}g serving with ${productData.carbsPerServing.toFixed(1)}g carbs`,
          });
        } else if (productData.carbsPer100g) {
          // If no serving size, provide 100g as reference
          setServingSize("100");
          setServingCarbs(productData.carbsPer100g.toFixed(1));
          setCustomFoodName(productData.productName);

          toast({
            title: "Product Found!",
            description: `${productData.productName} - ${productData.carbsPer100g.toFixed(1)}g carbs per 100g`,
          });
        } else {
          toast({
            title: "Limited Data",
            description: `Found "${productData.productName}" but nutrition data is incomplete`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Product Not Found",
          description: "This barcode isn't in the OpenFoodFacts database. Enter data manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Barcode lookup error:", error);
      toast({
        title: "Lookup Failed",
        description: "Unable to retrieve product data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFoodSelect = (food: Food) => {
    setSelectedFood(food);
    setCalculatedCarbs(null);
    setWeight("");
  };

  const handleReverseFoodSelect = (food: Food) => {
    setReverseFood(food);
    setCalculatedWeight(null);
    setTargetCarbs("");
  };

  // Add to Meal
  const handleAddToMeal = () => {
    if (selectedFood && calculatedCarbs !== null && weight) {
      const newItem: MealItem = {
        id: Date.now().toString(),
        foodName: selectedFood.name,
        weight: parseFloat(weight),
        carbs: calculatedCarbs
      };
      setMealItems([...mealItems, newItem]);

      // Reset calculator for next item
      setSelectedFood(null);
      setWeight("");
      setCalculatedCarbs(null);
    }
  };

  // Remove from Meal
  const handleRemoveFromMeal = (id: string) => {
    setMealItems(mealItems.filter(item => item.id !== id));
  };

  // Clear Meal
  const handleClearMeal = () => {
    setMealItems([]);
  };

  // Calculate meal total
  const mealTotal = mealItems.reduce((sum, item) => sum + item.carbs, 0);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <PageHeader
        icon={CalcIcon}
        title="Carb Calculator"
        description="Calculate carbohydrates for your meals"
        showSidebarTrigger={true}
        onSuggestionClick={() => setSuggestionDialogOpen(true)}
      />
      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-6 md:pb-8">

        <Tabs defaultValue="quick" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="quick" data-testid="tab-quick-calculator">
              Quick
            </TabsTrigger>
            <TabsTrigger value="reverse" data-testid="tab-reverse-calculator">
              Reverse
            </TabsTrigger>
            <TabsTrigger value="label" data-testid="tab-label-calculator">
              Label
            </TabsTrigger>
            <TabsTrigger value="restaurants" data-testid="tab-restaurants">
              Menus
            </TabsTrigger>
          </TabsList>

          {/* Quick Calculator: Weight to Carbs */}
          <TabsContent value="quick" className="space-y-6">
            <Card>
              <CardContent className="space-y-6 pt-6">
                <p className="text-sm text-muted-foreground">
                  Select a food and enter the weight to calculate total carbohydrates
                </p>

                {/* Food Search */}
                <div className="space-y-2">
                  <Label htmlFor="food-search">Search Food</Label>
                  <FoodSearch
                    onSelect={handleFoodSelect}
                    placeholder="Search for a food..."
                    testId="search-quick-food"
                    allowFatSecret={false}
                  />
                  {selectedFood && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="font-medium">{selectedFood.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFood.carbRatio * 100).toFixed(1)}g carbs per 100g
                      </p>
                    </div>
                  )}
                </div>

                {/* Weight Input */}
                <div className="space-y-2">
                  <Label htmlFor="weight-input">Weight (grams)</Label>
                  <Input
                    id="weight-input"
                    data-testid="input-weight"
                    type="number"
                    placeholder="Enter weight in grams"
                    value={weight}
                    onChange={(e) => {
                      setWeight(e.target.value);
                      setCalculatedCarbs(null);
                    }}
                    min="0"
                    step="0.1"
                  />
                </div>

                {/* Calculate Button */}
                <Button
                  onClick={handleQuickCalculate}
                  disabled={!selectedFood || !weight}
                  className="w-full"
                  size="lg"
                  data-testid="button-quick-calculate"
                >
                  Calculate Carbs
                </Button>

                {/* Result */}
                {calculatedCarbs !== null && (
                  <>
                    <div ref={quickResultRef} className="p-6 bg-primary/5 border-2 border-primary rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-2">Total Carbohydrates</p>
                      <p className="text-5xl font-mono font-bold text-primary" data-testid="text-calculated-carbs">
                        {calculatedCarbs}g
                      </p>
                    </div>

                    {/* Add to Meal Button */}
                    <Button
                      onClick={handleAddToMeal}
                      variant="outline"
                      className="w-full"
                      size="lg"
                      data-testid="button-add-to-meal"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Meal
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Meal Summary */}
            {mealItems.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Current Meal</CardTitle>
                    <Button
                      onClick={handleClearMeal}
                      variant="ghost"
                      size="sm"
                      data-testid="button-clear-meal"
                    >
                      Clear Meal
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Meal Items List */}
                  <div className="space-y-2">
                    {mealItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        data-testid={`meal-item-${item.id}`}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.foodName}</p>
                          <p className="text-sm text-muted-foreground">{item.weight}g</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-mono font-semibold text-lg">{item.carbs}g</p>
                          <Button
                            onClick={() => handleRemoveFromMeal(item.id)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            data-testid={`button-remove-item-${item.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Meal Total */}
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                      <p className="text-lg font-semibold">Meal Total</p>
                      <p className="text-3xl font-mono font-bold text-primary" data-testid="text-meal-total">
                        {Math.round(mealTotal * 10) / 10}g
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Reverse Calculator: Carbs to Weight */}
          <TabsContent value="reverse" className="space-y-6">
            <Card>
              <CardContent className="space-y-6 pt-6">
                <p className="text-sm text-muted-foreground">
                  Enter target carbs to calculate how much food you need
                </p>

                {/* Food Search */}
                <div className="space-y-2">
                  <Label htmlFor="reverse-food-search">Search Food</Label>
                  <FoodSearch
                    onSelect={handleReverseFoodSelect}
                    placeholder="Search for a food..."
                    testId="search-reverse-food"
                    allowFatSecret={false}
                  />
                  {reverseFood && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="font-medium">{reverseFood.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(reverseFood.carbRatio * 100).toFixed(1)}g carbs per 100g
                      </p>
                    </div>
                  )}
                </div>

                {/* Target Carbs Input */}
                <div className="space-y-2">
                  <Label htmlFor="target-carbs">Target Carbohydrates (grams)</Label>
                  <Input
                    id="target-carbs"
                    data-testid="input-target-carbs"
                    type="number"
                    placeholder="Enter desired carbs"
                    value={targetCarbs}
                    onChange={(e) => {
                      setTargetCarbs(e.target.value);
                      setCalculatedWeight(null);
                    }}
                    min="0"
                    step="0.1"
                  />
                </div>

                {/* Calculate Button */}
                <Button
                  onClick={handleReverseCalculate}
                  disabled={!reverseFood || !targetCarbs}
                  className="w-full"
                  size="lg"
                  data-testid="button-reverse-calculate"
                >
                  Calculate Weight
                </Button>

                {/* Result */}
                {calculatedWeight !== null && (
                  <div ref={reverseResultRef} className="p-6 bg-primary/5 border-2 border-primary rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-2">Required Weight</p>
                    <p className="text-5xl font-mono font-bold text-primary" data-testid="text-calculated-weight">
                      {calculatedWeight}g
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nutrition Label Calculator */}
          <TabsContent value="label" className="space-y-6">
            <Card>
              <CardContent className="space-y-6 pt-6">
                <p className="text-sm text-muted-foreground">
                  Enter nutrition label data to calculate carbohydrates
                </p>

                {/* Barcode Scanner - Premium Only */}
                {user?.isPremium ? (
                  <div className="flex items-center justify-between gap-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-primary" />
                      <p className="font-medium text-sm">Scan Barcode</p>
                    </div>
                    <BarcodeScanner onScanSuccess={handleBarcodeScan} />
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4 p-3 bg-muted border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Crown
                        className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setLocation('/pricing')}
                        data-testid="icon-crown-barcode"
                      />
                      <p className="font-medium text-sm">Barcode Scanner</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation('/pricing')}
                      data-testid="button-upgrade-barcode"
                    >
                      Upgrade
                    </Button>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Serving Size */}
                  <div className="space-y-2">
                    <Label htmlFor="serving-size">Serving Size (grams)</Label>
                    <Input
                      id="serving-size"
                      data-testid="input-serving-size"
                      type="number"
                      placeholder="e.g., 30"
                      value={servingSize}
                      onChange={(e) => {
                        setServingSize(e.target.value);
                        setLabelCalculatedCarbs(null);
                      }}
                      min="0"
                      step="0.1"
                    />
                  </div>

                  {/* Carbs per Serving */}
                  <div className="space-y-2">
                    <Label htmlFor="serving-carbs">Carbs per Serving (grams)</Label>
                    <Input
                      id="serving-carbs"
                      data-testid="input-serving-carbs"
                      type="number"
                      placeholder="e.g., 20"
                      value={servingCarbs}
                      onChange={(e) => {
                        setServingCarbs(e.target.value);
                        setLabelCalculatedCarbs(null);
                      }}
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                {/* Actual Weight */}
                <div className="space-y-2">
                  <Label htmlFor="actual-weight">Your Actual Weight (grams)</Label>
                  <Input
                    id="actual-weight"
                    data-testid="input-actual-weight"
                    type="number"
                    placeholder="Enter the weight you're eating"
                    value={actualWeight}
                    onChange={(e) => {
                      setActualWeight(e.target.value);
                      setLabelCalculatedCarbs(null);
                    }}
                    min="0"
                    step="0.1"
                  />
                </div>

                {/* Calculate Button */}
                <Button
                  onClick={handleLabelCalculate}
                  disabled={!servingSize || !servingCarbs || !actualWeight}
                  className="w-full"
                  size="lg"
                  data-testid="button-label-calculate"
                >
                  Calculate Carbs
                </Button>

                {/* Result */}
                {labelCalculatedCarbs !== null && (
                  <>
                    <div ref={labelResultRef} className="p-6 bg-primary/5 border-2 border-primary rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-2">Total Carbohydrates</p>
                      <p className="text-5xl font-mono font-bold text-primary" data-testid="text-label-carbs">
                        {labelCalculatedCarbs}g
                      </p>
                    </div>

                    {/* Save as Custom Food */}
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium text-sm mb-3">Save as Custom Food</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Food name"
                          value={customFoodName}
                          onChange={(e) => setCustomFoodName(e.target.value)}
                          data-testid="input-custom-food-name"
                          className="flex-1"
                        />
                        <Button
                          onClick={handleSaveAsCustomFood}
                          disabled={!customFoodName.trim()}
                          data-testid="button-save-custom-food"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restaurant & Brand Search */}
          <TabsContent value="restaurants" className="space-y-6">
            <RestaurantSearch onUpgradeClick={() => setAuthDialogOpen(true)} />
          </TabsContent>
        </Tabs>

        {/* Calculation History - Recent Activity (collapsible, does NOT delete permanent history) */}
        {calcHistory.length > 0 && showRecentActivity && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Your recent calculations (permanent history saved to History page)
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleHideRecentActivity}
                  data-testid="button-hide-recent-activity"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hide
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {calcHistory.slice(0, 20).map((item) => (
                  <div
                    key={item.id}
                    data-testid={`history-item-${item.id}`}
                    className="p-3 bg-muted rounded-lg text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        {item.type === 'weight-to-carbs' && (
                          <p>
                            <span className="font-medium">{item.foodName}</span>: {item.weight}g → <span className="font-mono text-primary">{item.carbs}g carbs</span>
                          </p>
                        )}
                        {item.type === 'carbs-to-weight' && (
                          <p>
                            <span className="font-medium">{item.foodName}</span>: {item.carbs}g carbs → <span className="font-mono text-primary">{item.weight}g</span>
                          </p>
                        )}
                        {item.type === 'nutrition-label' && (
                          <p>
                            Nutrition Label: {item.servingSize}g serving ({item.servingCarbs}g carbs) × {item.weight}g = <span className="font-mono text-primary">{item.carbs}g carbs</span>
                          </p>
                        )}
                        {item.type === 'recipe' && (
                          <p>
                            Recipe: <span className="font-medium">{item.recipeName}</span> ({item.servings} servings) = <span className="font-mono text-primary">{Math.round((item.carbsPerServing || 0) * 10) / 10}g carbs/serving</span>
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <SuggestionDialog
        open={suggestionDialogOpen}
        onOpenChange={setSuggestionDialogOpen}
      />
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
      />
    </div>
  );
}
