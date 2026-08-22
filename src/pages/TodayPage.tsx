import { DayView } from "../components/DayView";
import { PageHeader } from "../components/PageHeader";
import { formatDate, todayISO } from "../lib/dates";

export function TodayPage() {
  const date = todayISO();
  return (
    <div>
      <PageHeader title={formatDate(date)} subtitle="吃的、做的、练的，对到同一批自制。" />
      <DayView date={date} showNav={false} />
    </div>
  );
}
