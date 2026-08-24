import { FormEvent, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { db } from "../db";
import { buildAiSummary } from "../lib/aiSummary";
import { isOpen } from "../lib/batches";
import { sumOptional } from "../lib/nutrition";
import { pullFromCloud, pushToCloud } from "../lib/sync";

export function MePage() {
  const auth = useAuth();
  const foods = useLiveQuery(() => db.foods.toArray()) ?? [];
  const workouts = useLiveQuery(() => db.workouts.toArray()) ?? [];
  const recipes = useLiveQuery(() => db.recipes.toArray()) ?? [];
  const batches = useLiveQuery(() => db.batches.toArray()) ?? [];
  const [copied, setCopied] = useState("");
  const [email, setEmail] = useState("");
  const [cloudMsg, setCloudMsg] = useState("");
  const [cloudErr, setCloudErr] = useState("");
  const [syncing, setSyncing] = useState(false);

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
    const payload = { recipes, batches, foods, workouts };
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

  async function onSendLink(event: FormEvent) {
    event.preventDefault();
    setCloudErr("");
    setCloudMsg("");
    try {
      const msg = await auth.signInWithEmail(email);
      setCloudMsg(msg);
    } catch (err) {
      setCloudErr(err instanceof Error ? err.message : "发送失败");
    }
  }

  async function onPush() {
    if (!auth.user) return;
    if (!confirm("把本机全部记录（含照片）上传到云端？")) return;
    setSyncing(true);
    setCloudErr("");
    setCloudMsg("");
    try {
      const result = await pushToCloud(auth.user.id);
      setCloudMsg(
        `已上传：食谱 ${result.recipes}、批次 ${result.batches}、饮食 ${result.foods}、运动 ${result.workouts}、照片 ${result.photos}`,
      );
    } catch (err) {
      setCloudErr(err instanceof Error ? err.message : "上传失败");
    } finally {
      setSyncing(false);
    }
  }

  async function onPull() {
    if (!auth.user) return;
    if (!confirm("从云端下载会覆盖本机记录，确定吗？")) return;
    setSyncing(true);
    setCloudErr("");
    setCloudMsg("");
    try {
      const result = await pullFromCloud(auth.user.id);
      setCloudMsg(
        `已下载：食谱 ${result.recipes}、批次 ${result.batches}、饮食 ${result.foods}、运动 ${result.workouts}、照片 ${result.photos}`,
      );
    } catch (err) {
      setCloudErr(err instanceof Error ? err.message : "下载失败");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="我的"
        subtitle={auth.user ? `已登录 ${auth.user.email}` : "本机记录可同步到 Supabase 云。"}
      />

      {auth.configured ? (
        <div className="card stack">
          <h2>云同步</h2>
          {auth.loading ? (
            <div className="muted">检查登录状态…</div>
          ) : auth.user ? (
            <>
              <p className="muted tiny">
                两台设备用同一邮箱登录，先在一台点「上传到云」，另一台点「从云下载」。
              </p>
              <div className="fab-row">
                <button className="btn sage" type="button" disabled={syncing} onClick={() => void onPush()}>
                  上传到云
                </button>
                <button className="btn ghost" type="button" disabled={syncing} onClick={() => void onPull()}>
                  从云下载
                </button>
              </div>
              <button className="btn ghost block" type="button" onClick={() => void auth.signOut()}>
                退出登录
              </button>
            </>
          ) : (
            <form className="form" onSubmit={(event) => void onSendLink(event)}>
              <label>
                邮箱（magic link 登录）
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <button className="btn" type="submit">
                发送登录链接
              </button>
            </form>
          )}
          {cloudMsg ? <div className="success">{cloudMsg}</div> : null}
          {cloudErr ? <div className="error">{cloudErr}</div> : null}
        </div>
      ) : (
        <div className="card">
          <h2>云同步</h2>
          <p className="muted tiny">线上版部署时需在 GitHub Secrets 配置 Supabase 密钥，然后重新 Run workflow。</p>
        </div>
      )}

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
        <p className="muted tiny">复制已对好批次的摘要，或导出 JSON 备份。</p>
        <button className="btn" type="button" onClick={() => void copySummary()}>
          复制近两周摘要
        </button>
        <button className="btn ghost" type="button" onClick={() => void exportJson()}>
          导出 JSON
        </button>
        {copied ? <div className="success">{copied}</div> : null}
        <pre className="muted tiny" style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>
          {summary}
        </pre>
      </div>
      <div className="card">
        <h2>示例数据</h2>
        <p className="muted tiny">首次打开会写入示例日记。若已云同步，请用「从云下载」而不是重置。</p>
        <button className="btn danger" type="button" onClick={() => void resetAll()}>
          清空并重新载入示例
        </button>
      </div>
    </div>
  );
}
