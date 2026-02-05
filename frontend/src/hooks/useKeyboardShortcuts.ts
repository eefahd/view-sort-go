import { useEffect, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import {
  ExecuteShortcut,
  Undo,
  GetImageCounts,
  GetUndoCount,
  NextImage,
  PreviousImage,
} from "../../wailsjs/go/main/App";

export function useKeyboardShortcuts() {
  const { state, dispatch, showToast } = useAppContext();
  const busyRef = useRef(false);

  useEffect(() => {
    async function handleKeyDown(e: KeyboardEvent) {
      // Skip if focused on an input element
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Ctrl+Z = undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (busyRef.current) return;
        busyRef.current = true;
        try {
          const img = await Undo();
          const counts = await GetImageCounts();
          const undoCount = await GetUndoCount();
          dispatch({
            type: "REFRESH_STATE",
            image: img,
            counts,
            undoCount,
          });
          showToast("Undo successful");
        } catch (err: any) {
          showToast(err?.toString() || "Undo failed");
        } finally {
          busyRef.current = false;
        }
        return;
      }

      // Arrow keys for navigation
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const img = await NextImage();
        if (img) dispatch({ type: "SET_CURRENT_IMAGE", image: img });
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const img = await PreviousImage();
        if (img) dispatch({ type: "SET_CURRENT_IMAGE", image: img });
        return;
      }

      // Skip modifier combos (except the ones above)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Single character = shortcut execution
      if (e.key.length === 1 && state.workingDir) {
        if (busyRef.current) return;
        busyRef.current = true;
        try {
          const img = await ExecuteShortcut(e.key);
          const counts = await GetImageCounts();
          const undoCount = await GetUndoCount();
          dispatch({
            type: "REFRESH_STATE",
            image: img,
            counts,
            undoCount,
          });
        } catch (err: any) {
          // Not every key is a shortcut - silently ignore "no shortcut bound" errors
          if (!err?.toString()?.includes("no shortcut bound")) {
            showToast(err?.toString() || "Action failed");
          }
        } finally {
          busyRef.current = false;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.workingDir, dispatch, showToast]);
}
