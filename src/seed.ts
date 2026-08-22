import { db } from "./db";
import { nutrientsForPortions } from "./lib/nutrition";
import type { Batch, FoodEntry, Recipe, Workout } from "./types";

const SEED_KEY = "seeded";
const SEED_VERSION = 1;

let inflight: Promise<void> | null = null;

export function ensureSeed(): Promise<void> {
  if (!inflight) {
    inflight = seedOnce().catch((err) => {
      inflight = null;
      throw err;
    });
  }
  return inflight;
}

async function seedOnce(): Promise<void> {
  seedFoodSeq = 0;
  const flag = await db.meta.get(SEED_KEY);
  if (flag?.value === SEED_VERSION) return;
  if (flag) return;

  const toast: Recipe = {
    id: "recipe-toast",
    name: "全麦吐司",
    category: "bread",
    yieldAmount: 10,
    yieldUnit: "片",
    notes: "Freeform 里截过配方。已知全麦粉 175g，面团加了种子。其余原料可按截图补全。",
    createdAt: "2026-08-19T08:00:00.000Z",
    ingredients: [
      { id: "i1", name: "全麦粉", amount: 175, unit: "g", nutrients: { kcal: 595, protein: 23.1, carb: 112, fat: 4.4 } },
      { id: "i2", name: "高筋粉", amount: 175, unit: "g", nutrients: { kcal: 637, protein: 21.7, carb: 126, fat: 1.8 } },
      { id: "i3", name: "水", amount: 230, unit: "g" },
      { id: "i4", name: "酵母", amount: 3, unit: "g" },
      { id: "i5", name: "盐", amount: 5, unit: "g" },
      { id: "i6", name: "混合种子", amount: 30, unit: "g", nutrients: { kcal: 170, protein: 6, carb: 5, fat: 14 } },
    ],
  };

  const cake: Recipe = {
    id: "recipe-durian-cheesecake",
    name: "榴莲芝士蛋糕",
    category: "dessert",
    yieldAmount: 30,
    yieldUnit: "块",
    notes: "按 30 块切。日记里写成 8/30、4/30，就是在吃这一批。配方原料待你补。",
    createdAt: "2026-08-19T09:00:00.000Z",
    ingredients: [
      { id: "c1", name: "奶油奶酪", amount: 250, unit: "g", nutrients: { kcal: 838, protein: 14.3, carb: 10.3, fat: 82.5 } },
      { id: "c2", name: "榴莲果肉", amount: 200, unit: "g", nutrients: { kcal: 294, protein: 2.8, carb: 54, fat: 10 } },
      { id: "c3", name: "无糖希腊酸奶", amount: 150, unit: "g", nutrients: { kcal: 89, protein: 15, carb: 6, fat: 0.6 } },
      { id: "c4", name: "鸡蛋", amount: 100, unit: "g", nutrients: { kcal: 144, protein: 12.6, carb: 1.1, fat: 9.9 } },
    ],
  };

  const spread: Recipe = {
    id: "recipe-pistachio-spread",
    name: "开心果酸奶抹酱",
    category: "sauce",
    yieldAmount: 410,
    yieldUnit: "g",
    notes: "8/19 日记里的比例：奶油奶酪 200g + 无糖希腊酸奶 200g + 开心果酱 10g。",
    createdAt: "2026-08-19T10:00:00.000Z",
    ingredients: [
      { id: "s1", name: "奶油奶酪", amount: 200, unit: "g", nutrients: { kcal: 670, protein: 11.4, carb: 8.2, fat: 66 } },
      { id: "s2", name: "无糖希腊酸奶", amount: 200, unit: "g", nutrients: { kcal: 118, protein: 20, carb: 8, fat: 0.8 } },
      { id: "s3", name: "开心果酱", amount: 10, unit: "g", nutrients: { kcal: 63, protein: 2, carb: 3, fat: 5.2 } },
    ],
  };

  const toastBatch: Batch = {
    id: "batch-toast-0819",
    recipeId: toast.id,
    madeOn: "2026-08-19",
    yieldAmount: 10,
    remainingAmount: 7,
    yieldUnit: "片",
    notes: "自制吐司，加了种子。8/19 早餐按 88g 记了 1 片。",
    createdAt: "2026-08-19T08:30:00.000Z",
  };

  const cakeBatch: Batch = {
    id: "batch-cake-0819",
    recipeId: cake.id,
    madeOn: "2026-08-19",
    yieldAmount: 30,
    remainingAmount: 18,
    yieldUnit: "块",
    notes: "切成 30 块。8/20 吃了 8 块，8/21 吃了 4 块。",
    createdAt: "2026-08-19T12:00:00.000Z",
  };

  const spreadBatch: Batch = {
    id: "batch-spread-0819",
    recipeId: spread.id,
    madeOn: "2026-08-19",
    yieldAmount: 410,
    remainingAmount: 370,
    yieldUnit: "g",
    notes: "配吐司。8/19 早餐按抹茶/抹酱大约用了 40g。",
    createdAt: "2026-08-19T10:30:00.000Z",
  };

  const foods: FoodEntry[] = [
    f("2026-08-18", "breakfast", "叶菜饭", 1, "份"),
    f("2026-08-18", "breakfast", "卤蛋", 2, "个", { kcal: 160, protein: 13, carb: 1.2, fat: 11 }),
    f("2026-08-18", "breakfast", "香蕉", 1, "根", { kcal: 89, protein: 1.1, carb: 23, fat: 0.3 }),
    f("2026-08-18", "breakfast", "桃", 0.5, "个", { kcal: 30, protein: 0.7, carb: 7.5, fat: 0.2 }),
    f("2026-08-18", "breakfast", "黑咖啡", 1, "杯"),
    f("2026-08-18", "lunch", "食堂：米饭、青椒炒肉、山药、包菜", 1, "份"),
    f("2026-08-18", "snack", "88%黑巧克力", 1, "小块"),
    f("2026-08-18", "dinner", "蔬菜虾", 1, "份"),
    f("2026-08-18", "snack", "牛奶", 500, "g", { kcal: 270, protein: 16.5, carb: 24, fat: 13 }),

    f("2026-08-19", "breakfast", "卤蛋", 2, "个", { kcal: 160, protein: 13, carb: 1.2, fat: 11 }),
    f("2026-08-19", "breakfast", "全麦吐司", 1, "片", nutrientsForPortions(toast, 1), toastBatch.id, toast.id, "日记记的 88g"),
    f("2026-08-19", "breakfast", "开心果酸奶抹酱", 40, "g", nutrientsForPortions(spread, 40), spreadBatch.id, spread.id, "日记写 40g 抹茶/抹酱"),
    f("2026-08-19", "lunch", "食堂：口水鸡、西兰花、青菜、半碗饭", 1, "份"),
    f("2026-08-19", "dinner", "肥牛卷", 150, "g"),
    f("2026-08-19", "dinner", "虾饼", 1, "份"),
    f("2026-08-19", "dinner", "豆腐", 1, "份"),
    f("2026-08-19", "dinner", "杂豆饭", 150, "g"),

    f("2026-08-20", "breakfast", "卤蛋", 2, "个", { kcal: 160, protein: 13, carb: 1.2, fat: 11 }),
    f("2026-08-20", "breakfast", "全麦吐司", 1, "片", nutrientsForPortions(toast, 1), toastBatch.id, toast.id),
    f("2026-08-20", "breakfast", "榴莲芝士蛋糕", 8, "块", nutrientsForPortions(cake, 8), cakeBatch.id, cake.id, "8/30"),
    f("2026-08-20", "lunch", "食堂：米饭、黄瓜、肉、蛋", 1, "份"),
    f("2026-08-20", "snack", "盒马燕麦脆", 1, "份"),
    f("2026-08-20", "dinner", "乌鸡米线", 1, "碗"),

    f("2026-08-21", "breakfast", "牛奶", 500, "g", { kcal: 270, protein: 16.5, carb: 24, fat: 13 }),
    f("2026-08-21", "breakfast", "卤蛋", 2, "个", { kcal: 160, protein: 13, carb: 1.2, fat: 11 }),
    f("2026-08-21", "breakfast", "全麦吐司", 1, "片", nutrientsForPortions(toast, 1), toastBatch.id, toast.id),
    f("2026-08-21", "breakfast", "榴莲芝士蛋糕", 4, "块", nutrientsForPortions(cake, 4), cakeBatch.id, cake.id, "4/30"),
    f("2026-08-21", "lunch", "米饭、清蒸鱼、粉丝、豆芽", 1, "份"),
    f("2026-08-21", "snack", "葡萄", 1, "份"),
    f("2026-08-21", "snack", "蛋清", 2, "个", { kcal: 34, protein: 7.2, carb: 0.5, fat: 0.1 }),
    f("2026-08-21", "snack", "香蕉", 1, "根", { kcal: 89, protein: 1.1, carb: 23, fat: 0.3 }),
    f("2026-08-21", "dinner", "酸菜牛肉粉丝汤", 1, "碗"),

    f("2026-08-22", "lunch", "油面筋塞肉", 2, "个"),
    f("2026-08-22", "lunch", "包菜", 1, "份"),
    f("2026-08-22", "lunch", "炒冷面", 0.5, "碗"),
    f("2026-08-22", "lunch", "豆腐", 100, "g"),
    f("2026-08-22", "snack", "葡萄", 1, "份"),
  ];

  const workouts: Workout[] = [
    {
      id: "seed-workout-0818",
      date: "2026-08-18",
      name: "下肢",
      notes: "力量训练",
      createdAt: "2026-08-18T20:00:00.000Z",
    },
    {
      id: "seed-workout-0820",
      date: "2026-08-20",
      name: "核心 + 室内跑",
      durationMin: 50.5,
      distanceKm: 7.03,
      kcal: 362,
      notes: "Apple Watch：Indoor Run 50:30，7.03 km，362 kcal",
      createdAt: "2026-08-20T20:00:00.000Z",
    },
  ];

  await db.transaction("rw", db.recipes, db.batches, db.foods, db.workouts, db.meta, async () => {
    const again = await db.meta.get(SEED_KEY);
    if (again) return;
    await db.recipes.bulkPut([toast, cake, spread]);
    await db.batches.bulkPut([toastBatch, cakeBatch, spreadBatch]);
    await db.foods.bulkPut(foods);
    await db.workouts.bulkPut(workouts);
    await db.meta.put({ key: SEED_KEY, value: SEED_VERSION });
  });
}

let seedFoodSeq = 0;

function f(
  date: string,
  meal: FoodEntry["meal"],
  name: string,
  amount: number,
  unit: string,
  nutrients?: FoodEntry["nutrients"],
  batchId?: string,
  recipeId?: string,
  notes?: string,
): FoodEntry {
  seedFoodSeq += 1;
  return {
    id: `seed-food-${String(seedFoodSeq).padStart(3, "0")}`,
    date,
    meal,
    name,
    amount,
    unit,
    nutrients,
    batchId,
    recipeId,
    notes,
    createdAt: `${date}T12:00:00.000Z`,
  };
}
