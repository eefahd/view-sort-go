import { useAppContext } from "../context/AppContext";
import { ProfileSelector } from "./ProfileSelector";
import {
  SelectWorkingDirectory,
  GetCurrentImageInfo,
  GetImageCounts,
  GetUndoCount,
  Undo,
  NextImage,
  PreviousImage,
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

  const handleSettings = () => {
    dispatch({ type: "SET_PAGE", page: "settings" });
  };

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
      <div className="toolbar-spacer" />
      <button onClick={handleUndo} disabled={state.undoCount === 0}>
        Undo ({state.undoCount})
      </button>
      <button onClick={handleSettings}>Settings</button>
    </div>
  );
}
