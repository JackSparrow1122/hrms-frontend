// Silence console outputs as requested
console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.debug = () => {};

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeHrmsStorage } from "./lib/storageInit";

// Seed enterprise LocalStorage database on first boot
initializeHrmsStorage();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
