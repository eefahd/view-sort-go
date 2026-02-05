import { ImageViewer } from "../components/ImageViewer";
import { LabelPanel } from "../components/LabelPanel";
import { StatusBar } from "../components/StatusBar";
import { Toolbar } from "../components/Toolbar";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

export function ViewerPage() {
  useKeyboardShortcuts();

  return (
    <div className="viewer-page">
      <Toolbar />
      <div className="viewer-main">
        <ImageViewer />
        <LabelPanel />
      </div>
      <StatusBar />
    </div>
  );
}
