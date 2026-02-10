import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Typography imports (must be last to override)
import "@/styles/typography.roles.css";
import "@/styles/typography.lock.css";

// DEV Typography Guard - warn if role fonts not detected
if (process.env.NODE_ENV === "development") {
  document.fonts.ready.then(() => {
    const fontsToCheck = [
      '"Oranienbaum"',
      '"Comfortaa Regular"',
      '"Montserrat Regular Pro"',
      '"Nexa Rust Sans"',
      '"AHAMONO-Regular"'
    ];
    const missing = fontsToCheck.filter(f => !document.fonts.check(`16px ${f}`));
    if (missing.length > 0) {
      console.warn("TypographyGuard: Some fonts may not be loaded:", missing.join(", "));
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
