import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import {
  ExecuteShortcut,
  ExecuteMultiLabel,
  GetImageCounts,
  GetUndoCount,
  GetImageLabels,
} from "../../wailsjs/go/main/App";

export function LabelPanel() {
  const { state, dispatch, showToast } = useAppContext();
  const [currentLabels, setCurrentLabels] = useState<string[]>([]);

  // Fetch annotation labels for the current image
  useEffect(() => {
    if (!state.currentImage) {
      setCurrentLabels([]);
      return;
    }
    GetImageLabels(state.currentImage.filename).then((labels) => {
      setCurrentLabels(labels || []);
    });
  }, [state.currentImage?.filename, state.currentImage?.index]);

  const activeProfile = state.profiles.find(
    (p) => p.id === state.activeProfileId
  );

  const isMultiLabel = activeProfile?.labelMode === "multi";

  const handleClick = async (key: string, action: string) => {
    if (!state.workingDir || !state.currentImage) return;

    // Multi-label: toggle label shortcuts
    if (isMultiLabel && action === "label") {
      dispatch({ type: "TOGGLE_LABEL", key });
      return;
    }

    try {
      const img = await ExecuteShortcut(key);
      const counts = await GetImageCounts();
      const undoCount = await GetUndoCount();
      dispatch({
        type: "REFRESH_STATE",
        image: img,
        counts,
        undoCount,
      });
    } catch (err: any) {
      showToast(err?.toString() || "Action failed");
    }
  };

  const handleConfirm = async () => {
    if (state.pendingLabels.length === 0) return;
    try {
      const img = await ExecuteMultiLabel(state.pendingLabels);
      const counts = await GetImageCounts();
      const undoCount = await GetUndoCount();
      dispatch({ type: "CLEAR_LABELS" });
      dispatch({
        type: "REFRESH_STATE",
        image: img,
        counts,
        undoCount,
      });
    } catch (err: any) {
      showToast(err?.toString() || "Label failed");
    }
  };

  if (!activeProfile || activeProfile.shortcuts.length === 0) {
    return (
      <div className="label-panel">
        <h3>Shortcuts</h3>
        <p className="muted">
          No shortcuts configured. Go to Settings to add some.
        </p>
      </div>
    );
  }

  return (
    <div className="label-panel">
      <h3>Shortcuts</h3>
      <div className="shortcut-list">
        {activeProfile.shortcuts.map((s, i) => {
          const isPending = isMultiLabel && state.pendingLabels.includes(s.key);
          const destName = s.destination ? s.destination.split("/").pop() || "" : "";
          const isApplied = s.action === "label" && currentLabels.includes(destName);
          return (
            <button
              key={i}
              className={`shortcut-btn${isPending ? " selected" : ""}${isApplied ? " applied" : ""}`}
              onClick={() => handleClick(s.key, s.action)}
              title={`${s.action} to ${s.destination || "(no destination)"}`}
            >
              <kbd>{s.key}</kbd>
              <span>{s.label || s.key}</span>
              <span className={`action-badge ${s.action}`}>{s.action}</span>
            </button>
          );
        })}
      </div>
      {isMultiLabel && state.pendingLabels.length > 0 && (
        <button className="confirm-btn" onClick={handleConfirm}>
          Confirm ({state.pendingLabels.length}) ↵
        </button>
      )}
    </div>
  );
}
