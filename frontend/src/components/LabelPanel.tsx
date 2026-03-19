import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { models } from "../../wailsjs/go/models";
import {
  ExecuteShortcut,
  ExecuteShortcutByIndex,
  ExecuteMultiLabel,
  GetImageCounts,
  GetUndoCount,
  GetImageLabels,
  UpdateProfile,
  GetProfiles,
  GetActiveProfile,
} from "../../wailsjs/go/main/App";

export function LabelPanel({ width }: { width?: number }) {
  const { state, dispatch, showToast } = useAppContext();
  const [currentLabels, setCurrentLabels] = useState<string[]>([]);
  const [newLabelName, setNewLabelName] = useState("");

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
  const isProfileLabelMode = activeProfile?.actionType === "label";

  const refreshProfiles = async () => {
    const profiles = await GetProfiles();
    dispatch({ type: "SET_PROFILES", profiles: profiles || [] });
    const active = await GetActiveProfile();
    if (active) dispatch({ type: "SET_ACTIVE_PROFILE_ID", id: active.id });
  };

  const handleClick = async (index: number, key: string, action: string) => {
    if (!state.workingDir || !state.currentImage) return;

    const effectiveAction = isProfileLabelMode ? "label" : action;

    if (isMultiLabel && effectiveAction === "label") {
      if (key) {
        dispatch({ type: "TOGGLE_LABEL", key });
      }
      return;
    }

    try {
      const img = key
        ? await ExecuteShortcut(key)
        : await ExecuteShortcutByIndex(index);
      const counts = await GetImageCounts();
      const undoCount = await GetUndoCount();
      dispatch({ type: "REFRESH_STATE", image: img, counts, undoCount });
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
      dispatch({ type: "REFRESH_STATE", image: img, counts, undoCount });
    } catch (err: any) {
      showToast(err?.toString() || "Label failed");
    }
  };

  const handleAddLabel = async () => {
    const name = newLabelName.trim();
    if (!name || !activeProfile) return;
    const newShortcut = new models.Shortcut({
      label: name,
      key: "",
      action: "label",
      destination: "",
    });
    const updated = new models.Profile({
      ...activeProfile,
      shortcuts: [...(activeProfile.shortcuts || []), newShortcut],
    });
    try {
      await UpdateProfile(updated);
      await refreshProfiles();
      setNewLabelName("");
    } catch (err: any) {
      showToast(err?.toString() || "Failed to add label");
    }
  };

  if (!state.labelPanelOpen) {
    return (
      <div
        className="panel-collapsed panel-collapsed-right"
        onClick={() => dispatch({ type: "TOGGLE_LABEL_PANEL" })}
        title="Show shortcuts"
        style={{ cursor: "pointer" }}
      >
        <span className="panel-toggle-btn">‹</span>
        <span className="panel-collapsed-label">Shortcuts</span>
      </div>
    );
  }

  return (
    <div className="label-panel" style={width ? { width, minWidth: width } : undefined}>
      <div className="panel-header" onClick={() => dispatch({ type: "TOGGLE_LABEL_PANEL" })} title="Collapse">
        <h3>Shortcuts</h3>
        <span className="panel-toggle-btn">›</span>
      </div>

      {(!activeProfile || activeProfile.shortcuts.length === 0) ? (
        <p className="muted">No shortcuts configured. Go to Settings to add some.</p>
      ) : (
        <>
          <div className="shortcut-list">
            {activeProfile.shortcuts.map((s, i) => {
              const isPending = isMultiLabel && s.key && state.pendingLabels.includes(s.key);
              const effectiveAction = isProfileLabelMode ? "label" : s.action;
              const destName = s.destination ? s.destination.split("/").pop() || "" : "";
              const labelName = isProfileLabelMode ? s.label : destName;
              const isApplied = effectiveAction === "label" && labelName && currentLabels.includes(labelName);
              return (
                <button
                  key={i}
                  className={`shortcut-btn${isPending ? " selected" : ""}${isApplied ? " applied" : ""}`}
                  onClick={() => handleClick(i, s.key, s.action)}
                  title={isProfileLabelMode ? s.label : `${s.action} to ${s.destination || "(no destination)"}`}
                >
                  {s.key && <kbd>{s.key}</kbd>}
                  <span>{s.label || s.key}</span>
                  {!isProfileLabelMode && (
                    <span className={`action-badge ${s.action}`}>{s.action}</span>
                  )}
                </button>
              );
            })}
          </div>
          {isMultiLabel && state.pendingLabels.length > 0 && (
            <button className="confirm-btn" onClick={handleConfirm}>
              Confirm ({state.pendingLabels.length}) ↵
            </button>
          )}
        </>
      )}

      {isProfileLabelMode && (
        <div className="quick-add-label">
          <input
            type="text"
            value={newLabelName}
            placeholder="New label..."
            onChange={(e) => setNewLabelName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddLabel();
            }}
          />
          <button onClick={handleAddLabel} disabled={!newLabelName.trim()}>+</button>
        </div>
      )}
    </div>
  );
}
