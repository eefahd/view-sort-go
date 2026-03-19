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
} from "../../wailsjs/go/main/App";

export function Toolbar() {
  const { state, dispatch, showToast } = useAppContext();

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
    const newMode = state.viewMode === "pending" ? "all" : "pending";
    try {
      const img = await SetViewMode(newMode);
      const counts = await GetImageCounts();
      dispatch({ type: "SET_VIEW_MODE", mode: newMode });
      dispatch({ type: "SET_CURRENT_IMAGE", image: img });
      dispatch({ type: "SET_COUNTS", counts });
    } catch (err: any) {
      showToast(err?.toString() || "Failed to switch view");
    }
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
      <button
        className={`view-mode-btn${state.viewMode === "all" ? " active" : ""}`}
        onClick={handleToggleViewMode}
        disabled={!state.workingDir}
        title={state.viewMode === "pending" ? "Showing pending only" : "Showing all images"}
      >
        {state.viewMode === "pending" ? "Pending" : "All"}
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
