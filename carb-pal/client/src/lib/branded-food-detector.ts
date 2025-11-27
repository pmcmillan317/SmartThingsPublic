// Detect if a food name likely represents a branded/restaurant item
const BRANDED_KEYWORDS = [
  'mcdonald',
  'burger king',
  'wendy',
  'subway',
  'taco bell',
  'kfc',
  'pizza hut',
  'domino',
  'papa john',
  'chipotle',
  'starbucks',
  'dunkin',
  'chick-fil-a',
  'arby',
  'dairy queen',
  'sonic',
  'panera',
  'olive garden',
  'applebee',
  'chili',
  'red lobster',
  'outback',
  'texas roadhouse',
  'panda express',
  'five guys',
  'shake shack',
  'in-n-out',
  'whataburger',
  'popeyes',
  'white castle',
];

export function containsBrandedFood(foodNames: string[]): boolean {
  const normalizedNames = foodNames.map(name => name.toLowerCase());

  return normalizedNames.some(name =>
    BRANDED_KEYWORDS.some(keyword => name.includes(keyword))
  );
}

export function isBrandedFoodName(foodName: string): boolean {
  const normalized = foodName.toLowerCase();
  return BRANDED_KEYWORDS.some(keyword => normalized.includes(keyword));
}
