import JSZip from "jszip";
import type { Batch, FoodEntry, Photo, Recipe, Workout } from "../types";
import { formatDate, formatShort } from "./dates";
import { formatNutrientLine, sumOptional } from "./nutrition";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
} as const;

export type DayExportInput = {
  date: string;
  recipes: Recipe[];
  batches: Batch[];
  foods: FoodEntry[];
  workouts: Workout[];
  photos?: Photo[];
};

export function buildDayExport(args: DayExportInput): string {
  const recipeById = new Map(args.recipes.map((recipe) => [recipe.id, recipe]));
  const batchById = new Map(args.batches.map((batch) => [batch.id, batch]));
  const foods = args.foods.filter((item) => item.date === args.date);
  const workouts = args.workouts.filter((item) => item.date === args.date);
  const photos = args.photos ?? [];
  const lines: string[] = [`# 膳食本 · ${formatDate(args.date)}`, ""];

  if (foods.length === 0 && workouts.length === 0 && photos.length === 0) {
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

  if (photos.length > 0) {
    lines.push("## 照片");
    lines.push(`共 ${photos.length} 张，打包在 photos/ 文件夹里。`);
    photos.forEach((photo, index) => {
      lines.push(`- ${photoPath(index, photo.blob)}`);
    });
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

export function dayExportFilename(date: string): string {
  return `膳食本-${date}.txt`;
}

export function dayExportZipFilename(date: string): string {
  return `膳食本-${date}.zip`;
}

export function photoPath(index: number, blob: Blob): string {
  const num = String(index + 1).padStart(2, "0");
  return `photos/${num}.${photoExtension(blob)}`;
}

export function photoExtension(blob: Blob): string {
  if (blob.type === "image/png") return "png";
  if (blob.type === "image/webp") return "webp";
  if (blob.type === "image/gif") return "gif";
  if (blob.type === "image/heic" || blob.type === "image/heif") return "heic";
  return "jpg";
}

export async function createDayExportZip(args: DayExportInput): Promise<Blob> {
  const text = buildDayExport(args);
  const photos = args.photos ?? [];
  const zip = new JSZip();
  zip.file("日记.txt", text);
  if (photos.length > 0) {
    const folder = zip.folder("photos");
    if (folder) {
      photos.forEach((photo, index) => {
        folder.file(photoPath(index, photo.blob).replace("photos/", ""), photo.blob);
      });
    }
  }
  return zip.generateAsync({ type: "blob" });
}

export async function copyExportText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadExportText(filename: string, text: string): void {
  downloadBlob(filename, new Blob([text], { type: "text/plain;charset=utf-8" }));
}

export async function downloadDayExport(args: DayExportInput): Promise<void> {
  const photos = args.photos ?? [];
  if (photos.length === 0) {
    downloadExportText(dayExportFilename(args.date), buildDayExport(args));
    return;
  }
  const zip = await createDayExportZip(args);
  downloadBlob(dayExportZipFilename(args.date), zip);
}

export async function shareDayExport(args: DayExportInput): Promise<"shared" | "unsupported" | "cancelled"> {
  if (!navigator.share) return "unsupported";
  const text = buildDayExport(args);
  const photos = args.photos ?? [];

  try {
    if (photos.length === 0) {
      await navigator.share({ title: `膳食本 ${args.date}`, text });
      return "shared";
    }

    const zipBlob = await createDayExportZip(args);
    const zipFile = new File([zipBlob], dayExportZipFilename(args.date), { type: "application/zip" });
    if (navigator.canShare?.({ files: [zipFile] })) {
      await navigator.share({ files: [zipFile], title: `膳食本 ${args.date}` });
      return "shared";
    }

    const files: File[] = [
      new File([text], dayExportFilename(args.date), { type: "text/plain;charset=utf-8" }),
      ...photos.map((photo, index) => {
        const ext = photoExtension(photo.blob);
        return new File([photo.blob], `photo-${String(index + 1).padStart(2, "0")}.${ext}`, {
          type: photo.blob.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
        });
      }),
    ];
    if (navigator.canShare?.({ files })) {
      await navigator.share({ files, title: `膳食本 ${args.date}` });
      return "shared";
    }

    return "unsupported";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    return "unsupported";
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
