import { useAppContext } from "../context/AppContext";

export function StatusBar() {
  const { state } = useAppContext();

  return (
    <div className="status-bar">
      <span className="filename">
        {state.currentImage?.filename || "No image"}
      </span>
      <span className="separator">|</span>
      <span>{state.counts.remaining} remaining</span>
      <span className="separator">|</span>
      <span>{state.counts.processed} processed</span>
      <span className="separator">|</span>
      <span>Undo ({state.undoCount})</span>
    </div>
  );
}
