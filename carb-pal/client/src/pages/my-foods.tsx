import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Apple, Plus, Trash2, Eye, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { RecipeBuilder } from "@/components/recipe-builder";
import { PageHeader } from "@/components/page-header";
import { SuggestionDialog } from "@/components/suggestion-dialog";
import { useToast } from "@/hooks/use-toast";
import { exportAllData, getDataSummary } from "@/lib/data-export";
import { googleDriveClient } from "@/lib/google-drive";
import type { Food } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export default function MyFoods() {
  const { toast } = useToast();

  // Recipe state
  const [showRecipeBuilder, setShowRecipeBuilder] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<SavedRecipe | null>(null);
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [viewRecipe, setViewRecipe] = useState<SavedRecipe | null>(null);
  const [editedServings, setEditedServings] = useState<string>("");
  const [deleteRecipeId, setDeleteRecipeId] = useState<string | null>(null);

  // Custom food state
  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [showAddFoodDialog, setShowAddFoodDialog] = useState(false);
  const [newFoodName, setNewFoodName] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [servingCarbs, setServingCarbs] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [directCarbRatio, setDirectCarbRatio] = useState("");
  const [deleteFoodId, setDeleteFoodId] = useState<string | null>(null);

  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);

  useEffect(() => {
    loadRecipes();
    loadCustomFoods();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      loadCustomFoods();
    };

    const handleDataImported = () => {
      loadRecipes();
      loadCustomFoods();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dataImported', handleDataImported);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dataImported', handleDataImported);
    };
  }, []);

  const loadRecipes = () => {
    const stored = localStorage.getItem("carbpal_recipes");
    if (stored) {
      try {
        setRecipes(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load recipes", e);
      }
    }
  };

  const loadCustomFoods = () => {
    const stored = localStorage.getItem("carbpal_custom_foods");
    if (stored) {
      try {
        setCustomFoods(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load custom foods", e);
      }
    }
  };

  const handleDeleteRecipe = () => {
    if (!deleteRecipeId) return;

    const updated = recipes.filter(r => r.id !== deleteRecipeId);
    localStorage.setItem("carbpal_recipes", JSON.stringify(updated));
    setRecipes(updated);
    setDeleteRecipeId(null);

    googleDriveClient.autoBackup(exportAllData(), () => {
      toast({
        title: "Auto-backed up to Drive",
        description: "Changes saved to Google Drive ✓",
      });
    });

    toast({
      title: "Recipe Deleted",
      description: "The recipe has been removed from your collection",
    });
  };

  const handleDeleteCustomFood = () => {
    if (!deleteFoodId) return;

    const updated = customFoods.filter(f => f.id !== deleteFoodId);
    localStorage.setItem("carbpal_custom_foods", JSON.stringify(updated));
    setCustomFoods(updated);
    setDeleteFoodId(null);
    getDataSummary();

    window.dispatchEvent(new Event('customFoodAdded'));

    googleDriveClient.autoBackup(exportAllData(), () => {
      toast({
        title: "Auto-backed up to Drive",
        description: "Changes saved to Google Drive ✓",
      });
    });

    toast({
      title: "Custom Food Deleted",
      description: "The food has been removed from your collection",
    });
  };

  const handleBuilderClose = () => {
    setShowRecipeBuilder(false);
    setEditingRecipe(null);
    loadRecipes();
  };

  const handleEditRecipe = (recipe: SavedRecipe) => {
    setEditingRecipe(recipe);
    setShowRecipeBuilder(true);
  };

  const handleViewRecipe = (recipe: SavedRecipe) => {
    setViewRecipe(recipe);
    setEditedServings(recipe.servings.toString());
  };

  const handleUpdateServings = () => {
    if (!viewRecipe) return;

    const servings = parseFloat(editedServings);
    if (isNaN(servings) || servings <= 0) {
      toast({
        title: "Invalid Servings",
        description: "Please enter a valid number of servings",
        variant: "destructive"
      });
      return;
    }

    const updatedRecipe = {
      ...viewRecipe,
      servings,
      carbsPerServing: viewRecipe.totalCarbs / servings
    };

    const updatedRecipes = recipes.map(r => r.id === viewRecipe.id ? updatedRecipe : r);
    localStorage.setItem("carbpal_recipes", JSON.stringify(updatedRecipes));
    setRecipes(updatedRecipes);
    setViewRecipe(null);

    googleDriveClient.autoBackup(exportAllData(), () => {
      toast({
        title: "Auto-backed up to Drive",
        description: "Changes saved to Google Drive ✓",
      });
    });

    toast({
      title: "Servings Updated",
      description: `Recipe servings updated to ${servings}`,
    });
  };

  const handleAddCustomFood = () => {
    if (!newFoodName.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a food name",
        variant: "destructive",
      });
      return;
    }

    let carbRatio: number;

    if (showAdvanced) {
      const ratio = parseFloat(directCarbRatio);
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
      const serving = parseFloat(servingSize);
      const carbs = parseFloat(servingCarbs);

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

    const newFood: Food = {
      id: `custom-${Date.now()}`,
      name: newFoodName,
      category: "Other",
      carbRatio,
    };

    const updated = [...customFoods, newFood];
    localStorage.setItem("carbpal_custom_foods", JSON.stringify(updated));
    setCustomFoods(updated);
    getDataSummary();

    window.dispatchEvent(new Event('customFoodAdded'));

    googleDriveClient.autoBackup(exportAllData(), () => {
      toast({
        title: "Auto-backed up to Drive",
        description: "Changes saved to Google Drive ✓",
      });
    });

    toast({
      title: "Custom Food Added",
      description: `${newFoodName} has been saved`,
    });

    setShowAddFoodDialog(false);
    setNewFoodName("");
    setServingSize("");
    setServingCarbs("");
    setDirectCarbRatio("");
    setShowAdvanced(false);
  };

  const allItems = [
    ...recipes.map(r => ({ type: 'recipe' as const, data: r })),
    ...customFoods.map(f => ({ type: 'food' as const, data: f }))
  ].sort((a, b) => {
    const dateA = a.type === 'recipe' ? new Date(a.data.createdAt).getTime() : 0;
    const dateB = b.type === 'recipe' ? new Date(b.data.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <PageHeader
        icon={ChefHat}
        title="My Foods"
        description="Manage your recipes and custom foods"
        showSidebarTrigger={true}
        onSuggestionClick={() => setSuggestionDialogOpen(true)}
      />

      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-6 md:pb-8">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Button
            onClick={() => setShowRecipeBuilder(true)}
            className="flex-1"
            size="lg"
            data-testid="button-add-recipe"
          >
            <ChefHat className="h-5 w-5 mr-2" />
            New Recipe
          </Button>
          <Button
            onClick={() => setShowAddFoodDialog(true)}
            variant="outline"
            className="flex-1"
            size="lg"
            data-testid="button-add-custom-food"
          >
            <Apple className="h-5 w-5 mr-2" />
            New Custom Food
          </Button>
        </div>

        {/* Combined List */}
        {allItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ChefHat className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No items yet</p>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Create recipes or add custom foods to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {allItems.map((item, index) => (
              item.type === 'recipe' ? (
                <Card key={item.data.id} data-testid={`recipe-card-${index}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="default" className="shrink-0">
                            <ChefHat className="h-3 w-3 mr-1" />
                            Recipe
                          </Badge>
                        </div>
                        <CardTitle className="text-lg truncate">{item.data.name}</CardTitle>
                        <CardDescription>
                          {item.data.servings} {item.data.servings === 1 ? 'serving' : 'servings'} • {item.data.carbsPerServing.toFixed(1)}g carbs per serving
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleViewRecipe(item.data)}
                          data-testid={`button-view-recipe-${index}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEditRecipe(item.data)}
                          data-testid={`button-edit-recipe-${index}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setDeleteRecipeId(item.data.id)}
                          data-testid={`button-delete-recipe-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ) : (
                <Card key={item.data.id} data-testid={`custom-food-card-${index}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="shrink-0">
                            <Apple className="h-3 w-3 mr-1" />
                            Custom Food
                          </Badge>
                        </div>
                        <CardTitle className="text-lg truncate">{item.data.name}</CardTitle>
                        <CardDescription>
                          {(item.data.carbRatio * 100).toFixed(1)}g carbs per 100g
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setDeleteFoodId(item.data.id)}
                          data-testid={`button-delete-food-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )
            ))}
          </div>
        )}
      </div>

      {/* Recipe Builder */}
      {showRecipeBuilder && (
        <RecipeBuilder
          onClose={handleBuilderClose}
          editRecipe={editingRecipe}
        />
      )}

      {/* View Recipe Dialog */}
      <Dialog open={!!viewRecipe} onOpenChange={() => setViewRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{viewRecipe?.name}</DialogTitle>
            <DialogDescription>Recipe details and ingredients</DialogDescription>
          </DialogHeader>
          {viewRecipe && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="view-servings">Servings</Label>
                  <Input
                    id="view-servings"
                    type="number"
                    value={editedServings}
                    onChange={(e) => setEditedServings(e.target.value)}
                    min="0.1"
                    step="0.1"
                    data-testid="input-edit-servings"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carbs per Serving</Label>
                  <div className="text-2xl font-mono font-bold text-primary" data-testid="text-carbs-per-serving">
                    {(viewRecipe.totalCarbs / parseFloat(editedServings || viewRecipe.servings.toString())).toFixed(1)}g
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ingredients ({viewRecipe.ingredients.length})</Label>
                <div className="space-y-2 max-h-[300px] overflow-auto">
                  {viewRecipe.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex justify-between p-3 bg-muted rounded-md" data-testid={`ingredient-${idx}`}>
                      <div className="flex-1">
                        <div className="font-medium">{ing.foodName}</div>
                        <div className="text-sm text-muted-foreground">{ing.weight}g</div>
                      </div>
                      <div className="font-mono font-semibold">{ing.carbs.toFixed(1)}g</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-lg font-semibold">Total Carbs</div>
                <div className="text-3xl font-mono font-bold text-primary" data-testid="text-total-carbs">
                  {viewRecipe.totalCarbs.toFixed(1)}g
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRecipe(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateServings} data-testid="button-update-servings">
              Update Servings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Food Dialog */}
      <Dialog open={showAddFoodDialog} onOpenChange={setShowAddFoodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Food</DialogTitle>
            <DialogDescription>
              Create a custom food with carb information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="food-name">Food Name</Label>
              <Input
                id="food-name"
                placeholder="e.g., My Protein Shake"
                value={newFoodName}
                onChange={(e) => setNewFoodName(e.target.value)}
                data-testid="input-custom-food-name"
              />
            </div>

            {!showAdvanced ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serving-size">Serving Size (g)</Label>
                    <Input
                      id="serving-size"
                      type="number"
                      placeholder="e.g., 30"
                      value={servingSize}
                      onChange={(e) => setServingSize(e.target.value)}
                      data-testid="input-serving-size"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serving-carbs">Carbs per Serving (g)</Label>
                    <Input
                      id="serving-carbs"
                      type="number"
                      placeholder="e.g., 20"
                      value={servingCarbs}
                      onChange={(e) => setServingCarbs(e.target.value)}
                      data-testid="input-serving-carbs"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(true)}
                  className="w-full"
                  data-testid="button-show-advanced"
                >
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Advanced: Enter carbs per 100g directly
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="direct-carbs">Carbs per 100g</Label>
                  <Input
                    id="direct-carbs"
                    type="number"
                    placeholder="e.g., 66.67"
                    value={directCarbRatio}
                    onChange={(e) => setDirectCarbRatio(e.target.value)}
                    data-testid="input-direct-carbs"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(false)}
                  className="w-full"
                  data-testid="button-hide-advanced"
                >
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Use serving size instead
                </Button>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddFoodDialog(false);
              setNewFoodName("");
              setServingSize("");
              setServingCarbs("");
              setDirectCarbRatio("");
              setShowAdvanced(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomFood} data-testid="button-save-custom-food">
              Add Food
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Recipe Confirmation */}
      <AlertDialog open={!!deleteRecipeId} onOpenChange={() => setDeleteRecipeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this recipe. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecipe} data-testid="button-confirm-delete-recipe">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Custom Food Confirmation */}
      <AlertDialog open={!!deleteFoodId} onOpenChange={() => setDeleteFoodId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Food?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this custom food. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomFood} data-testid="button-confirm-delete-food">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SuggestionDialog
        open={suggestionDialogOpen}
        onOpenChange={setSuggestionDialogOpen}
      />
    </div>
  );
}
