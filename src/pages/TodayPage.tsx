import { DayView } from "../components/DayView";
import { PageHeader } from "../components/PageHeader";
import { todayISO } from "../lib/dates";

export function TodayPage() {
  const date = todayISO();
  return (
    <div>
      <PageHeader title="今日" subtitle="吃的、做的、练的，对到同一批自制。" />
      <DayView date={date} showNav={false} />
    </div>
  );
}
