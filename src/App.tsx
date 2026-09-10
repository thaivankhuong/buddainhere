import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import TraySettings from "./components/TraySettings";
import OverlayDisplay from "./components/OverlayDisplay";
import "./index.css";

function App() {
  const [windowLabel] = useState(() => {
    try {
      return getCurrentWindow().label;
    } catch {
      return "main";
    }
  });

  if (windowLabel === "overlay") {
    return <OverlayDisplay />;
  }

  if (windowLabel === "main") {
    return <TraySettings />;
  }

  return null;
}

export default App;
