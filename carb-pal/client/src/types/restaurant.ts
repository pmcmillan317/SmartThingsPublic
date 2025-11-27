// Restaurant and brand types for FatSecret API

export interface BrandMenuItem {
  food_id: string;
  item_name: string;
  carbs: number;
  serving_size: string;
}

export interface Brand {
  brand_name: string;
  item_count: number;
  menu_items: BrandMenuItem[];
}
