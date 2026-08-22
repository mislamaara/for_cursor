import { NavLink, Outlet } from "react-router-dom";
import { IconBook, IconKitchen, IconMe, IconToday } from "./Icons";

export function Layout() {
  return (
    <div className="app-shell">
      <Outlet />
      <nav className="nav">
        <NavLink to="/" end>
          <IconToday />
          今日
        </NavLink>
        <NavLink to="/diary">
          <IconBook />
          日记
        </NavLink>
        <NavLink to="/kitchen">
          <IconKitchen />
          自制
        </NavLink>
        <NavLink to="/me">
          <IconMe />
          我的
        </NavLink>
      </nav>
    </div>
  );
}
