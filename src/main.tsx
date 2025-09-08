import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SUPABASE_ENV_ERROR } from "@/config/supabase";
import EnvError from "@/components/EnvError";

const root = document.getElementById("root")!;
createRoot(root).render(
  SUPABASE_ENV_ERROR ? <EnvError message={SUPABASE_ENV_ERROR} /> : <App />,
);
