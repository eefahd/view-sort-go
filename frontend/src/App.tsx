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
} from "../wailsjs/go/main/App";
import "./App.css";

function AppContent() {
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    async function init() {
      // Load profiles
      const profiles = await GetProfiles();
      dispatch({ type: "SET_PROFILES", profiles: profiles || [] });

      const active = await GetActiveProfile();
      if (active) {
        dispatch({ type: "SET_ACTIVE_PROFILE_ID", id: active.id });
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
