import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { db } from "../db";
import { newId, todayISO } from "../lib/dates";

export function AddWorkoutPage() {
  const [params] = useSearchParams();
  const date = params.get("date") || todayISO();
  const navigate = useNavigate();
  const [name, setName] = useState("室内跑");
  const [durationMin, setDurationMin] = useState("50");
  const [distanceKm, setDistanceKm] = useState("");
  const [kcal, setKcal] = useState("");
  const [notes, setNotes] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await db.workouts.add({
      id: newId(),
      date,
      name: name.trim() || "训练",
      durationMin: durationMin ? Number(durationMin) : undefined,
      distanceKm: distanceKm ? Number(distanceKm) : undefined,
      kcal: kcal ? Number(kcal) : undefined,
      notes,
      createdAt: new Date().toISOString(),
    });
    navigate(`/day/${date}`);
  }

  return (
    <div>
      <PageHeader title="记运动" subtitle={date} back={-1} />
      <form className="card form" onSubmit={onSubmit}>
        <label>
          项目
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="下肢 / 核心 / 室内跑" />
        </label>
        <label>
          分钟
          <input value={durationMin} onChange={(event) => setDurationMin(event.target.value)} />
        </label>
        <label>
          公里（可空）
          <input value={distanceKm} onChange={(event) => setDistanceKm(event.target.value)} />
        </label>
        <label>
          kcal（手表上的）
          <input value={kcal} onChange={(event) => setKcal(event.target.value)} />
        </label>
        <label>
          备注
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Apple Watch：50:30，7.03 km" />
        </label>
        <button className="btn sage" type="submit">
          记下训练
        </button>
      </form>
    </div>
  );
}
