import { useMemo, useState } from "react";
import type { Batch, FoodEntry, Photo, Recipe, Workout } from "../types";
import { todayISO } from "../lib/dates";
import {
  buildDayExport,
  copyExportText,
  downloadDayExport,
  shareDayExport,
} from "../lib/exportDay";

export function DayExportPanel({
  date,
  recipes,
  batches,
  foods,
  workouts,
  photos,
}: {
  date: string;
  recipes: Recipe[];
  batches: Batch[];
  foods: FoodEntry[];
  workouts: Workout[];
  photos: Photo[];
}) {
  const [message, setMessage] = useState("");
  const exportArgs = useMemo(
    () => ({ date, recipes, batches, foods, workouts, photos }),
    [date, recipes, batches, foods, workouts, photos],
  );
  const text = useMemo(() => buildDayExport(exportArgs), [exportArgs]);
  const isToday = date === todayISO();
  const title = isToday ? "导出今日" : "导出这一天";
  const hasPhotos = photos.length > 0;

  async function onCopy() {
    try {
      await copyExportText(text);
      setMessage(
        hasPhotos
          ? "文字已复制。照片请点「下载」或「分享」，会一起打包。"
          : "已复制，可以直接发给 AI。",
      );
    } catch {
      setMessage("复制失败，请改用下载。");
    }
  }

  async function onDownload() {
    try {
      await downloadDayExport(exportArgs);
      setMessage(hasPhotos ? `已下载 ZIP，含 ${photos.length} 张照片。` : "已下载文本文件。");
    } catch {
      setMessage("下载失败，请稍后再试。");
    }
  }

  async function onShare() {
    const result = await shareDayExport(exportArgs);
    if (result === "shared") {
      setMessage(hasPhotos ? "已打开分享，ZIP 里含照片。" : "已打开分享面板。");
    } else if (result === "cancelled") {
      setMessage("");
    } else {
      setMessage(hasPhotos ? "此设备不能分享 ZIP，请用下载。" : "此设备不支持分享，请用复制或下载。");
    }
  }

  return (
    <div className="card">
      <div className="row">
        <h2>{title}</h2>
        <span className="muted tiny">替代 Freeform PDF</span>
      </div>
      <p className="muted tiny">
        自制食物会标出来自哪一批。
        {hasPhotos ? ` 今天有 ${photos.length} 张照片，下载/分享时会一起打包。` : " 复制只含文字；有照片时请下载或分享。"}
      </p>
      <div className="fab-row" style={{ marginTop: 10 }}>
        <button className="btn" type="button" onClick={() => void onCopy()}>
          复制文字
        </button>
        <button className="btn ghost" type="button" onClick={() => void onDownload()}>
          {hasPhotos ? "下载 ZIP" : "下载"}
        </button>
      </div>
      {"share" in navigator ? (
        <button className="btn ghost block" type="button" style={{ marginTop: 8 }} onClick={() => void onShare()}>
          {hasPhotos ? "分享（含照片）…" : "分享…"}
        </button>
      ) : null}
      {message ? <div className="success" style={{ marginTop: 8 }}>{message}</div> : null}
      <pre className="muted tiny export-preview">{text}</pre>
    </div>
  );
}
