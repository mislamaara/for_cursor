import { describe, expect, it } from "vitest";
import { consumeBatch, pickOpenBatch, remainingLabel, restoreBatch } from "./batches";
import { nutrientsForPortions } from "./nutrition";
import { parseQuickLog } from "./parser";
import { buildAiSummary } from "./aiSummary";
import { buildDayExport } from "./exportDay";
import type { Batch, Recipe } from "../types";

const cake: Recipe = {
  id: "cake",
  name: "榴莲芝士蛋糕",
  category: "dessert",
  yieldAmount: 30,
  yieldUnit: "块",
  notes: "",
  createdAt: "",
  ingredients: [
    {
      id: "1",
      name: "馅",
      amount: 1,
      unit: "份",
      nutrients: { kcal: 3000, protein: 90, carb: 240, fat: 180 },
    },
  ],
};

const batch: Batch = {
  id: "b1",
  recipeId: "cake",
  madeOn: "2026-08-19",
  yieldAmount: 30,
  remainingAmount: 22,
  yieldUnit: "块",
  notes: "",
  createdAt: "",
};

const toast: Recipe = {
  id: "toast",
  name: "全麦吐司",
  category: "bread",
  yieldAmount: 10,
  yieldUnit: "片",
  notes: "",
  createdAt: "",
  ingredients: [],
};

describe("parseQuickLog", () => {
  it("parses 4/30 cheesecake and mixed items", () => {
    const items = parseQuickLog("2卤蛋、1片吐司、4/30榴莲芝士蛋糕");
    expect(items).toEqual([
      { amount: 2, unit: "个", name: "卤蛋" },
      { amount: 1, unit: "片", name: "吐司" },
      { amount: 4, ofTotal: 30, unit: "块", name: "榴莲芝士蛋糕" },
    ]);
  });
});

describe("batch linking", () => {
  it("matches 吐司 to 全麦吐司 and prefers the latest open batch", () => {
    const older: Batch = { ...batch, id: "old", recipeId: "toast", madeOn: "2026-08-10", remainingAmount: 2, yieldUnit: "片" };
    const newer: Batch = { ...batch, id: "new", recipeId: "toast", madeOn: "2026-08-19", remainingAmount: 7, yieldUnit: "片" };
    const hit = pickOpenBatch([older, newer], [toast], "吐司");
    expect(hit?.batch.id).toBe("new");
  });

  it("decrements remaining when eating 4/30", () => {
    const next = consumeBatch(batch, 4);
    expect(next.remainingAmount).toBe(18);
    expect(remainingLabel(next)).toBe("18块 / 30块");
  });

  it("rejects eating more than remaining", () => {
    expect(() => consumeBatch(batch, 40)).toThrow(/只剩/);
  });

  it("restores remaining when deleting a logged portion", () => {
    const next = consumeBatch(batch, 4);
    expect(next.remainingAmount).toBe(18);
    expect(restoreBatch(next, 4).remainingAmount).toBe(22);
  });

  it("splits recipe nutrition across 30 pieces", () => {
    const four = nutrientsForPortions(cake, 4);
    expect(four?.kcal).toBe(400);
    expect(four?.protein).toBe(12);
  });
});

describe("ai summary", () => {
  it("names the batch that a portion came from", () => {
    const text = buildAiSummary({
      dates: ["2026-08-21"],
      recipes: [cake],
      batches: [{ ...batch, remainingAmount: 18 }],
      foods: [
        {
          id: "f1",
          date: "2026-08-21",
          meal: "breakfast",
          name: "榴莲芝士蛋糕",
          amount: 4,
          unit: "块",
          batchId: "b1",
          recipeId: "cake",
          createdAt: "",
        },
      ],
      workouts: [],
    });
    expect(text).toContain("4块榴莲芝士蛋糕 ← 榴莲芝士蛋糕 8/19批次");
    expect(text).toContain("剩余 18块 / 30块");
  });
});

describe("day export", () => {
  it("exports a single day with batch links and totals", () => {
    const text = buildDayExport({
      date: "2026-08-21",
      recipes: [cake],
      batches: [{ ...batch, remainingAmount: 18 }],
      foods: [
        {
          id: "f1",
          date: "2026-08-21",
          meal: "breakfast",
          name: "榴莲芝士蛋糕",
          amount: 4,
          unit: "块",
          batchId: "b1",
          recipeId: "cake",
          notes: "4/30",
          createdAt: "",
        },
        {
          id: "f2",
          date: "2026-08-21",
          meal: "lunch",
          name: "米饭",
          amount: 1,
          unit: "份",
          createdAt: "",
        },
      ],
      workouts: [
        {
          id: "w1",
          date: "2026-08-21",
          name: "核心",
          durationMin: 30,
          createdAt: "",
        },
      ],
    });
    expect(text).toContain("# 膳食本 · 8月21日 周五");
    expect(text).toContain("4块榴莲芝士蛋糕 ← 榴莲芝士蛋糕 8/19批次（4/30）");
    expect(text).toContain("## 运动");
    expect(text).toContain("- 核心 · 30 分钟");
    expect(text).not.toContain("自制库存");
  });

  it("lists photo paths when exporting a day with images", () => {
    const text = buildDayExport({
      date: "2026-08-22",
      recipes: [],
      batches: [],
      foods: [],
      workouts: [],
      photos: [
        {
          id: "p1",
          kind: "day",
          refId: "2026-08-22",
          blob: new Blob([], { type: "image/jpeg" }),
          createdAt: "",
        },
        {
          id: "p2",
          kind: "day",
          refId: "2026-08-22",
          blob: new Blob([], { type: "image/png" }),
          createdAt: "",
        },
      ],
    });
    expect(text).toContain("## 照片");
    expect(text).toContain("photos/01.jpg");
    expect(text).toContain("photos/02.png");
  });
});
