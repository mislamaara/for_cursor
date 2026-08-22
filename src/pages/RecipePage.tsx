import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "../components/PageHeader";
import { db } from "../db";
import { newId } from "../lib/dates";
import { formatNutrientLine, recipeTotals } from "../lib/nutrition";
import type { Ingredient, Recipe, RecipeCategory } from "../types";

const emptyIngredient = (): Ingredient => ({
  id: newId(),
  name: "",
  amount: 0,
  unit: "g",
});

export function RecipePage() {
  const { id } = useParams();
  const isNew = id === "new";
  const loaded = useLiveQuery(async (): Promise<{ recipe: Recipe | null } | "missing"> => {
    if (isNew || !id) return { recipe: null };
    const recipe = await db.recipes.get(id);
    return recipe ? { recipe } : "missing";
  }, [id, isNew]);
  const recipeId = loaded && loaded !== "missing" ? loaded.recipe?.id ?? "" : "";
  const batches = useLiveQuery(() => (recipeId ? db.batches.where("recipeId").equals(recipeId).toArray() : []), [recipeId]) ?? [];

  if (loaded === undefined) return <div className="muted">读取食谱…</div>;
  if (loaded === "missing") return <div className="card">找不到这份食谱。</div>;

  return <RecipeForm initial={loaded.recipe} batches={batches} />;
}

function RecipeForm({ initial, batches }: { initial: Recipe | null; batches: { id: string; madeOn: string; remainingAmount: number; yieldUnit: string }[] }) {
  const navigate = useNavigate();
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<RecipeCategory>(initial?.category ?? "bread");
  const [yieldAmount, setYieldAmount] = useState(initial?.yieldAmount ?? 10);
  const [yieldUnit, setYieldUnit] = useState(initial?.yieldUnit ?? "片");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [ingredients, setIngredients] = useState<Ingredient[]>(initial?.ingredients ?? [emptyIngredient()]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initial) return;
    setName(initial.name);
    setCategory(initial.category);
    setYieldAmount(initial.yieldAmount);
    setYieldUnit(initial.yieldUnit);
    setNotes(initial.notes);
    setIngredients(initial.ingredients);
  }, [initial]);

  const total = useMemo(() => recipeTotals(ingredients), [ingredients]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("先写食谱名，比如全麦吐司");
      return;
    }
    const recipe: Recipe = {
      id: initial?.id ?? newId(),
      name: name.trim(),
      category,
      yieldAmount: Number(yieldAmount) || 1,
      yieldUnit: yieldUnit.trim() || "份",
      notes,
      ingredients: ingredients.filter((item) => item.name.trim()),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    await db.recipes.put(recipe);
    navigate(`/kitchen/recipes/${recipe.id}`);
  }

  return (
    <div>
      <PageHeader title={initial ? initial.name : "新食谱"} subtitle="配方可以反复用。真正吃的是下面的批次。" back="/kitchen" />
      <form className="card form" onSubmit={onSubmit}>
        <label>
          名称
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="榴莲芝士蛋糕" />
        </label>
        <label>
          分类
          <select value={category} onChange={(event) => setCategory(event.target.value as RecipeCategory)}>
            <option value="bread">面包</option>
            <option value="dessert">甜点</option>
            <option value="sauce">酱料</option>
            <option value="other">其他</option>
          </select>
        </label>
        <div className="ingredient">
          <label>
            一次出多少
            <input type="number" step="0.1" value={yieldAmount} onChange={(event) => setYieldAmount(Number(event.target.value))} />
          </label>
          <label>
            单位
            <input value={yieldUnit} onChange={(event) => setYieldUnit(event.target.value)} placeholder="块 / 片 / g" />
          </label>
          <div />
        </div>
        <div className="muted tiny">原料（营养按这一次总量填，会自动摊到每一{yieldUnit || "份"}）</div>
        {ingredients.map((item, index) => (
          <div className="ingredient" key={item.id}>
            <input
              placeholder="全麦粉"
              value={item.name}
              onChange={(event) => updateIng(index, { name: event.target.value })}
            />
            <input
              type="number"
              step="0.1"
              placeholder="175"
              value={item.amount || ""}
              onChange={(event) => updateIng(index, { amount: Number(event.target.value) })}
            />
            <input
              placeholder="g"
              value={item.unit}
              onChange={(event) => updateIng(index, { unit: event.target.value })}
            />
            <input
              type="number"
              step="0.1"
              placeholder="kcal"
              value={item.nutrients?.kcal ?? ""}
              onChange={(event) =>
                updateIng(index, {
                  nutrients: {
                    kcal: Number(event.target.value) || 0,
                    protein: item.nutrients?.protein ?? 0,
                    carb: item.nutrients?.carb ?? 0,
                    fat: item.nutrients?.fat ?? 0,
                  },
                })
              }
            />
            <input
              type="number"
              step="0.1"
              placeholder="蛋白g"
              value={item.nutrients?.protein ?? ""}
              onChange={(event) =>
                updateIng(index, {
                  nutrients: {
                    kcal: item.nutrients?.kcal ?? 0,
                    protein: Number(event.target.value) || 0,
                    carb: item.nutrients?.carb ?? 0,
                    fat: item.nutrients?.fat ?? 0,
                  },
                })
              }
            />
            <button type="button" className="btn ghost" onClick={() => setIngredients(ingredients.filter((_, i) => i !== index))}>
              删
            </button>
          </div>
        ))}
        <button type="button" className="btn ghost" onClick={() => setIngredients([...ingredients, emptyIngredient()])}>
          加一行原料
        </button>
        <label>
          备注 / 配方来源
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="比如 Freeform 截图里的比例，或烤箱温度" />
        </label>
        <div className="muted tiny">{formatNutrientLine(total)}</div>
        {error ? <div className="error">{error}</div> : null}
        <button className="btn" type="submit">
          保存食谱
        </button>
      </form>

      {initial ? (
        <div className="card">
          <div className="row">
            <h2>用这份食谱做的批次</h2>
            <Link className="btn sage" to={`/kitchen/batches/new?recipe=${initial.id}`}>
              做了一批
            </Link>
          </div>
          {batches.length === 0 ? (
            <div className="muted" style={{ marginTop: 8 }}>
              还没做过。做完切成 {yieldAmount}
              {yieldUnit} 之后建一批，日记里的 4/{yieldAmount} 就能对上。
            </div>
          ) : (
            <ul className="history">
              {batches.map((batch) => (
                <li key={batch.id}>
                  <Link to={`/kitchen/batches/${batch.id}`}>
                    {batch.madeOn} · 还剩 {batch.remainingAmount}
                    {batch.yieldUnit}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <button
            className="btn ghost"
            type="button"
            style={{ marginTop: 12 }}
            onClick={async () => {
              if (!confirm("删除食谱？已有批次不会自动删。")) return;
              await db.recipes.delete(initial.id);
              navigate("/kitchen");
            }}
          >
            删除食谱
          </button>
        </div>
      ) : null}
    </div>
  );

  function updateIng(index: number, patch: Partial<Ingredient>) {
    setIngredients(ingredients.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
}
