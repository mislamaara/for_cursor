import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AddFoodPage } from "./pages/AddFoodPage";
import { AddWorkoutPage } from "./pages/AddWorkoutPage";
import { BatchPage, NewBatchPage } from "./pages/BatchPage";
import { DayPage } from "./pages/DayPage";
import { DiaryPage } from "./pages/DiaryPage";
import { KitchenPage } from "./pages/KitchenPage";
import { MePage } from "./pages/MePage";
import { RecipePage } from "./pages/RecipePage";
import { TodayPage } from "./pages/TodayPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<TodayPage />} />
        <Route path="/diary" element={<DiaryPage />} />
        <Route path="/day/:date" element={<DayPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/kitchen/recipes/:id" element={<RecipePage />} />
        <Route path="/kitchen/batches/new" element={<NewBatchPage />} />
        <Route path="/kitchen/batches/:id" element={<BatchPage />} />
        <Route path="/add/food" element={<AddFoodPage />} />
        <Route path="/add/workout" element={<AddWorkoutPage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
