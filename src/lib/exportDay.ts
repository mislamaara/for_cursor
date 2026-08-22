import type { Batch, FoodEntry, Recipe, Workout } from "../types";
import { formatDate, formatShort } from "./dates";
import { formatNutrientLine, sumOptional } from "./nutrition";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
} as const;

export function buildDayExport(args: {
  date: string;
  recipes: Recipe[];
  batches: Batch[];
  foods: FoodEntry[];
  workouts: Workout[];
}): string {
  const recipeById = new Map(args.recipes.map((recipe) => [recipe.id, recipe]));
  const batchById = new Map(args.batches.map((batch) => [batch.id, batch]));
  const foods = args.foods.filter((item) => item.date === args.date);
  const workouts = args.workouts.filter((item) => item.date === args.date);
  const lines: string[] = [`# 膳食本 · ${formatDate(args.date)}`, ""];

  if (foods.length === 0 && workouts.length === 0) {
    lines.push("（这一天还没有记录）", "");
    return lines.join("\n");
  }

  for (const meal of MEAL_ORDER) {
    const items = foods.filter((food) => food.meal === meal);
    if (items.length === 0) continue;
    lines.push(`## ${MEAL_LABELS[meal]}`);
    for (const item of items) {
      const detail = describeFood(item, batchById, recipeById);
      const note = item.notes ? `（${item.notes}）` : "";
      lines.push(`- ${detail}${note}`);
    }
    lines.push("");
  }

  if (workouts.length > 0) {
    lines.push("## 运动");
    for (const workout of workouts) {
      lines.push(`- ${formatWorkout(workout)}`);
    }
    lines.push("");
  }

  const dayNutrients = sumOptional(foods.map((food) => food.nutrients));
  if (dayNutrients) {
    lines.push("## 合计");
    lines.push(`- ${formatNutrientLine(dayNutrients)}`);
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

export function dayExportFilename(date: string): string {
  return `膳食本-${date}.txt`;
}

export async function copyExportText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function downloadExportText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareExportText(title: string, text: string): Promise<boolean> {
  if (!navigator.share) return false;
  try {
    await navigator.share({ title, text });
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return true;
    return false;
  }
}

export function describeFood(
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

function formatWorkout(workout: Workout): string {
  const bits = [workout.name];
  if (workout.durationMin) bits.push(`${workout.durationMin} 分钟`);
  if (workout.distanceKm) bits.push(`${workout.distanceKm} km`);
  if (workout.kcal) bits.push(`${workout.kcal} kcal`);
  if (workout.notes) bits.push(workout.notes);
  return bits.join(" · ");
}
