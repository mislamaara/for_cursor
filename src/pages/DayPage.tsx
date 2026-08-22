import { useParams } from "react-router-dom";
import { DayView } from "../components/DayView";
import { todayISO } from "../lib/dates";

export function DayPage() {
  const { date = todayISO() } = useParams();
  return <DayView date={date} />;
}
