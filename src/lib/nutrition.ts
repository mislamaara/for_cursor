import type { Ingredient, Nutrient, Recipe } from "../types";

export const ZERO: Nutrient = { kcal: 0, protein: 0, carb: 0, fat: 0 };

export function hasNutrients(value?: Nutrient): value is Nutrient {
  return Boolean(value);
}

export function addNutrients(a: Nutrient, b: Nutrient): Nutrient {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carb: a.carb + b.carb,
    fat: a.fat + b.fat,
  };
}

export function scaleNutrients(n: Nutrient, factor: number): Nutrient {
  return {
    kcal: n.kcal * factor,
    protein: n.protein * factor,
    carb: n.carb * factor,
    fat: n.fat * factor,
  };
}

export function roundNutrients(n: Nutrient): Nutrient {
  return {
    kcal: Math.round(n.kcal),
    protein: Math.round(n.protein * 10) / 10,
    carb: Math.round(n.carb * 10) / 10,
    fat: Math.round(n.fat * 10) / 10,
  };
}

export function recipeTotals(ingredients: Ingredient[]): Nutrient | undefined {
  const withData = ingredients.filter((item) => item.nutrients);
  if (withData.length === 0) return undefined;
  return withData.reduce(
    (acc, item) => addNutrients(acc, item.nutrients ?? ZERO),
    ZERO,
  );
}

export function perPortion(recipe: Recipe): Nutrient | undefined {
  const total = recipeTotals(recipe.ingredients);
  if (!total) return undefined;
  const yieldAmount = recipe.yieldAmount || 1;
  return scaleNutrients(total, 1 / yieldAmount);
}

export function nutrientsForPortions(
  recipe: Recipe,
  portions: number,
): Nutrient | undefined {
  const unit = perPortion(recipe);
  if (!unit) return undefined;
  return roundNutrients(scaleNutrients(unit, portions));
}

export function formatNutrient(n?: Nutrient): string {
  if (!n) return "营养待补";
  return `${Math.round(n.kcal)} kcal · 蛋白 ${n.protein.toFixed(1)}g`;
}

export function formatNutrientLine(n?: Nutrient): string {
  if (!n) return "尚未填写营养";
  return `${Math.round(n.kcal)} kcal / 蛋白 ${n.protein.toFixed(1)}g / 碳 ${n.carb.toFixed(1)}g / 脂 ${n.fat.toFixed(1)}g`;
}

export function sumOptional(items: Array<Nutrient | undefined>): Nutrient | undefined {
  const present = items.filter(hasNutrients);
  if (present.length === 0) return undefined;
  return roundNutrients(present.reduce(addNutrients, ZERO));
}
