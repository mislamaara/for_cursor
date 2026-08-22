import { useMemo, useState } from "react";
import type { Batch, FoodEntry, Recipe, Workout } from "../types";
import { todayISO } from "../lib/dates";
import {
  buildDayExport,
  copyExportText,
  dayExportFilename,
  downloadExportText,
  shareExportText,
} from "../lib/exportDay";

export function DayExportPanel({
  date,
  recipes,
  batches,
  foods,
  workouts,
}: {
  date: string;
  recipes: Recipe[];
  batches: Batch[];
  foods: FoodEntry[];
  workouts: Workout[];
}) {
  const [message, setMessage] = useState("");
  const text = useMemo(
    () => buildDayExport({ date, recipes, batches, foods, workouts }),
    [date, recipes, batches, foods, workouts],
  );
  const isToday = date === todayISO();
  const title = isToday ? "导出今日" : "导出这一天";

  async function onCopy() {
    try {
      await copyExportText(text);
      setMessage("已复制，可以直接发给 AI。");
    } catch {
      setMessage("复制失败，请改用下载。");
    }
  }

  function onDownload() {
    downloadExportText(dayExportFilename(date), text);
    setMessage("已下载文本文件。");
  }

  async function onShare() {
    const shared = await shareExportText(`膳食本 ${date}`, text);
    setMessage(shared ? "已打开分享面板。" : "此设备不支持分享，请用复制或下载。");
  }

  return (
    <div className="card">
      <div className="row">
        <h2>{title}</h2>
        <span className="muted tiny">替代 Freeform PDF</span>
      </div>
      <p className="muted tiny">自制食物会标出来自哪一批，方便 AI 对账。</p>
      <div className="fab-row" style={{ marginTop: 10 }}>
        <button className="btn" type="button" onClick={() => void onCopy()}>
          复制
        </button>
        <button className="btn ghost" type="button" onClick={onDownload}>
          下载
        </button>
      </div>
      {"share" in navigator ? (
        <button className="btn ghost block" type="button" style={{ marginTop: 8 }} onClick={() => void onShare()}>
          分享…
        </button>
      ) : null}
      {message ? <div className="success" style={{ marginTop: 8 }}>{message}</div> : null}
      <pre className="muted tiny export-preview">{text}</pre>
    </div>
  );
}
