/**
 * Data Export/Import Utilities
 * Handles exporting and importing all user data for backup/restore
 */

export interface ExportData {
  version: string;
  exportDate: string;
  customFoods: any[];
  calcHistory: any[];
  recipes: any[];
  meals: any[];
  theme: string;
  disclaimerAccepted: boolean;
}

const STORAGE_KEYS = {
  customFoods: 'carbpal_custom_foods',
  calcHistory: 'carbpal_calc_history',
  recipes: 'carbpal_recipes',
  meals: 'carbpal_meals',
  theme: 'theme',
  disclaimer: 'carbpal_disclaimer_accepted'
};

/**
 * Export all user data to a JSON object
 */
export function exportAllData(): ExportData {
  const data: ExportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    customFoods: JSON.parse(localStorage.getItem(STORAGE_KEYS.customFoods) || '[]'),
    calcHistory: JSON.parse(localStorage.getItem(STORAGE_KEYS.calcHistory) || '[]'),
    recipes: JSON.parse(localStorage.getItem(STORAGE_KEYS.recipes) || '[]'),
    meals: JSON.parse(localStorage.getItem(STORAGE_KEYS.meals) || '[]'),
    theme: localStorage.getItem(STORAGE_KEYS.theme) || 'light',
    disclaimerAccepted: localStorage.getItem(STORAGE_KEYS.disclaimer) === 'true'
  };

  return data;
}

/**
 * Download data as a JSON file (with iOS share sheet support)
 */
export async function downloadDataAsFile(data: ExportData): Promise<boolean> {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const fileName = `carbpal-backup-${new Date().toISOString().split('T')[0]}.json`;

  if (navigator.share && navigator.canShare) {
    const file = new File([blob], fileName, { type: 'application/json' });

    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'CarbPal Backup',
          text: 'Your CarbPal data backup'
        });
        return true;
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return false;
        }
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Import data from a JSON object and restore to localStorage
 */
export function importData(data: ExportData, options: { merge?: boolean } = {}): { success: boolean; message: string } {
  try {
    // Validate data structure
    if (!data.version || !data.exportDate) {
      return { success: false, message: 'Invalid backup file format' };
    }

    const { merge = false } = options;

    // Import custom foods
    if (data.customFoods && Array.isArray(data.customFoods)) {
      if (merge) {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.customFoods) || '[]');
        const merged = [...existing, ...data.customFoods];
        // Remove duplicates by id
        const unique = merged.filter((food, index, self) =>
          index === self.findIndex(f => f.id === food.id)
        );
        localStorage.setItem(STORAGE_KEYS.customFoods, JSON.stringify(unique));
      } else {
        localStorage.setItem(STORAGE_KEYS.customFoods, JSON.stringify(data.customFoods));
      }
    }

    // Import calculation history
    if (data.calcHistory && Array.isArray(data.calcHistory)) {
      if (merge) {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.calcHistory) || '[]');
        const merged = [...existing, ...data.calcHistory];
        // Sort by timestamp and remove duplicates
        const sorted = merged.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        localStorage.setItem(STORAGE_KEYS.calcHistory, JSON.stringify(sorted));
      } else {
        localStorage.setItem(STORAGE_KEYS.calcHistory, JSON.stringify(data.calcHistory));
      }
    }

    // Import recipes
    if (data.recipes && Array.isArray(data.recipes)) {
      if (merge) {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.recipes) || '[]');
        const merged = [...existing, ...data.recipes];
        const unique = merged.filter((recipe, index, self) =>
          index === self.findIndex(r => r.id === recipe.id)
        );
        localStorage.setItem(STORAGE_KEYS.recipes, JSON.stringify(unique));
      } else {
        localStorage.setItem(STORAGE_KEYS.recipes, JSON.stringify(data.recipes));
      }
    }

    // Import meals
    if (data.meals && Array.isArray(data.meals)) {
      if (merge) {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.meals) || '[]');
        const merged = [...existing, ...data.meals];
        localStorage.setItem(STORAGE_KEYS.meals, JSON.stringify(merged));
      } else {
        localStorage.setItem(STORAGE_KEYS.meals, JSON.stringify(data.meals));
      }
    }

    // Import theme
    if (data.theme) {
      localStorage.setItem(STORAGE_KEYS.theme, data.theme);
    }

    // Import disclaimer acceptance
    if (data.disclaimerAccepted !== undefined) {
      localStorage.setItem(STORAGE_KEYS.disclaimer, data.disclaimerAccepted ? 'true' : 'false');
    }

    // Trigger storage event to update UI
    window.dispatchEvent(new Event('storage'));

    // Trigger custom event for components to refresh
    window.dispatchEvent(new CustomEvent('dataImported'));

    return {
      success: true,
      message: merge ? 'Data merged successfully' : 'Data restored successfully'
    };
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get a summary of data to be exported
 */
export function getDataSummary(): {
  customFoods: number;
  calcHistory: number;
  recipes: number;
  meals: number;
} {
  return {
    customFoods: JSON.parse(localStorage.getItem(STORAGE_KEYS.customFoods) || '[]').length,
    calcHistory: JSON.parse(localStorage.getItem(STORAGE_KEYS.calcHistory) || '[]').length,
    recipes: JSON.parse(localStorage.getItem(STORAGE_KEYS.recipes) || '[]').length,
    meals: JSON.parse(localStorage.getItem(STORAGE_KEYS.meals) || '[]').length
  };
}
