import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/components/dynamic-ui-system/css/tokens.css";
import "@/components/dynamic-ui-system/css/styles.css";
import App from "./App.tsx";
import "./index.css";
import { applyDynamicBranding } from "./lib/dynamic-branding";

applyDynamicBranding();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
