import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { ShortcutTable } from "../components/ShortcutTable";
import { FunctionButtonTable } from "../components/FunctionButtonTable";
import { models } from "../../wailsjs/go/models";
import {
  GetProfiles,
  CreateProfile,
  DeleteProfile,
  GetActiveProfile,
  UpdateProfile,
} from "../../wailsjs/go/main/App";

export function SettingsPage() {
  const { state, dispatch, showToast } = useAppContext();
  const [newProfileName, setNewProfileName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

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

  const handleSelectProfile = (id: string) => {
    dispatch({ type: "SET_ACTIVE_PROFILE_ID", id });
  };

  const handleStartRename = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleFinishRename = async (profile: models.Profile) => {
    const name = editingName.trim();
    if (!name || name === profile.name) {
      setEditingId(null);
      return;
    }
    try {
      const updated = new models.Profile({ ...profile, name });
      await UpdateProfile(updated);
      await refreshProfiles();
    } catch (err: any) {
      showToast(err?.toString() || "Failed to rename");
    }
    setEditingId(null);
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
              onClick={() => handleSelectProfile(p.id)}
            >
              {editingId === p.id ? (
                <input
                  className="profile-rename-input"
                  type="text"
                  value={editingName}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFinishRename(p);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={() => handleFinishRename(p)}
                />
              ) : (
                <span>{p.name}</span>
              )}
              <div className="profile-actions">
                <button
                  className="edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartRename(p.id, p.name);
                  }}
                  title="Rename profile"
                >
                  Rename
                </button>
                <button
                  className="remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProfile(p.id, p.name);
                  }}
                >
                  Delete
                </button>
              </div>
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
          <div className="label-mode-selector">
            <span>Label mode:</span>
            <label>
              <input
                type="radio"
                name="labelMode"
                value="single"
                checked={activeProfile.labelMode !== "multi"}
                onChange={async () => {
                  const updated = new models.Profile({
                    ...activeProfile,
                    labelMode: "single",
                  });
                  await UpdateProfile(updated);
                  await refreshProfiles();
                }}
              />
              Single
            </label>
            <label>
              <input
                type="radio"
                name="labelMode"
                value="multi"
                checked={activeProfile.labelMode === "multi"}
                onChange={async () => {
                  const updated = new models.Profile({
                    ...activeProfile,
                    labelMode: "multi",
                  });
                  await UpdateProfile(updated);
                  await refreshProfiles();
                }}
              />
              Multi
            </label>
          </div>
          <ShortcutTable
            profile={activeProfile}
            onProfileUpdated={refreshProfiles}
          />
        </section>
      )}

      {activeProfile && (
        <section className="settings-section">
          <h3>
            Function Buttons for "{activeProfile.name}"
          </h3>
          <p className="muted" style={{ marginBottom: 8, fontSize: 12 }}>
            Use <code>$image_path</code> in commands as a placeholder for the current image path.
          </p>
          <FunctionButtonTable
            profile={activeProfile}
            onProfileUpdated={refreshProfiles}
          />
        </section>
      )}
    </div>
  );
}
