import { createRoot } from "react-dom/client";
import "./index.css";
import { SUPABASE_ENV_ERROR } from "@/config/supabase";
import EnvError from "@/components/EnvError";

const rootEl = document.getElementById("root")!;
const root = createRoot(rootEl);

if (SUPABASE_ENV_ERROR) {
  root.render(<EnvError message={SUPABASE_ENV_ERROR} />);
} else {
  import("./App.tsx")
    .then(({ default: App }) => root.render(<App />))
    .catch((err) => root.render(<EnvError message={String(err)} />));
}
