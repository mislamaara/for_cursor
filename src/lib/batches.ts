import type { Batch, Recipe } from "../types";

export class BatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchError";
  }
}

export function consumeBatch(batch: Batch, amount: number): Batch {
  if (amount <= 0) {
    throw new BatchError("食用份量必须大于 0");
  }
  if (amount > batch.remainingAmount + 1e-9) {
    throw new BatchError(
      `只剩 ${formatQty(batch.remainingAmount, batch.yieldUnit)}，不够扣 ${formatQty(amount, batch.yieldUnit)}`,
    );
  }
  return {
    ...batch,
    remainingAmount: roundQty(batch.remainingAmount - amount),
  };
}

export function restoreBatch(batch: Batch, amount: number): Batch {
  const next = roundQty(batch.remainingAmount + amount);
  return {
    ...batch,
    remainingAmount: Math.min(next, batch.yieldAmount),
  };
}

export function roundQty(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatQty(amount: number, unit: string): string {
  const shown = Number.isInteger(amount) ? String(amount) : String(roundQty(amount));
  return `${shown}${unit}`;
}

export function remainingLabel(batch: Batch): string {
  return `${formatQty(batch.remainingAmount, batch.yieldUnit)} / ${formatQty(batch.yieldAmount, batch.yieldUnit)}`;
}

export function eatenAmount(batch: Batch): number {
  return roundQty(batch.yieldAmount - batch.remainingAmount);
}

export function isOpen(batch: Batch): boolean {
  return batch.remainingAmount > 0;
}

export function matchRecipe(query: string, recipe: Recipe): boolean {
  const q = normalizeName(query);
  const n = normalizeName(recipe.name);
  if (!q || !n) return false;
  return n.includes(q) || q.includes(n);
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[的了呢吧\s]/g, "")
    .replace(/全麦|自制|家做/g, "");
}

export function pickOpenBatch(
  batches: Batch[],
  recipes: Recipe[],
  query: string,
): { batch: Batch; recipe: Recipe } | undefined {
  const matched = recipes.filter((recipe) => matchRecipe(query, recipe));
  if (matched.length === 0) return undefined;
  const recipeIds = new Set(matched.map((recipe) => recipe.id));
  const open = batches
    .filter((batch) => recipeIds.has(batch.recipeId) && isOpen(batch))
    .sort((a, b) => b.madeOn.localeCompare(a.madeOn));
  if (open.length === 0) return undefined;
  const batch = open[0];
  const recipe = recipes.find((item) => item.id === batch.recipeId);
  if (!recipe) return undefined;
  return { batch, recipe };
}

export function batchTitle(recipe: Recipe, batch: Batch): string {
  const [y, m, d] = batch.madeOn.split("-");
  void y;
  return `${recipe.name} · ${Number(m)}/${Number(d)}烤`;
}
