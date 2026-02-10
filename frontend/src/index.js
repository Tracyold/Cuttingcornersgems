import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Typography imports (must be last to override)
import "@/styles/typography.roles.css";
import "@/styles/typography.lock.css";

// DEV Typography Guard - hard-fail if OTF fonts not loaded
if (process.env.NODE_ENV === "development") {
  document.fonts.ready.then(() => {
    const fontsLoaded = 
      document.fonts.check('16px "CCArnoPro"') &&
      document.fonts.check('16px "CCVidaloka"') &&
      document.fonts.check('16px "CCAHAMONO"');
    
    if (!fontsLoaded) {
      console.error("TypographyGuard: required OTF fonts not loaded; refusing fallback.");
      // Show visual warning in dev
      const warning = document.createElement('div');
      warning.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:10px;z-index:99999;text-align:center;font-family:monospace;';
      warning.textContent = 'TYPOGRAPHY ERROR: OTF fonts not loaded. Check console.';
      document.body.prepend(warning);
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
