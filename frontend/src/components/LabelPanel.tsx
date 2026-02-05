import { useAppContext } from "../context/AppContext";
import {
  ExecuteShortcut,
  GetImageCounts,
  GetUndoCount,
} from "../../wailsjs/go/main/App";

export function LabelPanel() {
  const { state, dispatch, showToast } = useAppContext();

  const activeProfile = state.profiles.find(
    (p) => p.id === state.activeProfileId
  );

  const handleClick = async (key: string) => {
    if (!state.workingDir || !state.currentImage) return;
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
        {activeProfile.shortcuts.map((s, i) => (
          <button
            key={i}
            className="shortcut-btn"
            onClick={() => handleClick(s.key)}
            title={`${s.action} to ${s.destination || "(no destination)"}`}
          >
            <kbd>{s.key}</kbd>
            <span>{s.label || s.key}</span>
            <span className={`action-badge ${s.action}`}>{s.action}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
