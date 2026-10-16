// Entrada del frontend donde createRoot monta App en el div root

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

// StrictMode envuelve App y solo revisa errores en desarrollo
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
