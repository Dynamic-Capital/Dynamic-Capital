import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@once-ui-system/core/css/tokens.css";
import "@once-ui-system/core/css/styles.css";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
