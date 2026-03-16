import { ImageViewer } from "../components/ImageViewer";
import { InfoPanel } from "../components/InfoPanel";
import { LabelPanel } from "../components/LabelPanel";
import { StatusBar } from "../components/StatusBar";
import { ThumbnailStrip } from "../components/ThumbnailStrip";
import { Toolbar } from "../components/Toolbar";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

export function ViewerPage() {
  useKeyboardShortcuts();

  return (
    <div className="viewer-page">
      <Toolbar />
      <div className="viewer-main">
        <InfoPanel />
        <ImageViewer />
        <LabelPanel />
      </div>
      <ThumbnailStrip />
      <StatusBar />
    </div>
  );
}
