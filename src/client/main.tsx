import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { InviteMode } from "../shared/types";
import { HomePage } from "./pages/Home";
import { InvitePage } from "./pages/Invite";
import { NotFound } from "./pages/NotFound";
import { AdminApp } from "./admin/AdminApp";
import "./styles/public.css";

type Route =
  | { page: "home" }
  | { page: "admin" }
  | { page: "invite"; code: string; mode?: InviteMode }
  | { page: "notFound" };

/**
 * Rotas:
 *  /                → página inicial
 *  /admin           → painel
 *  /<slug>          → convite individual
 *  /familia/<slug>  → convite de família
 *  /pessoa/<slug>, /convite/<slug>, /c/<slug> → caminhos antigos
 */
function resolveRoute(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean).map(p => decodeURIComponent(p).toLowerCase().trim());
  if (parts.length === 0) return { page: "home" };
  if (parts[0] === "admin") return { page: "admin" };
  if (parts.length === 1) return { page: "invite", code: parts[0] };
  if (parts.length === 2 && ["familia", "pessoa", "convite", "c"].includes(parts[0])) {
    const mode = parts[0] === "familia" || parts[0] === "pessoa" ? (parts[0] as InviteMode) : undefined;
    return { page: "invite", code: parts[1], mode };
  }
  return { page: "notFound" };
}

function App() {
  const route = resolveRoute(window.location.pathname);
  switch (route.page) {
    case "home":
      return <HomePage />;
    case "admin":
      return <AdminApp />;
    case "invite":
      return <InvitePage code={route.code} mode={route.mode} />;
    default:
      return <NotFound />;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
