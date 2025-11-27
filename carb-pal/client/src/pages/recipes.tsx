import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChefHat, Plus, Trash2, Eye } from "lucide-react";
import { RecipeBuilder } from "@/components/recipe-builder";
import { PageHeader } from "@/components/page-header";
import { SuggestionDialog } from "@/components/suggestion-dialog";
import { useToast } from "@/hooks/use-toast";
import { exportAllData } from "@/lib/data-export";
import { googleDriveClient } from "@/lib/google-drive";
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

export default function Recipes() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<SavedRecipe | null>(null);
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [deleteRecipeId, setDeleteRecipeId] = useState<string | null>(null);
  const [viewRecipe, setViewRecipe] = useState<SavedRecipe | null>(null);
  const [editedServings, setEditedServings] = useState<string>("");
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRecipes();
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

  const handleDeleteRecipe = () => {
    if (!deleteRecipeId) return;

    const updated = recipes.filter(r => r.id !== deleteRecipeId);
    localStorage.setItem("carbpal_recipes", JSON.stringify(updated));
    setRecipes(updated);
    setDeleteRecipeId(null);

    // Auto-backup to Google Drive
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

  const handleBuilderClose = () => {
    setShowBuilder(false);
    setEditingRecipe(null);
    loadRecipes();
  };

  const handleEditRecipe = (recipe: SavedRecipe) => {
    setEditingRecipe(recipe);
    setShowBuilder(true);
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

    const updated = recipes.map(r => r.id === viewRecipe.id ? updatedRecipe : r);
    localStorage.setItem("carbpal_recipes", JSON.stringify(updated));
    setRecipes(updated);
    setViewRecipe(updatedRecipe);

    // Auto-backup to Google Drive
    googleDriveClient.autoBackup(exportAllData(), () => {
      toast({
        title: "Auto-backed up to Drive",
        description: "Changes saved to Google Drive ✓",
      });
    });

    toast({
      title: "Servings Updated",
      description: `Recipe now shows ${servings} serving${servings !== 1 ? 's' : ''}`
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <PageHeader
        icon={ChefHat}
        title="Recipes"
        description={recipes.length === 0
          ? "Build recipes and calculate carbs per serving"
          : `${recipes.length} saved ${recipes.length === 1 ? 'recipe' : 'recipes'}`
        }
        showSidebarTrigger={true}
        onSuggestionClick={() => setSuggestionDialogOpen(true)}
      />
      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-6 md:pb-8">

        <div className="mb-6">
          <Button
            onClick={() => setShowBuilder(true)}
            data-testid="button-new-recipe"
            size="lg"
            className="w-full md:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Recipe
          </Button>
        </div>

        {showBuilder ? (
          <RecipeBuilder onClose={handleBuilderClose} editRecipe={editingRecipe} />
        ) : recipes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="hover-elevate">
                <CardHeader>
                  <CardTitle className="text-xl">{recipe.name}</CardTitle>
                  <CardDescription>
                    {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''} · {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-mono font-bold">{recipe.totalCarbs.toFixed(1)}g</p>
                      </div>
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <p className="text-xs text-muted-foreground">Per Serving</p>
                        <p className="text-lg font-mono font-bold text-primary">
                          {recipe.carbsPerServing.toFixed(1)}g
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewRecipe(recipe)}
                        data-testid={`button-view-recipe-${recipe.id}`}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditRecipe(recipe)}
                        data-testid={`button-edit-recipe-${recipe.id}`}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteRecipeId(recipe.id)}
                        data-testid={`button-delete-recipe-${recipe.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Create a new recipe to calculate carbohydrates per serving
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <div className="max-w-md mx-auto space-y-4">
                <div className="h-24 w-24 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <ChefHat className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Build custom recipes by adding multiple ingredients, then divide by servings to get carbs per portion.
                </p>
                <Button
                  onClick={() => setShowBuilder(true)}
                  data-testid="button-create-first-recipe"
                  size="lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Recipe
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRecipeId} onOpenChange={() => setDeleteRecipeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your recipe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecipe}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Recipe Dialog */}
      <Dialog open={!!viewRecipe} onOpenChange={() => setViewRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{viewRecipe?.name}</DialogTitle>
          </DialogHeader>
          {viewRecipe && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Carbs</p>
                  <p className="text-3xl font-mono font-bold">{viewRecipe.totalCarbs.toFixed(1)}g</p>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Per Serving</p>
                  <p className="text-3xl font-mono font-bold text-primary">
                    {viewRecipe.carbsPerServing.toFixed(1)}g
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="edit-servings">Number of Servings</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-servings"
                    type="number"
                    value={editedServings}
                    onChange={(e) => setEditedServings(e.target.value)}
                    min="0.1"
                    step="0.1"
                    data-testid="input-edit-servings"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleUpdateServings}
                    data-testid="button-update-servings"
                  >
                    Update
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Adjust servings to recalculate carbs per serving
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Ingredients</h3>
                <div className="space-y-2">
                  {viewRecipe.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{ing.foodName}</p>
                        <p className="text-sm text-muted-foreground">{ing.weight}g</p>
                      </div>
                      <p className="font-mono font-semibold text-primary">
                        {ing.carbs.toFixed(1)}g
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setViewRecipe(null)}
                data-testid="button-close-recipe-view"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SuggestionDialog
        open={suggestionDialogOpen}
        onOpenChange={setSuggestionDialogOpen}
      />
    </div>
  );
}
