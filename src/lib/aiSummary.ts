import type { Batch, FoodEntry, Recipe, Workout } from "../types";
import { formatDate, formatShort } from "./dates";
import { formatNutrientLine, sumOptional } from "./nutrition";
import { remainingLabel } from "./batches";

export function buildAiSummary(args: {
  dates: string[];
  recipes: Recipe[];
  batches: Batch[];
  foods: FoodEntry[];
  workouts: Workout[];
}): string {
  const recipeById = new Map(args.recipes.map((recipe) => [recipe.id, recipe]));
  const batchById = new Map(args.batches.map((batch) => [batch.id, batch]));
  const lines: string[] = ["# 膳食本摘要", ""];

  lines.push("## 自制库存");
  const open = args.batches.filter((batch) => batch.remainingAmount > 0);
  if (open.length === 0) {
    lines.push("- 目前没有未吃完的自制批次");
  } else {
    for (const batch of open) {
      const recipe = recipeById.get(batch.recipeId);
      lines.push(
        `- ${recipe?.name ?? "未知食谱"}（${formatShort(batch.madeOn)}烤）剩余 ${remainingLabel(batch)}`,
      );
    }
  }
  lines.push("");

  for (const date of args.dates) {
    const foods = args.foods.filter((item) => item.date === date);
    const workouts = args.workouts.filter((item) => item.date === date);
    if (foods.length === 0 && workouts.length === 0) continue;
    lines.push(`## ${formatDate(date)}`);
    const meals = ["breakfast", "lunch", "dinner", "snack"] as const;
    const labels = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "加餐" };
    for (const meal of meals) {
      const items = foods.filter((food) => food.meal === meal);
      if (items.length === 0) continue;
      lines.push(`- ${labels[meal]}：${items.map((item) => describeFood(item, batchById, recipeById)).join("；")}`);
    }
    for (const workout of workouts) {
      const bits = [workout.name];
      if (workout.durationMin) bits.push(`${workout.durationMin} 分钟`);
      if (workout.distanceKm) bits.push(`${workout.distanceKm} km`);
      if (workout.kcal) bits.push(`${workout.kcal} kcal`);
      lines.push(`- 运动：${bits.join(" · ")}`);
    }
    const dayNutrients = sumOptional(foods.map((food) => food.nutrients));
    if (dayNutrients) lines.push(`- 合计：${formatNutrientLine(dayNutrients)}`);
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

function describeFood(
  food: FoodEntry,
  batchById: Map<string, Batch>,
  recipeById: Map<string, Recipe>,
): string {
  const qty = `${food.amount}${food.unit}${food.name}`;
  if (!food.batchId) return qty;
  const batch = batchById.get(food.batchId);
  if (!batch) return `${qty}（自制批次已删除）`;
  const recipe = recipeById.get(batch.recipeId);
  return `${qty} ← ${recipe?.name ?? food.name} ${formatShort(batch.madeOn)}批次`;
}
