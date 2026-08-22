import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "../components/PageHeader";
import { db } from "../db";
import { applyQuickLog, logFood } from "../lib/actions";
import { batchTitle, formatQty, isOpen, remainingLabel } from "../lib/batches";
import { todayISO } from "../lib/dates";
import { nutrientsForPortions } from "../lib/nutrition";
import type { MealType } from "../types";

const MEALS: { id: MealType; label: string }[] = [
  { id: "breakfast", label: "早餐" },
  { id: "lunch", label: "午餐" },
  { id: "dinner", label: "晚餐" },
  { id: "snack", label: "加餐" },
];

export function AddFoodPage() {
  const [params] = useSearchParams();
  const date = params.get("date") || todayISO();
  const presetMeal = (params.get("meal") as MealType) || "breakfast";
  const presetBatch = params.get("batch") || "";
  const [tab, setTab] = useState<"batch" | "plain" | "quick">(presetBatch ? "batch" : "quick");
  const [meal, setMeal] = useState<MealType>(presetMeal);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader title="记吃的" subtitle={date} back={-1} />
      <div className="segment" style={{ marginBottom: 12 }}>
        <button className={tab === "quick" ? "on" : ""} type="button" onClick={() => setTab("quick")}>
          一句话
        </button>
        <button className={tab === "batch" ? "on" : ""} type="button" onClick={() => setTab("batch")}>
          吃自制
        </button>
        <button className={tab === "plain" ? "on" : ""} type="button" onClick={() => setTab("plain")}>
          食堂/其他
        </button>
      </div>
      <MealPicker meal={meal} setMeal={setMeal} />
      {tab === "quick" ? (
        <QuickForm date={date} meal={meal} setError={setError} setMessage={setMessage} navigate={navigate} />
      ) : null}
      {tab === "batch" ? (
        <BatchForm date={date} meal={meal} presetBatch={presetBatch} setError={setError} navigate={navigate} />
      ) : null}
      {tab === "plain" ? (
        <PlainForm date={date} meal={meal} setError={setError} navigate={navigate} />
      ) : null}
      {error ? <div className="error" style={{ marginTop: 10 }}>{error}</div> : null}
      {message ? <div className="success" style={{ marginTop: 10 }}>{message}</div> : null}
    </div>
  );
}

function MealPicker({ meal, setMeal }: { meal: MealType; setMeal: (meal: MealType) => void }) {
  return (
    <div className="segment" style={{ marginBottom: 12 }}>
      {MEALS.map((item) => (
        <button key={item.id} className={meal === item.id ? "on" : ""} type="button" onClick={() => setMeal(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

function QuickForm({
  date,
  meal,
  setError,
  setMessage,
  navigate,
}: {
  date: string;
  meal: MealType;
  setError: (value: string) => void;
  setMessage: (value: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [text, setText] = useState("2卤蛋、1片吐司、4/30榴莲芝士蛋糕");
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await applyQuickLog({ text, date, meal });
      setMessage(`记下 ${result.items.length} 项，其中 ${result.linked} 项对上了自制批次。`);
      setTimeout(() => navigate(`/day/${date}`), 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "没记上");
    }
  }
  return (
    <form className="card form" onSubmit={onSubmit}>
      <label>
        像 Freeform 那样写，逗号或顿号分开
        <textarea value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <div className="muted tiny">
        写「4/30榴莲芝士蛋糕」或「1片吐司」时，会自动扣还没吃完、日期最近的那一批。
      </div>
      <button className="btn terra" type="submit">
        识别并记上
      </button>
    </form>
  );
}

function BatchForm({
  date,
  meal,
  presetBatch,
  setError,
  navigate,
}: {
  date: string;
  meal: MealType;
  presetBatch: string;
  setError: (value: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const recipes = useLiveQuery(() => db.recipes.toArray()) ?? [];
  const batches = useLiveQuery(() => db.batches.toArray()) ?? [];
  const open = batches.filter(isOpen).sort((a, b) => b.madeOn.localeCompare(a.madeOn));
  const [batchId, setBatchId] = useState(presetBatch || open[0]?.id || "");
  const [amount, setAmount] = useState(1);
  const selected = open.find((item) => item.id === batchId) ?? open[0];
  const recipe = recipes.find((item) => item.id === selected?.recipeId);
  const preview = recipe && selected ? nutrientsForPortions(recipe, amount) : undefined;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected) {
      setError("没有可吃的自制批次");
      return;
    }
    try {
      await logFood({
        date,
        meal,
        name: recipe?.name ?? "自制",
        amount,
        unit: selected.yieldUnit,
        batchId: selected.id,
      });
      navigate(`/day/${date}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "没记上");
    }
  }

  if (open.length === 0) {
    return (
      <div className="card">
        库存是空的。<Link to="/kitchen/batches/new">先记一批刚做的</Link>
      </div>
    );
  }

  return (
    <form className="card form" onSubmit={onSubmit}>
      {open.map((batch) => {
        const itemRecipe = recipes.find((item) => item.id === batch.recipeId);
        if (!itemRecipe) return null;
        const on = (selected?.id ?? "") === batch.id;
        return (
          <button
            key={batch.id}
            type="button"
            className="card"
            style={{ textAlign: "left", borderColor: on ? "var(--sage)" : undefined, marginTop: 0 }}
            onClick={() => setBatchId(batch.id)}
          >
            <div className="row">
              <strong>{batchTitle(itemRecipe, batch)}</strong>
              <span className="pill sage">剩 {remainingLabel(batch)}</span>
            </div>
            <div className="muted tiny">点它，就知道 4/30 吃的是哪一次做的。</div>
          </button>
        );
      })}
      <label>
        吃多少（{selected?.yieldUnit ?? "份"}）
        <input type="number" min={0.1} step="0.1" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
      </label>
      {selected && recipe ? (
        <div className="muted tiny">
          将从「{batchTitle(recipe, selected)}」扣 {formatQty(amount, selected.yieldUnit)}，还剩{" "}
          {formatQty(selected.remainingAmount - amount, selected.yieldUnit)}。
          {preview ? ` 这一口约 ${preview.kcal} kcal / 蛋白 ${preview.protein}g。` : ""}
        </div>
      ) : null}
      <button className="btn terra" type="submit">
        对上这一批
      </button>
    </form>
  );
}

function PlainForm({
  date,
  meal,
  setError,
  navigate,
}: {
  date: string;
  meal: MealType;
  setError: (value: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState("份");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("写一下吃了什么");
      return;
    }
    await logFood({
      date,
      meal,
      name: name.trim(),
      amount,
      unit,
      nutrients:
        kcal || protein
          ? { kcal: Number(kcal) || 0, protein: Number(protein) || 0, carb: 0, fat: 0 }
          : undefined,
    });
    navigate(`/day/${date}`);
  }

  return (
    <form className="card form" onSubmit={onSubmit}>
      <label>
        吃了什么
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="食堂口水鸡 / 500g 牛奶" />
      </label>
      <div className="ingredient">
        <label>
          数量
          <input type="number" step="0.1" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        </label>
        <label>
          单位
          <input value={unit} onChange={(event) => setUnit(event.target.value)} />
        </label>
        <div />
      </div>
      <div className="ingredient">
        <label>
          kcal（可空）
          <input value={kcal} onChange={(event) => setKcal(event.target.value)} />
        </label>
        <label>
          蛋白 g
          <input value={protein} onChange={(event) => setProtein(event.target.value)} />
        </label>
        <div />
      </div>
      <button className="btn" type="submit">
        记下
      </button>
    </form>
  );
}
