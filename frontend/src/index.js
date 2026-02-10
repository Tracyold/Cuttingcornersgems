import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Typography imports (must be last to override)
import "@/styles/typography.roles.css";
import "@/styles/typography.lock.css";

// DEV Typography Guard - warn if OTF fonts not detected (may false-positive in isolated contexts)
if (process.env.NODE_ENV === "development") {
  document.fonts.ready.then(() => {
    const fontsLoaded = 
      document.fonts.check('16px "CCArnoPro"') &&
      document.fonts.check('16px "CCVidaloka"') &&
      document.fonts.check('16px "CCAHAMONO"');
    
    if (!fontsLoaded) {
      console.warn("TypographyGuard: document.fonts.check() returned false. Fonts may still be loading or check failed in isolated context.");
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
