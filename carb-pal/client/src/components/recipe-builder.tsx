import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FoodSearch } from "@/components/food-search";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { lookupBarcode } from "@/lib/barcode-lookup";
import { Plus, Trash2, X, Save, ChevronDown, ChevronUp, Crown } from "lucide-react";
import type { Food } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { exportAllData } from "@/lib/data-export";
import { googleDriveClient } from "@/lib/google-drive";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RecipeIngredient {
  id: string;
  food: Food;
  weight: number;
  carbs: number;
}

interface SavedRecipe {
  id: string;
  name: string;
  ingredients: Array<{
    foodId: string;
    foodName: string;
    weight: number;
    carbs: number;
  }>;
  servings: number;
  totalCarbs: number;
  carbsPerServing: number;
  createdAt: string;
}

interface RecipeBuilderProps {
  onClose: () => void;
  editRecipe?: SavedRecipe | null;
}

export function RecipeBuilder({ onClose, editRecipe = null }: RecipeBuilderProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [recipeName, setRecipeName] = useState(editRecipe?.name || "");
  const [servings, setServings] = useState<string>(editRecipe?.servings.toString() || "1");
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [showCustomFoodDialog, setShowCustomFoodDialog] = useState(false);
  const [showIngredientSearch, setShowIngredientSearch] = useState(false);
  const { toast } = useToast();
  const [recipeId] = useState(editRecipe?.id || crypto.randomUUID());

  // Refs for auto-scroll
  const recipeNameRef = useRef<HTMLInputElement>(null);
  const lastIngredientRef = useRef<HTMLDivElement>(null);

  // Custom food creation state
  const [customFoodName, setCustomFoodName] = useState("");
  const [customServingSize, setCustomServingSize] = useState("");
  const [customServingCarbs, setCustomServingCarbs] = useState("");
  const [customCarbRatio, setCustomCarbRatio] = useState("");
  const [showAdvancedCustom, setShowAdvancedCustom] = useState(false);

  // Auto-scroll when recipe builder opens
  useEffect(() => {
    setTimeout(() => {
      recipeNameRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 500);
  }, []);

  // Auto-scroll to last ingredient when a new one is added
  useEffect(() => {
    if (ingredients.length > 0) {
      setTimeout(() => {
        lastIngredientRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 500);
    }
  }, [ingredients.length]);

  // Load existing recipe ingredients if editing
  useState(() => {
    if (editRecipe) {
      const loadedIngredients = editRecipe.ingredients.map(ing => ({
        id: crypto.randomUUID(),
        food: {
          id: ing.foodId,
          name: ing.foodName,
          category: "Other" as const,
          carbRatio: ing.weight > 0 ? ing.carbs / ing.weight : 0,
        },
        weight: ing.weight,
        carbs: ing.carbs,
      }));
      setIngredients(loadedIngredients);
    }
  });

  const totalCarbs = ingredients.reduce((sum, ing) => sum + ing.carbs, 0);
  const carbsPerServing = parseFloat(servings) > 0 ? totalCarbs / parseFloat(servings) : 0;

  const handleAddIngredient = (food: Food) => {
    const newIngredient: RecipeIngredient = {
      id: crypto.randomUUID(),
      food,
      weight: 0,
      carbs: 0,
    };
    setIngredients([...ingredients, newIngredient]);
    setShowIngredientSearch(false);
  };

  const handleUpdateWeight = (id: string, weightStr: string) => {
    const weight = parseFloat(weightStr) || 0;
    setIngredients(ingredients.map(ing => {
      if (ing.id === id) {
        return {
          ...ing,
          weight,
          carbs: weight * ing.food.carbRatio,
        };
      }
      return ing;
    }));
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const handleCreateCustomFood = () => {
    if (!customFoodName.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a food name",
        variant: "destructive",
      });
      return;
    }

    let carbRatio: number;

    if (showAdvancedCustom) {
      const ratio = parseFloat(customCarbRatio);
      if (isNaN(ratio) || ratio < 0 || ratio > 100) {
        toast({
          title: "Invalid Input",
          description: "Please enter a valid carb amount (0-100g per 100g)",
          variant: "destructive",
        });
        return;
      }
      carbRatio = ratio / 100;
    } else {
      const serving = parseFloat(customServingSize);
      const carbs = parseFloat(customServingCarbs);

      if (isNaN(serving) || isNaN(carbs) || serving <= 0 || carbs < 0) {
        toast({
          title: "Invalid Input",
          description: "Please enter valid serving size and carbs",
          variant: "destructive",
        });
        return;
      }

      carbRatio = carbs / serving;
    }

    const customFood: Food = {
      id: `custom-${Date.now()}`,
      name: customFoodName,
      category: "Other",
      carbRatio,
    };

    const customFoods = JSON.parse(localStorage.getItem("carbpal_custom_foods") || "[]");
    customFoods.push(customFood);
    localStorage.setItem("carbpal_custom_foods", JSON.stringify(customFoods));

    // Auto-backup to Google Drive
    googleDriveClient.autoBackup(exportAllData(), () => {
      toast({
        title: "Auto-backed up to Drive",
        description: "Changes saved to Google Drive ✓",
      });
    });

    handleAddIngredient(customFood);

    setCustomFoodName("");
    setCustomServingSize("");
    setCustomServingCarbs("");
    setCustomCarbRatio("");
    setShowAdvancedCustom(false);
    setShowCustomFoodDialog(false);

    toast({
      title: "Custom Food Created",
      description: `${customFood.name} has been added to your ingredients`,
    });
  };

  const handleBarcodeScan = async (barcode: string) => {
    toast({
      title: "Looking up barcode...",
      description: `Searching for product: ${barcode}`,
    });

    try {
      const productData = await lookupBarcode(barcode);

      if (productData && productData.carbsPer100g) {
        // Create custom food from barcode data
        const carbRatio = productData.carbsPer100g / 100;
        const customFood: Food = {
          id: `custom-${Date.now()}`,
          name: productData.productName,
          category: "Other",
          carbRatio,
        };

        // Save to custom foods
        const customFoods = JSON.parse(localStorage.getItem("carbpal_custom_foods") || "[]");
        customFoods.push(customFood);
        localStorage.setItem("carbpal_custom_foods", JSON.stringify(customFoods));

        // Auto-backup to Google Drive
        googleDriveClient.autoBackup(exportAllData(), () => {
          toast({
            title: "Auto-backed up to Drive",
            description: "Changes saved to Google Drive ✓",
          });
        });

        // Add as ingredient
        handleAddIngredient(customFood);

        toast({
          title: "Product Added!",
          description: `${productData.productName} added to ingredients (${productData.carbsPer100g.toFixed(1)}g carbs per 100g)`,
        });
      } else {
        toast({
          title: "Product Not Found",
          description: "This barcode isn't in our database. Add ingredient manually.",
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

  const handleSaveRecipe = () => {
    if (!recipeName.trim()) {
      toast({
        title: "Recipe Name Required",
        description: "Please enter a name for your recipe",
        variant: "destructive",
      });
      return;
    }

    if (ingredients.length === 0) {
      toast({
        title: "No Ingredients",
        description: "Please add at least one ingredient",
        variant: "destructive",
      });
      return;
    }

    const recipe = {
      id: recipeId,
      name: recipeName,
      ingredients: ingredients.map(ing => ({
        foodId: ing.food.id,
        foodName: ing.food.name,
        weight: ing.weight,
        carbs: ing.carbs,
      })),
      servings: parseFloat(servings),
      totalCarbs,
      carbsPerServing,
      createdAt: editRecipe?.createdAt || new Date().toISOString(),
    };

    const recipes = JSON.parse(localStorage.getItem("carbpal_recipes") || "[]");
    const existingIndex = recipes.findIndex((r: SavedRecipe) => r.id === recipeId);

    if (existingIndex >= 0) {
      recipes[existingIndex] = recipe;
      toast({
        title: "Recipe Updated",
        description: `${recipe.name} has been updated`,
      });
    } else {
      recipes.push(recipe);
      toast({
        title: "Recipe Saved",
        description: `${recipe.name} has been saved to your recipes`,
      });
    }

    localStorage.setItem("carbpal_recipes", JSON.stringify(recipes));

    // Add to calculation history
    const calcHistory = JSON.parse(localStorage.getItem('carbpal_calc_history') || '[]');
    const historyItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: 'recipe',
      recipeName: recipe.name,
      servings: recipe.servings,
      totalCarbs: recipe.totalCarbs,
      carbsPerServing: recipe.carbsPerServing
    };
    calcHistory.unshift(historyItem);
    localStorage.setItem('carbpal_calc_history', JSON.stringify(calcHistory.slice(0, 20)));

    // Auto-backup to Google Drive
    googleDriveClient.autoBackup(exportAllData(), () => {
      toast({
        title: "Auto-backed up to Drive",
        description: "Changes saved to Google Drive ✓",
      });
    });

    onClose();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{editRecipe ? "Edit Recipe" : "Build Your Recipe"}</CardTitle>
              <CardDescription>Add ingredients and calculate carbs per serving</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-builder"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipe Name */}
          <div className="space-y-2">
            <Label htmlFor="recipe-name">Recipe Name</Label>
            <Input
              ref={recipeNameRef}
              id="recipe-name"
              data-testid="input-recipe-name"
              placeholder="e.g., Spaghetti Bolognese"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
            />
          </div>

          {/* Servings */}
          <div className="space-y-2">
            <Label htmlFor="servings">Number of Servings</Label>
            <Input
              id="servings"
              data-testid="input-servings"
              type="number"
              placeholder="1"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              min="1"
              step="1"
            />
          </div>

          {/* Ingredients */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <Label>Ingredients</Label>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                {user?.isPremium ? (
                  <div className="flex items-center gap-1">
                    <Crown className="h-3 w-3 text-primary" />
                    <BarcodeScanner onScanSuccess={handleBarcodeScan} />
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation('/pricing')}
                    data-testid="button-barcode-scanner-premium"
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    Scan Barcode
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomFoodDialog(true)}
                  data-testid="button-add-custom-ingredient"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Custom Food
                </Button>
              </div>
            </div>

            {/* Add Ingredient Button/Search */}
            {!showIngredientSearch ? (
              <Button
                variant="outline"
                onClick={() => setShowIngredientSearch(true)}
                className="w-full"
                data-testid="button-add-ingredient"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Ingredient
              </Button>
            ) : (
              <div className="space-y-2">
                <FoodSearch
                  onSelect={handleAddIngredient}
                  placeholder="Search and add ingredient..."
                  testId="search-recipe-ingredient"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowIngredientSearch(false)}
                  data-testid="button-cancel-ingredient-search"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Ingredients List */}
            {ingredients.length > 0 && (
              <div className="space-y-3">
                {ingredients.map((ingredient, index) => (
                  <div
                    key={ingredient.id}
                    className="flex items-end gap-2"
                    ref={index === ingredients.length - 1 ? lastIngredientRef : null}
                  >
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{ingredient.food.name}</p>
                      <Input
                        type="number"
                        placeholder="Weight (g)"
                        value={ingredient.weight || ""}
                        onChange={(e) => handleUpdateWeight(ingredient.id, e.target.value)}
                        min="0"
                        step="0.1"
                        data-testid={`input-ingredient-weight-${ingredient.id}`}
                      />
                    </div>
                    <div className="w-24 text-right">
                      <p className="text-xs text-muted-foreground">Carbs</p>
                      <p className="text-lg font-mono font-semibold text-primary" data-testid={`text-ingredient-carbs-${ingredient.id}`}>
                        {ingredient.carbs.toFixed(1)}g
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveIngredient(ingredient.id)}
                      data-testid={`button-remove-ingredient-${ingredient.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {ingredients.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No ingredients added yet</p>
                <p className="text-sm">Search for foods above or create a custom food</p>
              </div>
            )}
          </div>

          {/* Summary */}
          {ingredients.length > 0 && (
            <div className="space-y-4 pt-6 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Carbs</p>
                  <p className="text-2xl font-mono font-bold" data-testid="text-total-carbs">
                    {totalCarbs.toFixed(1)}g
                  </p>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Carbs per Serving</p>
                  <p className="text-2xl font-mono font-bold text-primary" data-testid="text-carbs-per-serving">
                    {carbsPerServing.toFixed(1)}g
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveRecipe}
                  disabled={!recipeName.trim() || ingredients.length === 0}
                  className="flex-1"
                  size="lg"
                  data-testid="button-save-recipe"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Recipe
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  size="lg"
                  data-testid="button-cancel-recipe"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Food Dialog */}
      <Dialog open={showCustomFoodDialog} onOpenChange={setShowCustomFoodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Food</DialogTitle>
            <DialogDescription>
              Create a new food entry using nutrition label information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-food-name">Food Name</Label>
              <Input
                id="custom-food-name"
                data-testid="input-custom-food-name"
                placeholder="e.g., Grandma's Apple Pie"
                value={customFoodName}
                onChange={(e) => setCustomFoodName(e.target.value)}
              />
            </div>

            {!showAdvancedCustom ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="custom-serving-size">Serving Size (grams)</Label>
                  <Input
                    id="custom-serving-size"
                    data-testid="input-custom-serving-size"
                    type="number"
                    placeholder="e.g., 30"
                    value={customServingSize}
                    onChange={(e) => setCustomServingSize(e.target.value)}
                    min="0"
                    step="0.1"
                  />
                  <p className="text-xs text-muted-foreground">
                    From the nutrition label
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-serving-carbs">Carbs per Serving (grams)</Label>
                  <Input
                    id="custom-serving-carbs"
                    data-testid="input-custom-serving-carbs"
                    type="number"
                    placeholder="e.g., 20"
                    value={customServingCarbs}
                    onChange={(e) => setCustomServingCarbs(e.target.value)}
                    min="0"
                    step="0.1"
                  />
                  <p className="text-xs text-muted-foreground">
                    From the nutrition label
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="custom-carb-ratio">Carbs per 100g</Label>
                <Input
                  id="custom-carb-ratio"
                  data-testid="input-custom-carb-ratio"
                  type="number"
                  placeholder="e.g., 45"
                  value={customCarbRatio}
                  onChange={(e) => setCustomCarbRatio(e.target.value)}
                  min="0"
                  max="100"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground">
                  Enter grams of carbs per 100g of food (e.g., 45 means 45g carbs per 100g)
                </p>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedCustom(!showAdvancedCustom)}
              data-testid="button-toggle-advanced-custom"
              className="w-full"
            >
              {showAdvancedCustom ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-2" />
                  Use Nutrition Label
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-2" />
                  Advanced: Enter Carbs per 100g
                </>
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomFoodDialog(false);
                setCustomFoodName("");
                setCustomServingSize("");
                setCustomServingCarbs("");
                setCustomCarbRatio("");
                setShowAdvancedCustom(false);
              }}
              data-testid="button-cancel-custom-food"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCustomFood}
              data-testid="button-create-custom-food"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create & Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
