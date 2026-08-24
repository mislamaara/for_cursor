import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ensureSeed } from "./seed";
import "./index.css";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

function Root() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    ensureSeed()
      .then(() => setReady(true))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "初始化失败"));
  }, []);

  if (error) return <div className="app-shell">{error}</div>;
  if (!ready) return <div className="app-shell muted">正在打开膳食本…</div>;

  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
