import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import AppRouter from "./router";
import "./styles/index.css";
import { useTelegram } from "./hooks/useTelegram";
import ErrorBoundary from "./ErrorBoundary";

function App() {
  useTelegram();
  return <AppRouter />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HashRouter>
  </React.StrictMode>,
);

