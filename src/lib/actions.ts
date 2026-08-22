import { db } from "../db";
import {
  batchTitle,
  consumeBatch,
  pickOpenBatch,
  restoreBatch,
} from "./batches";
import { newId, todayISO } from "./dates";
import { nutrientsForPortions } from "./nutrition";
import { parseQuickLog } from "./parser";
import type { FoodEntry, MealType, Nutrient } from "../types";

export async function logFood(input: {
  date: string;
  meal: MealType;
  name: string;
  amount: number;
  unit: string;
  batchId?: string;
  notes?: string;
  nutrients?: Nutrient;
}): Promise<FoodEntry> {
  return db.transaction("rw", db.foods, db.batches, db.recipes, async () => {
    let recipeId: string | undefined;
    let nutrients = input.nutrients;
    let name = input.name;
    let unit = input.unit;

    if (input.batchId) {
      const batch = await db.batches.get(input.batchId);
      if (!batch) throw new Error("找不到这批自制食物");
      const recipe = await db.recipes.get(batch.recipeId);
      if (!recipe) throw new Error("找不到对应食谱");
      const next = consumeBatch(batch, input.amount);
      await db.batches.put(next);
      recipeId = recipe.id;
      name = recipe.name;
      unit = batch.yieldUnit;
      nutrients = nutrients ?? nutrientsForPortions(recipe, input.amount);
    }

    const entry: FoodEntry = {
      id: newId(),
      date: input.date,
      meal: input.meal,
      name,
      amount: input.amount,
      unit,
      batchId: input.batchId,
      recipeId,
      nutrients,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };
    await db.foods.add(entry);
    return entry;
  });
}

export async function deleteFood(id: string): Promise<void> {
  await db.transaction("rw", db.foods, db.batches, async () => {
    const food = await db.foods.get(id);
    if (!food) return;
    if (food.batchId) {
      const batch = await db.batches.get(food.batchId);
      if (batch) await db.batches.put(restoreBatch(batch, food.amount));
    }
    await db.foods.delete(id);
  });
}

export async function deleteWorkout(id: string): Promise<void> {
  await db.workouts.delete(id);
}

export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id);
}

export async function deleteBatch(id: string): Promise<void> {
  await db.transaction("rw", db.foods, db.batches, async () => {
    const foods = await db.foods.where("batchId").equals(id).toArray();
    for (const food of foods) {
      await db.foods.delete(food.id);
    }
    await db.batches.delete(id);
  });
}

export async function applyQuickLog(input: {
  text: string;
  date?: string;
  meal: MealType;
}): Promise<{ linked: number; plain: number; items: FoodEntry[] }> {
  const date = input.date ?? todayISO();
  const parsed = parseQuickLog(input.text);
  if (parsed.length === 0) {
    throw new Error("没有识别出食物，试着写成「2卤蛋、1片吐司、4/30榴莲芝士蛋糕」");
  }

  const recipes = await db.recipes.toArray();
  const batches = await db.batches.toArray();
  const items: FoodEntry[] = [];
  let linked = 0;
  let plain = 0;

  for (const item of parsed) {
    const hit = pickOpenBatch(batches, recipes, item.name);
    if (hit) {
      const entry = await logFood({
        date,
        meal: input.meal,
        name: hit.recipe.name,
        amount: item.amount,
        unit: hit.batch.yieldUnit,
        batchId: hit.batch.id,
        notes: item.ofTotal
          ? `记成 ${item.amount}/${item.ofTotal}`
          : undefined,
      });
      items.push(entry);
      linked += 1;
      const idx = batches.findIndex((batch) => batch.id === hit.batch.id);
      batches[idx] = { ...hit.batch, remainingAmount: hit.batch.remainingAmount - item.amount };
    } else {
      const entry = await logFood({
        date,
        meal: input.meal,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
      });
      items.push(entry);
      plain += 1;
    }
  }

  return { linked, plain, items };
}

export { batchTitle };
