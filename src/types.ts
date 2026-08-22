export type Nutrient = {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
};

export type Ingredient = {
  id: string;
  name: string;
  amount: number;
  unit: string;
  nutrients?: Nutrient;
};

export type RecipeCategory = "bread" | "dessert" | "sauce" | "other";

export type Recipe = {
  id: string;
  name: string;
  category: RecipeCategory;
  yieldAmount: number;
  yieldUnit: string;
  ingredients: Ingredient[];
  notes: string;
  createdAt: string;
};

export type Batch = {
  id: string;
  recipeId: string;
  madeOn: string;
  yieldAmount: number;
  remainingAmount: number;
  yieldUnit: string;
  notes: string;
  createdAt: string;
};

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type FoodEntry = {
  id: string;
  date: string;
  meal: MealType;
  name: string;
  amount: number;
  unit: string;
  batchId?: string;
  recipeId?: string;
  nutrients?: Nutrient;
  notes?: string;
  createdAt: string;
};

export type Workout = {
  id: string;
  date: string;
  name: string;
  durationMin?: number;
  distanceKm?: number;
  kcal?: number;
  notes?: string;
  createdAt: string;
};

export type PhotoKind = "day" | "batch" | "recipe";

export type Photo = {
  id: string;
  kind: PhotoKind;
  refId: string;
  blob: Blob;
  createdAt: string;
};

export type MetaRow = {
  key: string;
  value: unknown;
};

export type ParsedQuickItem = {
  amount: number;
  unit: string;
  name: string;
  ofTotal?: number;
};
