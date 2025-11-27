import type { BrandMenuItem } from "@/types/restaurant";

export interface GroupedMenuItem {
  baseItem: BrandMenuItem;
  variations: BrandMenuItem[];
  isExpanded: boolean;
}

export interface MenuGroup {
  baseName: string;
  items: GroupedMenuItem[];
}

/**
 * Extracts the base name from a menu item by removing size indicators
 * Examples:
 * "Coffee - Small" -> "Coffee"
 * "French Vanilla (Medium)" -> "French Vanilla"
 * "Iced Capp, Small" -> "Iced Capp"
 */
function extractBaseName(itemName: string): string {
  // Common size patterns to remove
  const sizePatterns = [
    /\s*-\s*(small|medium|large|x-large|xl|extra large)\s*$/i,
    /\s*,\s*(small|medium|large|x-large|xl|extra large)\s*$/i,
    /\s*\(\s*(small|medium|large|x-large|xl|extra large)\s*\)\s*$/i,
    /\s+(small|medium|large|x-large|xl|extra large)\s*$/i,
  ];

  let baseName = itemName.trim();

  for (const pattern of sizePatterns) {
    baseName = baseName.replace(pattern, '');
  }

  return baseName.trim();
}

/**
 * Extracts size information from item name
 */
function extractSize(itemName: string): string {
  const sizeMatch = itemName.match(/(small|medium|large|x-large|xl|extra large)/i);
  return sizeMatch ? sizeMatch[1] : '';
}

/**
 * Groups menu items by their base name and organizes size variations
 */
export function groupMenuItems(items: BrandMenuItem[]): MenuGroup[] {
  const groupMap = new Map<string, BrandMenuItem[]>();

  // Group items by base name
  items.forEach(item => {
    const baseName = extractBaseName(item.item_name);
    if (!groupMap.has(baseName)) {
      groupMap.set(baseName, []);
    }
    groupMap.get(baseName)!.push(item);
  });

  // Convert to MenuGroup array and sort
  const groups: MenuGroup[] = [];

  groupMap.forEach((groupItems, baseName) => {
    // Sort items within group by size (Small -> Medium -> Large)
    const sizeOrder = ['small', 'medium', 'large', 'x-large', 'xl', 'extra large'];
    const sortedItems = [...groupItems].sort((a, b) => {
      const sizeA = extractSize(a.item_name).toLowerCase();
      const sizeB = extractSize(b.item_name).toLowerCase();

      const indexA = sizeOrder.indexOf(sizeA);
      const indexB = sizeOrder.indexOf(sizeB);

      // If both have sizes, sort by size order
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // Items with sizes come before items without
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // Otherwise alphabetically
      return a.item_name.localeCompare(b.item_name);
    });

    // If there's only one item or all items are identical, use as single item
    if (sortedItems.length === 1) {
      groups.push({
        baseName,
        items: [{
          baseItem: sortedItems[0],
          variations: [],
          isExpanded: false,
        }],
      });
    } else {
      // Use first item as representative
      groups.push({
        baseName,
        items: [{
          baseItem: sortedItems[0],
          variations: sortedItems,
          isExpanded: false,
        }],
      });
    }
  });

  // Sort groups alphabetically by base name
  return groups.sort((a, b) => a.baseName.localeCompare(b.baseName));
}

/**
 * Toggles the expanded state of a specific group
 */
export function toggleGroupExpansion(
  groups: MenuGroup[],
  baseName: string
): MenuGroup[] {
  return groups.map(group => {
    if (group.baseName === baseName) {
      return {
        ...group,
        items: group.items.map(item => ({
          ...item,
          isExpanded: !item.isExpanded,
        })),
      };
    }
    return group;
  });
}
