import { useState } from "react";
import { ImageViewer } from "../components/ImageViewer";
import { InfoPanel } from "../components/InfoPanel";
import { LabelPanel } from "../components/LabelPanel";
import { StatusBar } from "../components/StatusBar";
import { ThumbnailStrip } from "../components/ThumbnailStrip";
import { Toolbar } from "../components/Toolbar";
import { useAppContext } from "../context/AppContext";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

export function ViewerPage() {
  useKeyboardShortcuts();
  const { state } = useAppContext();

  const [infoPanelWidth, setInfoPanelWidth] = useState(() =>
    parseInt(localStorage.getItem("infoPanelWidth") || "220", 10)
  );
  const [labelPanelWidth, setLabelPanelWidth] = useState(() =>
    parseInt(localStorage.getItem("labelPanelWidth") || "220", 10)
  );

  const handleResizeStart = (side: "info" | "label") => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = side === "info" ? infoPanelWidth : labelPanelWidth;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      const delta = side === "info" ? ev.clientX - startX : startX - ev.clientX;
      const newWidth = Math.max(150, Math.min(500, startWidth + delta));
      if (side === "info") {
        setInfoPanelWidth(newWidth);
        localStorage.setItem("infoPanelWidth", String(newWidth));
      } else {
        setLabelPanelWidth(newWidth);
        localStorage.setItem("labelPanelWidth", String(newWidth));
      }
    };

    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div className="viewer-page">
      <Toolbar />
      <div className="viewer-main">
        <InfoPanel width={infoPanelWidth} />
        {state.infoPanelOpen && (
          <div className="resize-handle" onMouseDown={handleResizeStart("info")} />
        )}
        <ImageViewer />
        {state.labelPanelOpen && (
          <div className="resize-handle" onMouseDown={handleResizeStart("label")} />
        )}
        <LabelPanel width={labelPanelWidth} />
      </div>
      <ThumbnailStrip />
      <StatusBar />
    </div>
  );
}
