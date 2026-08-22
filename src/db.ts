import Dexie, { type Table } from "dexie";
import type {
  Batch,
  FoodEntry,
  MetaRow,
  Photo,
  Recipe,
  Workout,
} from "./types";

export class KitchenDB extends Dexie {
  recipes!: Table<Recipe, string>;
  batches!: Table<Batch, string>;
  foods!: Table<FoodEntry, string>;
  workouts!: Table<Workout, string>;
  photos!: Table<Photo, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("kitchen-log");
    this.version(1).stores({
      recipes: "id, name, category, createdAt",
      batches: "id, recipeId, madeOn, createdAt",
      foods: "id, date, meal, batchId, recipeId, createdAt",
      workouts: "id, date, createdAt",
      photos: "id, kind, refId, createdAt",
      meta: "key",
    });
  }
}

export const db = new KitchenDB();
