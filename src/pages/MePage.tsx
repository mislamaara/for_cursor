import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "../components/PageHeader";
import { db } from "../db";
import { buildAiSummary } from "../lib/aiSummary";
import { isOpen } from "../lib/batches";
import { sumOptional } from "../lib/nutrition";

export function MePage() {
  const foods = useLiveQuery(() => db.foods.toArray()) ?? [];
  const workouts = useLiveQuery(() => db.workouts.toArray()) ?? [];
  const recipes = useLiveQuery(() => db.recipes.toArray()) ?? [];
  const batches = useLiveQuery(() => db.batches.toArray()) ?? [];
  const [copied, setCopied] = useState("");

  const dates = useMemo(
    () => Array.from(new Set(foods.map((item) => item.date))).sort((a, b) => b.localeCompare(a)),
    [foods],
  );
  const kcal = sumOptional(foods.map((item) => item.nutrients));
  const open = batches.filter(isOpen);
  const summary = buildAiSummary({ dates: dates.slice(0, 14), recipes, batches, foods, workouts });

  async function copySummary() {
    await navigator.clipboard.writeText(summary);
    setCopied("已复制，可以直接发给 AI。");
  }

  async function exportJson() {
    const payload = {
      recipes,
      batches,
      foods: foods.map((item) => ({ ...item })),
      workouts,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kitchen-log.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function resetAll() {
    if (!confirm("清空本机全部记录？示例数据会在刷新后重新写入。")) return;
    await db.delete();
    location.reload();
  }

  return (
    <div>
      <PageHeader title="我的" subtitle="数据只存在这台手机/电脑的浏览器里。" />
      <div className="card">
        <div className="stat-grid">
          <div className="stat">
            <span className="muted tiny">日记天数</span>
            <b>{dates.length}</b>
          </div>
          <div className="stat">
            <span className="muted tiny">未吃完批次</span>
            <b>{open.length}</b>
          </div>
          <div className="stat">
            <span className="muted tiny">食谱</span>
            <b>{recipes.length}</b>
          </div>
          <div className="stat">
            <span className="muted tiny">已记热量</span>
            <b>{kcal ? kcal.kcal : "—"}</b>
          </div>
        </div>
      </div>
      <div className="card stack">
        <h2>发给 AI</h2>
        <p className="muted tiny">
          以前要把 Freeform 导出 PDF。现在可以复制一份已经对好批次的摘要：蛋糕会写明是哪一天做的那一批。
        </p>
        <button className="btn" type="button" onClick={copySummary}>
          复制近两周摘要
        </button>
        <button className="btn ghost" type="button" onClick={exportJson}>
          导出 JSON
        </button>
        {copied ? <div className="success">{copied}</div> : null}
        <pre className="muted tiny" style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>
          {summary}
        </pre>
      </div>
      <div className="card">
        <h2>示例数据</h2>
        <p className="muted tiny">首次打开会写入你 8/18–8/22 的日记，以及吐司、榴莲芝士蛋糕、抹酱三批自制。</p>
        <button className="btn danger" type="button" onClick={resetAll}>
          清空并重新载入示例
        </button>
      </div>
    </div>
  );
}
