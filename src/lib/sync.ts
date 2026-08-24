import { db } from "../db";
import { photoExtension } from "./exportDay";
import { getSupabase, isUuid } from "./supabase";
import type { Batch, FoodEntry, Photo, Recipe, Workout } from "../types";

const SEED_KEY = "seeded";

export type SyncResult = {
  recipes: number;
  batches: number;
  foods: number;
  workouts: number;
  photos: number;
};

export async function pushToCloud(userId: string): Promise<SyncResult> {
  await normalizeLocalIds();
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const recipes = await db.recipes.toArray();
  const batches = await db.batches.toArray();
  const foods = await db.foods.toArray();
  const workouts = await db.workouts.toArray();
  const photos = await db.photos.toArray();

  if (recipes.length) {
    const { error } = await supabase.from("recipes").upsert(
      recipes.map((item) => ({
        id: item.id,
        user_id: userId,
        name: item.name,
        category: item.category,
        yield_amount: item.yieldAmount,
        yield_unit: item.yieldUnit,
        ingredients: item.ingredients,
        notes: item.notes,
        created_at: item.createdAt,
        updated_at: now,
      })),
    );
    if (error) throw error;
  }

  if (batches.length) {
    const { error } = await supabase.from("batches").upsert(
      batches.map((item) => ({
        id: item.id,
        user_id: userId,
        recipe_id: item.recipeId,
        made_on: item.madeOn,
        yield_amount: item.yieldAmount,
        remaining_amount: item.remainingAmount,
        yield_unit: item.yieldUnit,
        notes: item.notes,
        created_at: item.createdAt,
        updated_at: now,
      })),
    );
    if (error) throw error;
  }

  if (foods.length) {
    const { error } = await supabase.from("foods").upsert(
      foods.map((item) => ({
        id: item.id,
        user_id: userId,
        date: item.date,
        meal: item.meal,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        batch_id: item.batchId ?? null,
        recipe_id: item.recipeId ?? null,
        nutrients: item.nutrients ?? null,
        notes: item.notes ?? null,
        created_at: item.createdAt,
        updated_at: now,
      })),
    );
    if (error) throw error;
  }

  if (workouts.length) {
    const { error } = await supabase.from("workouts").upsert(
      workouts.map((item) => ({
        id: item.id,
        user_id: userId,
        date: item.date,
        name: item.name,
        duration_min: item.durationMin ?? null,
        distance_km: item.distanceKm ?? null,
        kcal: item.kcal ?? null,
        notes: item.notes ?? null,
        created_at: item.createdAt,
        updated_at: now,
      })),
    );
    if (error) throw error;
  }

  let photoCount = 0;
  for (const photo of photos) {
    const ext = photoExtension(photo.blob);
    const storagePath = `${userId}/${photo.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("kitchen-photos")
      .upload(storagePath, photo.blob, { upsert: true, contentType: photo.blob.type || `image/${ext}` });
    if (uploadError) throw uploadError;

    const { error } = await supabase.from("photos").upsert({
      id: photo.id,
      user_id: userId,
      kind: photo.kind,
      ref_id: photo.refId,
      storage_path: storagePath,
      mime_type: photo.blob.type || `image/${ext}`,
      created_at: photo.createdAt,
    });
    if (error) throw error;
    photoCount += 1;
  }

  await db.meta.put({ key: "last_pushed_at", value: now });

  return {
    recipes: recipes.length,
    batches: batches.length,
    foods: foods.length,
    workouts: workouts.length,
    photos: photoCount,
  };
}

export async function pullFromCloud(userId: string): Promise<SyncResult> {
  const supabase = getSupabase();

  const [recipesRes, batchesRes, foodsRes, workoutsRes, photosRes] = await Promise.all([
    supabase.from("recipes").select("*").eq("user_id", userId),
    supabase.from("batches").select("*").eq("user_id", userId),
    supabase.from("foods").select("*").eq("user_id", userId),
    supabase.from("workouts").select("*").eq("user_id", userId),
    supabase.from("photos").select("*").eq("user_id", userId),
  ]);

  if (recipesRes.error) throw recipesRes.error;
  if (batchesRes.error) throw batchesRes.error;
  if (foodsRes.error) throw foodsRes.error;
  if (workoutsRes.error) throw workoutsRes.error;
  if (photosRes.error) throw photosRes.error;

  const recipes: Recipe[] = recipesRes.data.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    yieldAmount: Number(row.yield_amount),
    yieldUnit: row.yield_unit,
    ingredients: row.ingredients ?? [],
    notes: row.notes ?? "",
    createdAt: row.created_at,
  }));

  const batches: Batch[] = batchesRes.data.map((row) => ({
    id: row.id,
    recipeId: row.recipe_id,
    madeOn: row.made_on,
    yieldAmount: Number(row.yield_amount),
    remainingAmount: Number(row.remaining_amount),
    yieldUnit: row.yield_unit,
    notes: row.notes ?? "",
    createdAt: row.created_at,
  }));

  const foods: FoodEntry[] = foodsRes.data.map((row) => ({
    id: row.id,
    date: row.date,
    meal: row.meal,
    name: row.name,
    amount: Number(row.amount),
    unit: row.unit,
    batchId: row.batch_id ?? undefined,
    recipeId: row.recipe_id ?? undefined,
    nutrients: row.nutrients ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }));

  const workouts: Workout[] = workoutsRes.data.map((row) => ({
    id: row.id,
    date: row.date,
    name: row.name,
    durationMin: row.duration_min ?? undefined,
    distanceKm: row.distance_km ?? undefined,
    kcal: row.kcal ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }));

  const photos: Photo[] = [];
  for (const row of photosRes.data) {
    const { data, error } = await supabase.storage.from("kitchen-photos").download(row.storage_path);
    if (error) throw error;
    photos.push({
      id: row.id,
      kind: row.kind,
      refId: row.ref_id,
      blob: data,
      createdAt: row.created_at,
    });
  }

  await db.transaction("rw", db.recipes, db.batches, db.foods, db.workouts, db.photos, async () => {
    await db.recipes.clear();
    await db.batches.clear();
    await db.foods.clear();
    await db.workouts.clear();
    await db.photos.clear();
    if (recipes.length) await db.recipes.bulkPut(recipes);
    if (batches.length) await db.batches.bulkPut(batches);
    if (foods.length) await db.foods.bulkPut(foods);
    if (workouts.length) await db.workouts.bulkPut(workouts);
    if (photos.length) await db.photos.bulkPut(photos);
  });
  await db.meta.put({ key: SEED_KEY, value: 1 });
  await db.meta.put({ key: "last_pulled_at", value: new Date().toISOString() });

  return {
    recipes: recipes.length,
    batches: batches.length,
    foods: foods.length,
    workouts: workouts.length,
    photos: photos.length,
  };
}

async function normalizeLocalIds(): Promise<void> {
  const idMap = new Map<string, string>();
  const mapId = (id: string): string => {
    if (isUuid(id)) return id;
    if (!idMap.has(id)) idMap.set(id, crypto.randomUUID());
    return idMap.get(id)!;
  };

  await db.transaction("rw", db.recipes, db.batches, db.foods, db.workouts, db.photos, async () => {
    const recipes = await db.recipes.toArray();
    for (const item of recipes) {
      const nextId = mapId(item.id);
      if (nextId !== item.id) {
        await db.recipes.delete(item.id);
        await db.recipes.put({ ...item, id: nextId });
      }
    }

    const batches = await db.batches.toArray();
    for (const item of batches) {
      const nextId = mapId(item.id);
      const nextRecipeId = mapId(item.recipeId);
      const next = { ...item, id: nextId, recipeId: nextRecipeId };
      if (nextId !== item.id) await db.batches.delete(item.id);
      await db.batches.put(next);
    }

    const foods = await db.foods.toArray();
    for (const item of foods) {
      const nextId = mapId(item.id);
      const next: FoodEntry = {
        ...item,
        id: nextId,
        batchId: item.batchId ? mapId(item.batchId) : undefined,
        recipeId: item.recipeId ? mapId(item.recipeId) : undefined,
      };
      if (nextId !== item.id) await db.foods.delete(item.id);
      await db.foods.put(next);
    }

    const workouts = await db.workouts.toArray();
    for (const item of workouts) {
      const nextId = mapId(item.id);
      if (nextId !== item.id) {
        await db.workouts.delete(item.id);
        await db.workouts.put({ ...item, id: nextId });
      }
    }

    const photos = await db.photos.toArray();
    for (const item of photos) {
      const nextId = mapId(item.id);
      if (nextId !== item.id) {
        await db.photos.delete(item.id);
        await db.photos.put({ ...item, id: nextId });
      }
    }
  });
}
