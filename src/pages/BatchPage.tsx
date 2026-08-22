import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "../components/PageHeader";
import { db } from "../db";
import { deleteBatch, deleteFood } from "../lib/actions";
import { batchTitle, eatenAmount, formatQty, remainingLabel } from "../lib/batches";
import { formatDate } from "../lib/dates";
import { formatNutrientLine, nutrientsForPortions, perPortion } from "../lib/nutrition";

export function BatchPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = useLiveQuery(async () => {
    if (!id) return false as const;
    const batch = await db.batches.get(id);
    if (!batch) return false as const;
    const recipe = (await db.recipes.get(batch.recipeId)) ?? null;
    const foods = await db.foods.where("batchId").equals(id).toArray();
    return { batch, recipe, foods };
  }, [id]);

  if (data === undefined) return <div className="muted">读取批次…</div>;
  if (data === false || !data.recipe) return <div className="card">找不到这一批。</div>;

  const { batch, recipe, foods } = data;
  const sorted = [...foods].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  return (
    <div>
      <PageHeader title={recipe.name} subtitle={batchTitle(recipe, batch)} back="/kitchen" />
      <div className="card">
        <div className="stat-grid">
          <div className="stat">
            <span className="muted tiny">剩余</span>
            <b>{remainingLabel(batch)}</b>
            <span className="muted tiny">已吃 {formatQty(eatenAmount(batch), batch.yieldUnit)}</span>
          </div>
          <div className="stat">
            <span className="muted tiny">每{batch.yieldUnit}</span>
            <b>{perPortion(recipe) ? Math.round(perPortion(recipe)!.kcal) : "—"}</b>
            <span className="muted tiny">{formatNutrientLine(perPortion(recipe))}</span>
          </div>
        </div>
        {batch.notes ? <p className="muted tiny">{batch.notes}</p> : null}
        <div className="fab-row">
          <Link className="btn terra" to={`/add/food?batch=${batch.id}`}>
            吃了这批
          </Link>
          <Link className="btn ghost" to={`/kitchen/recipes/${recipe.id}`}>
            看食谱
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>谁在哪天吃了它</h2>
        {sorted.length === 0 ? (
          <div className="muted" style={{ marginTop: 8 }}>
            还没有人从这批里拿。日记里写 4/30 时选中这一批，就对得上了。
          </div>
        ) : (
          <ul className="history">
            {sorted.map((food) => (
              <li key={food.id}>
                <div className="row">
                  <div>
                    <Link to={`/day/${food.date}`}>{formatDate(food.date)}</Link>
                    <div className="muted tiny">
                      {mealLabel(food.meal)} · {formatQty(food.amount, food.unit)}
                      {food.notes ? ` · ${food.notes}` : ""}
                    </div>
                  </div>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => {
                      const msg = `撤销 ${formatDate(food.date)} 的 ${formatQty(food.amount, food.unit)}？会加回库存。`;
                      if (confirm(msg)) void deleteFood(food.id);
                    }}
                  >
                    撤销
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>管理</h2>
        <p className="muted tiny">
          删除整批会一并去掉所有吃饭记录。如果只是记错了，用上面的「撤销」或去日记里删单条。
        </p>
        <button
          className="btn danger"
          type="button"
          style={{ marginTop: 10 }}
          onClick={async () => {
            const msg =
              sorted.length > 0
                ? `删除「${batchTitle(recipe, batch)}」？会同时删掉 ${sorted.length} 条吃饭记录。`
                : `删除「${batchTitle(recipe, batch)}」？`;
            if (!confirm(msg)) return;
            await deleteBatch(batch.id);
            navigate("/kitchen");
          }}
        >
          删除这一批
        </button>
      </div>
    </div>
  );
}

export function NewBatchPage() {
  const navigate = useNavigate();
  const recipes = useLiveQuery(() => db.recipes.toArray()) ?? [];
  const params = new URLSearchParams(window.location.search);
  const preset = params.get("recipe") ?? recipes[0]?.id ?? "";
  const [recipeId, setRecipeId] = useState(preset);
  const [madeOn, setMadeOn] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const recipe = useMemo(() => recipes.find((item) => item.id === recipeId) ?? recipes[0], [recipes, recipeId]);
  const [yieldAmount, setYieldAmount] = useState(recipe?.yieldAmount ?? 1);
  const [yieldUnit, setYieldUnit] = useState(recipe?.yieldUnit ?? "份");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!recipe) {
      setError("先建一份食谱");
      return;
    }
    const id = crypto.randomUUID();
    await db.batches.add({
      id,
      recipeId: recipe.id,
      madeOn,
      yieldAmount: Number(yieldAmount) || 1,
      remainingAmount: Number(yieldAmount) || 1,
      yieldUnit: yieldUnit.trim() || recipe.yieldUnit,
      notes,
      createdAt: new Date().toISOString(),
    });
    navigate(`/kitchen/batches/${id}`);
  }

  return (
    <div>
      <PageHeader title="做了一批" subtitle="同一食谱可以烤很多次。吃的时候要选对日期那一批。" back="/kitchen" />
      <form className="card form" onSubmit={onSubmit}>
        <label>
          用哪份食谱
          <select
            value={recipe?.id ?? ""}
            onChange={(event) => {
              const next = recipes.find((item) => item.id === event.target.value);
              setRecipeId(event.target.value);
              if (next) {
                setYieldAmount(next.yieldAmount);
                setYieldUnit(next.yieldUnit);
              }
            }}
          >
            {recipes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          做的日期
          <input type="date" value={madeOn} onChange={(event) => setMadeOn(event.target.value)} />
        </label>
        <div className="ingredient">
          <label>
            这批出多少
            <input type="number" step="0.1" value={yieldAmount} onChange={(event) => setYieldAmount(Number(event.target.value))} />
          </label>
          <label>
            单位
            <input value={yieldUnit} onChange={(event) => setYieldUnit(event.target.value)} />
          </label>
          <div />
        </div>
        {recipe ? (
          <div className="muted tiny">
            如果切成 {yieldAmount}
            {yieldUnit}，日记里写 4/{yieldAmount} 就会扣这一批。每{yieldUnit}大约{" "}
            {nutrientsForPortions(recipe, 1) ? `${nutrientsForPortions(recipe, 1)!.kcal} kcal` : "待补营养"}。
          </div>
        ) : (
          <div className="muted tiny">
            还没有食谱。<Link to="/kitchen/recipes/new">先新建一份</Link>
          </div>
        )}
        <label>
          备注
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="加了种子 / 少糖 / 切 30 块" />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button className="btn terra" type="submit" disabled={!recipe}>
          存成一批
        </button>
      </form>
    </div>
  );
}

function mealLabel(meal: string): string {
  return { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "加餐" }[meal] ?? meal;
}
