import { useEffect } from "react";
import { AppProvider, useAppContext } from "./context/AppContext";
import { ViewerPage } from "./pages/ViewerPage";
import { SettingsPage } from "./pages/SettingsPage";
import {
  GetProfiles,
  GetActiveProfile,
  GetLastWorkingDir,
  SetWorkingDirectory,
  GetCurrentImageInfo,
  GetImageCounts,
  GetUndoCount,
  GetInitialFile,
  OpenImageFile,
} from "../wailsjs/go/main/App";
import { EventsOn } from "../wailsjs/runtime/runtime";
import "./App.css";

function AppContent() {
  const { state, dispatch } = useAppContext();

  const openFile = async (filePath: string) => {
    try {
      await OpenImageFile(filePath);
      const dir = filePath.substring(0, filePath.lastIndexOf("/"));
      dispatch({ type: "SET_WORKING_DIR", dir });
      const img = await GetCurrentImageInfo();
      const counts = await GetImageCounts();
      const undoCount = await GetUndoCount();
      dispatch({ type: "REFRESH_STATE", image: img, counts, undoCount });
    } catch (e) {
      console.error("Failed to open file:", e);
    }
  };

  useEffect(() => {
    async function init() {
      // Load profiles
      const profiles = await GetProfiles();
      dispatch({ type: "SET_PROFILES", profiles: profiles || [] });

      const active = await GetActiveProfile();
      if (active) {
        dispatch({ type: "SET_ACTIVE_PROFILE_ID", id: active.id });
      }

      // Check if the app was launched with a specific file (CLI arg or early file open event)
      const initialFile = await GetInitialFile();
      if (initialFile) {
        await openFile(initialFile);
        return;
      }

      // Restore last working directory
      const lastDir = await GetLastWorkingDir();
      if (lastDir) {
        try {
          await SetWorkingDirectory(lastDir);
          dispatch({ type: "SET_WORKING_DIR", dir: lastDir });
          const img = await GetCurrentImageInfo();
          const counts = await GetImageCounts();
          const undoCount = await GetUndoCount();
          dispatch({ type: "REFRESH_STATE", image: img, counts, undoCount });
        } catch {
          // Directory may no longer exist
        }
      }
    }
    init();

    // Listen for file open events fired when user opens a file while app is already running
    const unsubscribe = EventsOn("open-file", (filePath: string) => {
      openFile(filePath);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="app">
      {state.page === "viewer" ? <ViewerPage /> : <SettingsPage />}
      {state.toast && <div className="toast">{state.toast}</div>}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
