import { useState, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { ProfileSelector } from "./ProfileSelector";
import {
  SelectWorkingDirectory,
  GetCurrentImageInfo,
  GetImageCounts,
  GetUndoCount,
  Undo,
  ResetAnnotations,
  NextImage,
  PreviousImage,
  SetViewMode,
  ExecuteFunctionButton,
  GetAvailableLabels,
  SetLabelFilter,
  GoToFilename,
} from "../../wailsjs/go/main/App";

export function Toolbar() {
  const { state, dispatch, showToast } = useAppContext();
  const [showLabelFilter, setShowLabelFilter] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [showGoTo, setShowGoTo] = useState(false);
  const [goToInput, setGoToInput] = useState("");
  const labelInputRef = useRef<HTMLInputElement>(null);
  const goToInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFolder = async () => {
    try {
      const dir = await SelectWorkingDirectory();
      if (!dir) return;
      dispatch({ type: "SET_WORKING_DIR", dir });
      const img = await GetCurrentImageInfo();
      const counts = await GetImageCounts();
      const undoCount = await GetUndoCount();
      dispatch({ type: "REFRESH_STATE", image: img, counts, undoCount });
    } catch (err: any) {
      showToast(err?.toString() || "Failed to open folder");
    }
  };

  const handleUndo = async () => {
    try {
      const img = await Undo();
      const counts = await GetImageCounts();
      const undoCount = await GetUndoCount();
      dispatch({ type: "REFRESH_STATE", image: img, counts, undoCount });
      showToast("Undo successful");
    } catch (err: any) {
      showToast(err?.toString() || "Undo failed");
    }
  };

  const handlePrev = async () => {
    try {
      const img = await PreviousImage();
      dispatch({ type: "SET_CURRENT_IMAGE", image: img });
    } catch (err: any) {
      showToast(err?.toString() || "Navigation failed");
    }
  };

  const handleNext = async () => {
    try {
      const img = await NextImage();
      dispatch({ type: "SET_CURRENT_IMAGE", image: img });
    } catch (err: any) {
      showToast(err?.toString() || "Navigation failed");
    }
  };

  const handleToggleViewMode = async () => {
    // If label filter is active, clear it and go to pending; otherwise toggle pending/all
    const newMode = state.viewMode === "all" ? "pending" : "all";
    try {
      if (state.viewMode === "label") {
        const img = await SetLabelFilter("");
        const counts = await GetImageCounts();
        dispatch({ type: "SET_LABEL_FILTER", label: "" });
        dispatch({ type: "SET_CURRENT_IMAGE", image: img });
        dispatch({ type: "SET_COUNTS", counts });
      } else {
        const img = await SetViewMode(newMode);
        const counts = await GetImageCounts();
        dispatch({ type: "SET_VIEW_MODE", mode: newMode });
        dispatch({ type: "SET_CURRENT_IMAGE", image: img });
        dispatch({ type: "SET_COUNTS", counts });
      }
    } catch (err: any) {
      showToast(err?.toString() || "Failed to switch view");
    }
  };

  const handleOpenLabelFilter = async () => {
    if (state.viewMode === "label") {
      // Clear the filter
      try {
        const img = await SetLabelFilter("");
        const counts = await GetImageCounts();
        dispatch({ type: "SET_LABEL_FILTER", label: "" });
        dispatch({ type: "SET_CURRENT_IMAGE", image: img });
        dispatch({ type: "SET_COUNTS", counts });
      } catch (err: any) {
        showToast(err?.toString() || "Failed to clear filter");
      }
      setShowLabelFilter(false);
      setLabelInput("");
      return;
    }
    try {
      const labels = await GetAvailableLabels();
      setAvailableLabels(labels);
    } catch {
      setAvailableLabels([]);
    }
    setShowLabelFilter(true);
    setTimeout(() => labelInputRef.current?.focus(), 0);
  };

  const handleApplyLabelFilter = async (label: string) => {
    if (!label.trim()) return;
    try {
      const img = await SetLabelFilter(label.trim());
      const counts = await GetImageCounts();
      dispatch({ type: "SET_LABEL_FILTER", label: label.trim() });
      dispatch({ type: "SET_CURRENT_IMAGE", image: img });
      dispatch({ type: "SET_COUNTS", counts });
      setShowLabelFilter(false);
      setLabelInput("");
    } catch (err: any) {
      showToast(err?.toString() || "Failed to apply label filter");
    }
  };

  const handleGoTo = () => {
    setShowGoTo(true);
    setTimeout(() => goToInputRef.current?.focus(), 0);
  };

  const handleGoToSubmit = async () => {
    const name = goToInput.trim();
    if (!name) {
      setShowGoTo(false);
      return;
    }
    try {
      const img = await GoToFilename(name);
      if (img) {
        dispatch({ type: "SET_CURRENT_IMAGE", image: img });
      } else {
        showToast(`"${name}" not found in current view`);
      }
    } catch (err: any) {
      showToast(err?.toString() || "Navigation failed");
    }
    setShowGoTo(false);
    setGoToInput("");
  };

  const handleFunctionButton = async (index: number) => {
    try {
      await ExecuteFunctionButton(index);
    } catch (err: any) {
      showToast(err?.toString() || "Command failed");
    }
  };

  const handleResetAnnotations = async () => {
    if (!window.confirm("Reset annotation progress for this folder?\n\nThe .annotations.json file will be deleted. This cannot be undone.")) return;
    try {
      await ResetAnnotations();
      showToast("Annotation progress reset. Reopen the folder to start fresh.");
    } catch (err: any) {
      showToast(err?.toString() || "Reset failed");
    }
  };

  const handleSettings = () => {
    dispatch({ type: "SET_PAGE", page: "settings" });
  };

  const activeProfile = state.profiles.find(
    (p) => p.id === state.activeProfileId
  );
  const functionButtons = activeProfile?.functionButtons || [];

  return (
    <div className="toolbar">
      <button onClick={handleSelectFolder}>Open Folder</button>
      <ProfileSelector />
      <button
        onClick={handlePrev}
        disabled={!state.currentImage || state.currentImage.index === 0}
        title="Previous image"
      >
        &lt;
      </button>
      <button
        onClick={handleNext}
        disabled={
          !state.currentImage ||
          state.currentImage.index >= state.currentImage.total - 1
        }
        title="Next image"
      >
        &gt;
      </button>
      {functionButtons.map((fb, i) => (
        <button
          key={i}
          className="fn-btn"
          onClick={() => handleFunctionButton(i)}
          disabled={!state.currentImage}
          title={fb.command}
        >
          {fb.label}
        </button>
      ))}
      <div className="toolbar-spacer" />
      {/* Label filter control */}
      {showLabelFilter ? (
        <div className="toolbar-filter-group">
          <input
            ref={labelInputRef}
            className="toolbar-filter-input"
            list="label-filter-list"
            placeholder="Label name…"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApplyLabelFilter(labelInput);
              if (e.key === "Escape") { setShowLabelFilter(false); setLabelInput(""); }
            }}
          />
          <datalist id="label-filter-list">
            {availableLabels.map((l) => <option key={l} value={l} />)}
          </datalist>
          <button onClick={() => handleApplyLabelFilter(labelInput)} disabled={!labelInput.trim()}>Go</button>
          <button onClick={() => { setShowLabelFilter(false); setLabelInput(""); }}>✕</button>
        </div>
      ) : state.viewMode === "label" ? (
        <button
          className="view-mode-btn active"
          onClick={handleOpenLabelFilter}
          title="Clear label filter"
        >
          Label: {state.labelFilter} ✕
        </button>
      ) : (
        <button
          className="view-mode-btn"
          onClick={handleOpenLabelFilter}
          disabled={!state.workingDir}
          title="Filter by label"
        >
          Label ▾
        </button>
      )}
      {/* Go-to-filename control */}
      {showGoTo ? (
        <div className="toolbar-filter-group">
          <input
            ref={goToInputRef}
            className="toolbar-filter-input"
            placeholder="Filename…"
            value={goToInput}
            onChange={(e) => setGoToInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleGoToSubmit();
              if (e.key === "Escape") { setShowGoTo(false); setGoToInput(""); }
            }}
          />
          <button onClick={handleGoToSubmit} disabled={!goToInput.trim()}>Go</button>
          <button onClick={() => { setShowGoTo(false); setGoToInput(""); }}>✕</button>
        </div>
      ) : (
        <button
          className="view-mode-btn"
          onClick={handleGoTo}
          disabled={!state.workingDir}
          title="Jump to image by filename"
        >
          Go to…
        </button>
      )}
      <button
        className={`view-mode-btn${state.viewMode === "all" ? " active" : ""}`}
        onClick={handleToggleViewMode}
        disabled={!state.workingDir}
        title={
          state.viewMode === "label"
            ? "Clear label filter"
            : state.viewMode === "pending"
            ? "Showing pending only"
            : "Showing all images"
        }
      >
        {state.viewMode === "label" ? "Pending" : state.viewMode === "pending" ? "Pending" : "All"}
      </button>
      <button onClick={handleUndo} disabled={state.undoCount === 0}>
        Undo ({state.undoCount})
      </button>
      <button
        onClick={handleResetAnnotations}
        disabled={!state.workingDir}
        title="Reset all annotation progress for this folder"
      >
        Reset
      </button>
      <button onClick={handleSettings}>Settings</button>
    </div>
  );
}
