import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "../components/PageHeader";
import { db } from "../db";
import { formatDate, formatShort } from "../lib/dates";
import { sumOptional } from "../lib/nutrition";

export function DiaryPage() {
  const foods = useLiveQuery(() => db.foods.toArray()) ?? [];
  const workouts = useLiveQuery(() => db.workouts.toArray()) ?? [];
  const dates = Array.from(new Set([...foods.map((item) => item.date), ...workouts.map((item) => item.date)])).sort(
    (a, b) => b.localeCompare(a),
  );

  return (
    <div>
      <PageHeader title="日记" subtitle="按天翻，自制食物会标出是哪一批。" />
      {dates.length === 0 ? (
        <div className="card empty">还没有日记。先从今日记一笔，或去做一批面包。</div>
      ) : (
        <div className="stack">
          {dates.map((date) => {
            const dayFoods = foods.filter((item) => item.date === date);
            const dayWorkouts = workouts.filter((item) => item.date === date);
            const homemade = dayFoods.filter((item) => item.batchId);
            const kcal = sumOptional(dayFoods.map((item) => item.nutrients));
            return (
              <Link className="card list-link" key={date} to={`/day/${date}`}>
                <div className="row">
                  <div>
                    <h2>{formatDate(date)}</h2>
                    <div className="muted tiny">
                      {dayFoods.length} 笔饮食
                      {dayWorkouts.length ? ` · ${dayWorkouts.map((item) => item.name).join("、")}` : ""}
                    </div>
                  </div>
                  <div className="muted tiny">{kcal ? `${kcal.kcal} kcal` : formatShort(date)}</div>
                </div>
                {homemade.length > 0 ? (
                  <div className="wrap" style={{ marginTop: 8 }}>
                    {homemade.map((item) => (
                      <span className="pill sage" key={item.id}>
                        {item.amount}
                        {item.unit}
                        {item.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
