import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { ShortcutTable } from "../components/ShortcutTable";
import { FunctionButtonTable } from "../components/FunctionButtonTable";
import { FolderPicker } from "../components/FolderPicker";
import { models } from "../../wailsjs/go/models";
import type { ProfileActionType } from "../types";
import {
  GetProfiles,
  CreateProfile,
  DeleteProfile,
  DuplicateProfile,
  GetActiveProfile,
  UpdateProfile,
} from "../../wailsjs/go/main/App";

export function SettingsPage() {
  const { state, dispatch, showToast } = useAppContext();
  const [newProfileName, setNewProfileName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [templateInput, setTemplateInput] = useState("");

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

  const handleDuplicateProfile = async (id: string, name: string) => {
    try {
      await DuplicateProfile(id);
      await refreshProfiles();
      showToast(`Profile "${name}" duplicated`);
    } catch (err: any) {
      showToast(err?.toString() || "Failed to duplicate profile");
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

  // Sync local template input when the active profile changes
  useEffect(() => {
    setTemplateInput(activeProfile?.labelSubfolderTemplate || "");
  }, [activeProfile?.id, activeProfile?.labelSubfolderTemplate]);


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
                  className="edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicateProfile(p.id, p.name);
                  }}
                  title="Duplicate profile"
                >
                  Duplicate
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
          <h3>Shortcuts for "{activeProfile.name}"</h3>

          <div className="profile-option-row">
            <span>Action type:</span>
            <select
              value={activeProfile.actionType || "custom"}
              onChange={async (e) => {
                const updated = new models.Profile({
                  ...activeProfile,
                  actionType: e.target.value as ProfileActionType,
                });
                await UpdateProfile(updated);
                await refreshProfiles();
              }}
            >
              <option value="copy">Copy</option>
              <option value="move">Move</option>
              <option value="label">Label</option>
              <option value="custom">Custom (per shortcut)</option>
            </select>
          </div>

          {activeProfile.actionType === "label" && (
            <>
              <div className="profile-option-row">
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

              <div className="profile-option-row">
                <span>Output directory:</span>
                <FolderPicker
                  value={activeProfile.labelOutputDir || ""}
                  onChange={async (path) => {
                    const updated = new models.Profile({
                      ...activeProfile,
                      labelOutputDir: path,
                    });
                    await UpdateProfile(updated);
                    await refreshProfiles();
                  }}
                  onClear={async () => {
                    const updated = new models.Profile({
                      ...activeProfile,
                      labelOutputDir: "",
                    });
                    await UpdateProfile(updated);
                    await refreshProfiles();
                  }}
                />
              </div>

              <div className="profile-option-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                <span>Sub-folder template:</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                  <input
                    type="text"
                    style={{ flex: 1, fontSize: 13 }}
                    value={templateInput}
                    placeholder="e.g. {parent1}  or  {parent2}/{parent1}"
                    onChange={(e) => setTemplateInput(e.target.value)}
                    onBlur={async () => {
                      const updated = new models.Profile({
                        ...activeProfile,
                        labelSubfolderTemplate: templateInput,
                      });
                      await UpdateProfile(updated);
                      await refreshProfiles();
                    }}
                  />
                </div>
                <span className="muted" style={{ fontSize: 11 }}>
                  {"Use {parent1} = immediate parent, {parent2} = grandparent, … Leave empty for flat output."}
                </span>
              </div>
            </>
          )}

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

      {activeProfile && (
        <section className="settings-section">
          <h3>Extra Image (Debug) for "{activeProfile.name}"</h3>
          <p className="muted" style={{ marginBottom: 8, fontSize: 12 }}>
            Show a linked image side-by-side for debugging. The linked image is resolved by
            walking up the current image's path by the specified depth, then looking under
            the extra image root for a file with the same stem.
          </p>
          <div className="profile-option-row">
            <span>Extra image root:</span>
            <FolderPicker
              value={activeProfile.extraImageRoot || ""}
              onChange={async (path) => {
                const updated = new models.Profile({
                  ...activeProfile,
                  extraImageRoot: path,
                });
                await UpdateProfile(updated);
                await refreshProfiles();
              }}
              onClear={async () => {
                const updated = new models.Profile({
                  ...activeProfile,
                  extraImageRoot: "",
                });
                await UpdateProfile(updated);
                await refreshProfiles();
              }}
            />
          </div>
          <div className="profile-option-row">
            <span>Parent depth:</span>
            <input
              type="number"
              min={1}
              max={10}
              style={{ width: 60 }}
              value={activeProfile.extraImageLinkDepth || 1}
              onChange={async (e) => {
                const depth = parseInt(e.target.value, 10);
                if (isNaN(depth) || depth < 1) return;
                const updated = new models.Profile({
                  ...activeProfile,
                  extraImageLinkDepth: depth,
                });
                await UpdateProfile(updated);
                await refreshProfiles();
              }}
            />
            <span className="muted" style={{ fontSize: 11 }}>
              levels up from image to find the matching folder under extra image root
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
