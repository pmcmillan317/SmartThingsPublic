import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronDown, ChevronUp, Apple } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SuggestionDialog } from "@/components/suggestion-dialog";
import { useToast } from "@/hooks/use-toast";
import { getDataSummary, exportAllData } from "@/lib/data-export";
import { googleDriveClient } from "@/lib/google-drive";
import type { Food } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CustomFoods() {
  const { toast } = useToast();
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [showAddFoodDialog, setShowAddFoodDialog] = useState(false);
  const [newFoodName, setNewFoodName] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [servingCarbs, setServingCarbs] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [directCarbRatio, setDirectCarbRatio] = useState("");

  useEffect(() => {
    loadCustomFoods();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      loadCustomFoods();
    };

    const handleDataImported = () => {
      loadCustomFoods();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dataImported', handleDataImported);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dataImported', handleDataImported);
    };
  }, []);

  const updateDataSummary = () => {
    getDataSummary();
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
    updateDataSummary();

    // Auto-backup to Google Drive
    googleDriveClient.autoBackup(exportAllData(), () => {
      toast({
        title: "Auto-backed up to Drive",
        description: "Changes saved to Google Drive ✓",
      });
    });

    setNewFoodName("");
    setServingSize("");
    setServingCarbs("");
    setDirectCarbRatio("");
    setShowAdvanced(false);
    setShowAddFoodDialog(false);

    toast({
      title: "Custom Food Added",
      description: `${newFood.name} is now available in your food database`,
    });
  };

  const handleDeleteCustomFood = (id: string) => {
    const updated = customFoods.filter(f => f.id !== id);
    localStorage.setItem("carbpal_custom_foods", JSON.stringify(updated));
    setCustomFoods(updated);
    updateDataSummary();

    // Auto-backup to Google Drive
    googleDriveClient.autoBackup(exportAllData(), () => {
      toast({
        title: "Auto-backed up to Drive",
        description: "Changes saved to Google Drive ✓",
      });
    });

    toast({
      title: "Custom Food Deleted",
      description: "The food has been removed from your database",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <PageHeader
        icon={Apple}
        title="Custom Foods"
        description="Create and manage your personalized food database"
        showSidebarTrigger={true}
        onSuggestionClick={() => setSuggestionDialogOpen(true)}
      />
      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-6 md:pb-8">

        {/* Summary Stats */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Apple className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Custom Foods</p>
              <p className="text-2xl font-semibold" data-testid="text-custom-foods-count">
                {customFoods.length}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Custom foods are saved to your device and available in all calculators
          </p>
        </Card>

        {/* Add Food Button */}
        <Button
          onClick={() => setShowAddFoodDialog(true)}
          data-testid="button-add-custom-food"
          className="w-full mb-6"
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Food
        </Button>

        {/* Custom Foods List */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Your Custom Foods</h2>

          {customFoods.length > 0 ? (
            <div className="space-y-2">
              {customFoods.map((food) => (
                <div
                  key={food.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg hover-elevate"
                  data-testid={`card-custom-food-${food.id}`}
                >
                  <div>
                    <p className="font-medium" data-testid={`text-food-name-${food.id}`}>
                      {food.name}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-food-carbs-${food.id}`}>
                      {(food.carbRatio * 100).toFixed(1)}g carbs per 100g
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCustomFood(food.id)}
                    data-testid={`button-delete-custom-food-${food.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Apple className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-base font-medium mb-1">No custom foods yet</p>
              <p className="text-sm">Create foods specific to your dietary needs</p>
            </div>
          )}
        </Card>

        {/* How It Works */}
        <Card className="p-6 mt-6 bg-primary/5">
          <h3 className="font-semibold mb-3">How Custom Foods Work</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Create foods using nutrition label data or direct carb ratios</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Custom foods appear in all food searches and calculators</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Data is stored locally on your device for privacy</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Export your data from Settings to back up custom foods</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Add Custom Food Dialog */}
      <Dialog open={showAddFoodDialog} onOpenChange={setShowAddFoodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Food</DialogTitle>
            <DialogDescription>
              Create a new food entry using nutrition label information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="food-name">Food Name</Label>
              <Input
                id="food-name"
                data-testid="input-food-name"
                placeholder="e.g., Grandma's Apple Pie"
                value={newFoodName}
                onChange={(e) => setNewFoodName(e.target.value)}
              />
            </div>

            {!showAdvanced ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="serving-size">Serving Size (grams)</Label>
                  <Input
                    id="serving-size"
                    data-testid="input-serving-size"
                    type="number"
                    placeholder="e.g., 30"
                    value={servingSize}
                    onChange={(e) => setServingSize(e.target.value)}
                    min="0"
                    step="0.1"
                  />
                  <p className="text-xs text-muted-foreground">
                    From the nutrition label
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serving-carbs">Carbs per Serving (grams)</Label>
                  <Input
                    id="serving-carbs"
                    data-testid="input-serving-carbs"
                    type="number"
                    placeholder="e.g., 20"
                    value={servingCarbs}
                    onChange={(e) => setServingCarbs(e.target.value)}
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
                <Label htmlFor="direct-carb-ratio">Carbs per 100g</Label>
                <Input
                  id="direct-carb-ratio"
                  data-testid="input-direct-carb-ratio"
                  type="number"
                  placeholder="e.g., 45"
                  value={directCarbRatio}
                  onChange={(e) => setDirectCarbRatio(e.target.value)}
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
              onClick={() => setShowAdvanced(!showAdvanced)}
              data-testid="button-toggle-advanced"
              className="w-full"
            >
              {showAdvanced ? (
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
                setShowAddFoodDialog(false);
                setNewFoodName("");
                setServingSize("");
                setServingCarbs("");
                setDirectCarbRatio("");
                setShowAdvanced(false);
              }}
              data-testid="button-cancel-add-food"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCustomFood}
              data-testid="button-save-custom-food"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Food
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SuggestionDialog
        open={suggestionDialogOpen}
        onOpenChange={setSuggestionDialogOpen}
      />
    </div>
  );
}
