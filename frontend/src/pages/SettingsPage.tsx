import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { ShortcutTable } from "../components/ShortcutTable";
import {
  GetProfiles,
  CreateProfile,
  DeleteProfile,
  GetActiveProfile,
} from "../../wailsjs/go/main/App";

export function SettingsPage() {
  const { state, dispatch, showToast } = useAppContext();
  const [newProfileName, setNewProfileName] = useState("");

  const refreshProfiles = async () => {
    const profiles = await GetProfiles();
    dispatch({ type: "SET_PROFILES", profiles: profiles || [] });
    const active = await GetActiveProfile();
    if (active) {
      dispatch({ type: "SET_ACTIVE_PROFILE_ID", id: active.id });
    }
  };

  const handleCreateProfile = async () => {
    const name = newProfileName.trim();
    if (!name) return;
    try {
      await CreateProfile(name);
      setNewProfileName("");
      await refreshProfiles();
      showToast(`Profile "${name}" created`);
    } catch (err: any) {
      showToast(err?.toString() || "Failed to create profile");
    }
  };

  const handleDeleteProfile = async (id: string, name: string) => {
    try {
      await DeleteProfile(id);
      await refreshProfiles();
      showToast(`Profile "${name}" deleted`);
    } catch (err: any) {
      showToast(err?.toString() || "Failed to delete profile");
    }
  };

  const handleBack = () => {
    dispatch({ type: "SET_PAGE", page: "viewer" });
  };

  const activeProfile = state.profiles.find(
    (p) => p.id === state.activeProfileId
  );

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button onClick={handleBack}>Back</button>
        <h2>Settings</h2>
      </div>

      <section className="settings-section">
        <h3>Profiles</h3>
        <div className="profile-create">
          <input
            type="text"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder="New profile name..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateProfile();
            }}
          />
          <button onClick={handleCreateProfile}>Create</button>
        </div>
        <div className="profile-list">
          {state.profiles.map((p) => (
            <div
              key={p.id}
              className={`profile-item ${p.id === state.activeProfileId ? "active" : ""}`}
            >
              <span>{p.name}</span>
              <button
                className="remove-btn"
                onClick={() => handleDeleteProfile(p.id, p.name)}
              >
                Delete
              </button>
            </div>
          ))}
          {state.profiles.length === 0 && (
            <p className="muted">No profiles yet. Create one above.</p>
          )}
        </div>
      </section>

      {activeProfile && (
        <section className="settings-section">
          <h3>
            Shortcuts for "{activeProfile.name}"
          </h3>
          <ShortcutTable
            profile={activeProfile}
            onProfileUpdated={refreshProfiles}
          />
        </section>
      )}
    </div>
  );
}
