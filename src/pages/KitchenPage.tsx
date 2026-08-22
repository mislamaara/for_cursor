import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "../components/PageHeader";
import { db } from "../db";
import { eatenAmount, formatQty, isOpen, remainingLabel } from "../lib/batches";
import { formatShort } from "../lib/dates";
import { formatNutrient, perPortion } from "../lib/nutrition";

export function KitchenPage() {
  const recipes = useLiveQuery(() => db.recipes.toArray()) ?? [];
  const batches = useLiveQuery(() => db.batches.toArray()) ?? [];
  const foods = useLiveQuery(() => db.foods.toArray()) ?? [];
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const open = batches.filter(isOpen).sort((a, b) => b.madeOn.localeCompare(a.madeOn));
  const closed = batches.filter((batch) => !isOpen(batch)).sort((a, b) => b.madeOn.localeCompare(a.madeOn));

  return (
    <div>
      <PageHeader title="自制" subtitle="食谱是配方，批次是某一次做出来的。吃的时候扣对应那一批。" />

      <div className="fab-row" style={{ marginTop: 0, marginBottom: 12 }}>
        <Link className="btn sage" to="/kitchen/recipes/new">
          新建食谱
        </Link>
        <Link className="btn terra" to="/kitchen/batches/new">
          做了一批
        </Link>
      </div>

      <div className="card">
        <div className="row">
          <h2>库存</h2>
          <span className="muted tiny">还没吃完的批次</span>
        </div>
        {open.length === 0 ? (
          <div className="empty">没有库存。烤完吐司或切完蛋糕后来这里建一批。</div>
        ) : (
          <div className="inventory" style={{ marginTop: 10 }}>
            {open.map((batch) => {
              const recipe = recipeById.get(batch.recipeId);
              if (!recipe) return null;
              return (
                <Link className="card inventory-card" key={batch.id} to={`/kitchen/batches/${batch.id}`} style={{ marginTop: 0 }}>
                  <div className="row">
                    <h3>{recipe.name}</h3>
                    <span className="pill sage">剩 {remainingLabel(batch)}</span>
                  </div>
                  <div className="muted tiny" style={{ marginTop: 6 }}>
                    {formatShort(batch.madeOn)}做的 · 已吃 {formatQty(eatenAmount(batch), batch.yieldUnit)}
                    {perPortion(recipe) ? ` · 每${batch.yieldUnit} ${formatNutrient(perPortion(recipe))}` : ""}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div className="row">
          <h2>批次表</h2>
          <span className="muted tiny">跟日记对得上</span>
        </div>
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table>
            <thead>
              <tr>
                <th>食物</th>
                <th>做的日期</th>
                <th>总量</th>
                <th>已吃</th>
                <th>剩余</th>
                <th>最近一次吃</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    还没有批次
                  </td>
                </tr>
              ) : (
                [...open, ...closed].map((batch) => {
                  const recipe = recipeById.get(batch.recipeId);
                  const related = foods
                    .filter((food) => food.batchId === batch.id)
                    .sort((a, b) => b.date.localeCompare(a.date));
                  const last = related[0];
                  return (
                    <tr key={batch.id}>
                      <td>
                        <Link to={`/kitchen/batches/${batch.id}`}>{recipe?.name ?? "未知"}</Link>
                      </td>
                      <td>{formatShort(batch.madeOn)}</td>
                      <td>{formatQty(batch.yieldAmount, batch.yieldUnit)}</td>
                      <td>{formatQty(eatenAmount(batch), batch.yieldUnit)}</td>
                      <td>{formatQty(batch.remainingAmount, batch.yieldUnit)}</td>
                      <td>{last ? `${formatShort(last.date)} ${last.amount}${last.unit}` : "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <h2>食谱</h2>
          <Link className="muted tiny" to="/kitchen/recipes/new">
            + 新建
          </Link>
        </div>
        {recipes.length === 0 ? (
          <div className="empty">先把吐司、蛋糕、抹酱的配方存下来。</div>
        ) : (
          recipes.map((recipe) => (
            <Link className="food-item list-link" key={recipe.id} to={`/kitchen/recipes/${recipe.id}`}>
              <div>
                <div>{recipe.name}</div>
                <div className="muted tiny">
                  一次 {formatQty(recipe.yieldAmount, recipe.yieldUnit)} · {recipe.ingredients.length} 种原料
                </div>
              </div>
              <div className="muted tiny">{categoryLabel(recipe.category)}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function categoryLabel(category: string): string {
  return { bread: "面包", dessert: "甜点", sauce: "酱料", other: "其他" }[category] ?? category;
}
