import { Link, useNavigate } from "react-router-dom";
import { IconBack } from "./Icons";

export function PageHeader({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle?: string;
  back?: string | number;
}) {
  const navigate = useNavigate();
  return (
    <div className="topbar">
      <div>
        <div className="brand">膳食本</div>
        <h1>{title}</h1>
        {subtitle ? <div className="muted">{subtitle}</div> : null}
      </div>
      {back !== undefined ? (
        typeof back === "string" ? (
          <Link className="icon-btn" to={back} aria-label="返回">
            <IconBack />
          </Link>
        ) : (
          <button className="icon-btn" type="button" aria-label="返回" onClick={() => navigate(back)}>
            <IconBack />
          </button>
        )
      ) : null}
    </div>
  );
}
