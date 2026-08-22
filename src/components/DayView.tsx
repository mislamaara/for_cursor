import { DayExportPanel } from "./DayExportPanel";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { deleteFood, deletePhoto, deleteWorkout } from "../lib/actions";
import { addDays, formatDate } from "../lib/dates";
import { batchTitle, formatQty, isOpen, remainingLabel } from "../lib/batches";
import { formatNutrient, sumOptional } from "../lib/nutrition";
import type { Batch, FoodEntry, MealType, Recipe, Workout } from "../types";

const MEALS: { id: MealType; label: string }[] = [
  { id: "breakfast", label: "早餐" },
  { id: "lunch", label: "午餐" },
  { id: "dinner", label: "晚餐" },
  { id: "snack", label: "加餐" },
];

export function DayView({ date, showNav = true }: { date: string; showNav?: boolean }) {
  const foods = useLiveQuery(() => db.foods.where("date").equals(date).toArray(), [date]) ?? [];
  const workouts = useLiveQuery(() => db.workouts.where("date").equals(date).toArray(), [date]) ?? [];
  const batches = useLiveQuery(() => db.batches.toArray(), []) ?? [];
  const recipes = useLiveQuery(() => db.recipes.toArray(), []) ?? [];
  const photos =
    useLiveQuery(
      () => db.photos.where("kind").equals("day").and((photo) => photo.refId === date).toArray(),
      [date],
    ) ?? [];

  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const batchById = new Map(batches.map((batch) => [batch.id, batch]));
  const open = batches.filter(isOpen);
  const totals = sumOptional(foods.map((food) => food.nutrients));
  const workoutKcal = workouts.reduce((sum, item) => sum + (item.kcal ?? 0), 0);

  return (
    <div>
      {showNav ? (
        <div className="row" style={{ marginBottom: 12 }}>
          <Link className="icon-btn" to={`/day/${addDays(date, -1)}`} aria-label="前一天">
            ‹
          </Link>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div className="brand">膳食本</div>
            <h1>{formatDate(date)}</h1>
          </div>
          <Link className="icon-btn" to={`/day/${addDays(date, 1)}`} aria-label="后一天">
            ›
          </Link>
        </div>
      ) : null}

      {open.length > 0 ? (
        <div className="card">
          <div className="muted tiny">正在吃的自制</div>
          <div className="wrap" style={{ marginTop: 8 }}>
            {open.map((batch) => {
              const recipe = recipeById.get(batch.recipeId);
              if (!recipe) return null;
              return (
                <Link key={batch.id} className="pill sage" to={`/kitchen/batches/${batch.id}`}>
                  {recipe.name} 剩 {remainingLabel(batch)}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="stat-grid">
          <div className="stat">
            <span className="muted tiny">摄入</span>
            <b>{totals ? `${totals.kcal}` : "—"}</b>
            <span className="muted tiny">{totals ? `蛋白 ${totals.protein}g` : "自制食物会按食谱折算"}</span>
          </div>
          <div className="stat">
            <span className="muted tiny">运动</span>
            <b>{workoutKcal || "—"}</b>
            <span className="muted tiny">{workouts.map((item) => item.name).join("、") || "还没记训练"}</span>
          </div>
        </div>
      </div>

      {MEALS.map((meal) => (
        <section key={meal.id}>
          <div className="row">
            <div className="meal-title">{meal.label}</div>
            <Link className="muted tiny" to={`/add/food?date=${date}&meal=${meal.id}`}>
              + 记
            </Link>
          </div>
          <div className="card">
            <MealList
              items={foods.filter((food) => food.meal === meal.id)}
              batchById={batchById}
              recipeById={recipeById}
            />
          </div>
        </section>
      ))}

      <section>
        <div className="row">
          <div className="meal-title">运动</div>
          <Link className="muted tiny" to={`/add/workout?date=${date}`}>
            + 记
          </Link>
        </div>
        <div className="card">
          {workouts.length === 0 ? (
            <div className="muted">还没有训练记录</div>
          ) : (
            workouts.map((workout) => (
              <WorkoutLine key={workout.id} workout={workout} onDelete={() => deleteWorkout(workout.id)} />
            ))
          )}
        </div>
      </section>

      <PhotoStrip photos={photos} date={date} />

      <DayExportPanel
        date={date}
        recipes={recipes}
        batches={batches}
        foods={foods}
        workouts={workouts}
        photos={photos}
      />

      <div className="fab-row">
        <Link className="btn terra" to={`/add/food?date=${date}`}>
          记吃的
        </Link>
        <Link className="btn sage" to="/kitchen">
          看自制批次
        </Link>
      </div>
    </div>
  );
}

function MealList({
  items,
  batchById,
  recipeById,
}: {
  items: FoodEntry[];
  batchById: Map<string, Batch>;
  recipeById: Map<string, Recipe>;
}) {
  if (items.length === 0) return <div className="muted">空着</div>;
  return (
    <div>
      {items.map((food) => {
        const batch = food.batchId ? batchById.get(food.batchId) : undefined;
        const recipe = batch ? recipeById.get(batch.recipeId) : undefined;
        return (
          <div className="food-item" key={food.id}>
            <div>
              <div>
                {formatQty(food.amount, food.unit)}
                {food.name}
              </div>
              {batch && recipe ? (
                <Link className="batch-link" to={`/kitchen/batches/${batch.id}`}>
                  来自 {batchTitle(recipe, batch)}
                </Link>
              ) : (
                <div className="muted tiny">{food.notes || "食堂 / 随手记"}</div>
              )}
            </div>
            <div className="muted tiny" style={{ textAlign: "right" }}>
              {food.nutrients ? formatNutrient(food.nutrients) : ""}
            </div>
            <button
              className="btn linkish"
              type="button"
              aria-label={`删除 ${food.name}`}
              onClick={() => {
                const msg = batch
                  ? `删除这条记录，并把 ${formatQty(food.amount, food.unit)} 加回库存？`
                  : `删除「${formatQty(food.amount, food.unit)}${food.name}」？`;
                if (confirm(msg)) void deleteFood(food.id);
              }}
            >
              删除
            </button>
          </div>
        );
      })}
    </div>
  );
}

function WorkoutLine({ workout, onDelete }: { workout: Workout; onDelete: () => void }) {
  const bits = [
    workout.durationMin ? `${workout.durationMin} 分钟` : null,
    workout.distanceKm ? `${workout.distanceKm} km` : null,
    workout.kcal ? `${workout.kcal} kcal` : null,
  ].filter(Boolean);
  return (
    <div className="food-item">
      <div>
        <div>{workout.name}</div>
        <div className="muted tiny">{workout.notes || bits.join(" · ")}</div>
      </div>
      <div className="muted tiny">{bits[0]}</div>
      <button
        className="btn linkish"
        type="button"
        aria-label={`删除 ${workout.name}`}
        onClick={() => {
          if (confirm(`删除训练「${workout.name}」？`)) onDelete();
        }}
      >
        删除
      </button>
    </div>
  );
}

function PhotoStrip({ photos, date }: { photos: { id: string; blob: Blob }[]; date: string }) {
  return (
    <div className="card">
      <div className="row">
        <div className="muted tiny">当天照片</div>
        <label className="muted tiny" style={{ cursor: "pointer" }}>
          + 照片
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              await db.photos.add({
                id: crypto.randomUUID(),
                kind: "day",
                refId: date,
                blob: file,
                createdAt: new Date().toISOString(),
              });
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {photos.length > 0 ? (
        <div className="photo-row" style={{ marginTop: 8 }}>
          {photos.map((photo) => (
            <Photo
              key={photo.id}
              blob={photo.blob}
              onDelete={() => {
                if (confirm("删除这张照片？")) void deletePhoto(photo.id);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="muted tiny" style={{ marginTop: 6 }}>
          包装、食堂餐、手表截图都可以放这里，不用再堆进 Freeform。
        </div>
      )}
    </div>
  );
}

function Photo({ blob, onDelete }: { blob: Blob; onDelete: () => void }) {
  const url = URL.createObjectURL(blob);
  return (
    <div className="photo-wrap">
      <img src={url} alt="" onLoad={() => setTimeout(() => URL.revokeObjectURL(url), 1000)} />
      <button type="button" aria-label="删除照片" onClick={onDelete}>
        ×
      </button>
    </div>
  );
}
