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

type Tab = "general" | "shortcuts" | "buttons" | "debug";

export function SettingsPage() {
  const { state, dispatch, showToast } = useAppContext();
  const [newProfileName, setNewProfileName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [templateInput, setTemplateInput] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("general");

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

  useEffect(() => {
    setTemplateInput(activeProfile?.labelSubfolderTemplate || "");
  }, [activeProfile?.id, activeProfile?.labelSubfolderTemplate]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "shortcuts", label: "Labels" },
    { id: "buttons", label: "Custom Buttons" },
    { id: "debug", label: "Debug" },
  ];

  return (
    <div className="settings-page">
      {/* Sidebar */}
      <aside className="settings-sidebar">
        <div className="settings-sidebar-header">
          <button className="settings-back-btn" onClick={handleBack} title="Back">
            ←
          </button>
          <span className="settings-sidebar-title">Profiles</span>
        </div>

        <div className="settings-profile-list">
          {state.profiles.map((p) => (
            <div
              key={p.id}
              className={`settings-profile-item${p.id === state.activeProfileId ? " active" : ""}`}
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
                <span className="settings-profile-name">{p.name}</span>
              )}
              <div className="settings-profile-actions">
                <button
                  title="Rename"
                  onClick={(e) => { e.stopPropagation(); handleStartRename(p.id, p.name); }}
                >
                  ✎
                </button>
                <button
                  title="Duplicate"
                  onClick={(e) => { e.stopPropagation(); handleDuplicateProfile(p.id, p.name); }}
                >
                  ⧉
                </button>
                <button
                  title="Delete"
                  className="danger"
                  onClick={(e) => { e.stopPropagation(); handleDeleteProfile(p.id, p.name); }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {state.profiles.length === 0 && (
            <p className="settings-empty">No profiles yet.</p>
          )}
        </div>

        <div className="settings-create-profile">
          <input
            type="text"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder="New profile name…"
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateProfile(); }}
          />
          <button onClick={handleCreateProfile} disabled={!newProfileName.trim()}>
            +
          </button>
        </div>
      </aside>

      {/* Main panel */}
      <div className="settings-main">
        {activeProfile ? (
          <>
            <div className="settings-profile-heading">
              <span>{activeProfile.name}</span>
            </div>

            {/* Tab bar */}
            <div className="settings-tabs">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  className={`settings-tab${activeTab === t.id ? " active" : ""}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="settings-tab-content">

              {activeTab === "general" && (
                <div className="settings-form">
                  <div className="settings-field">
                    <label className="settings-label">Action type</label>
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
                      <div className="settings-divider" />

                      <div className="settings-field">
                        <label className="settings-label">Label mode</label>
                        <div className="settings-radio-group">
                          <label>
                            <input
                              type="radio"
                              name="labelMode"
                              value="single"
                              checked={activeProfile.labelMode !== "multi"}
                              onChange={async () => {
                                const updated = new models.Profile({ ...activeProfile, labelMode: "single" });
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
                                const updated = new models.Profile({ ...activeProfile, labelMode: "multi" });
                                await UpdateProfile(updated);
                                await refreshProfiles();
                              }}
                            />
                            Multi
                          </label>
                        </div>
                      </div>

                      <div className="settings-field">
                        <label className="settings-label">Output directory</label>
                        <FolderPicker
                          value={activeProfile.labelOutputDir || ""}
                          onChange={async (path) => {
                            const updated = new models.Profile({ ...activeProfile, labelOutputDir: path });
                            await UpdateProfile(updated);
                            await refreshProfiles();
                          }}
                          onClear={async () => {
                            const updated = new models.Profile({ ...activeProfile, labelOutputDir: "" });
                            await UpdateProfile(updated);
                            await refreshProfiles();
                          }}
                        />
                      </div>

                      <div className="settings-field settings-field--col">
                        <label className="settings-label">Sub-folder template</label>
                        <input
                          type="text"
                          value={templateInput}
                          placeholder="e.g. {parent1}  or  {parent2}/{parent1}"
                          onChange={(e) => setTemplateInput(e.target.value)}
                          onBlur={async () => {
                            const updated = new models.Profile({ ...activeProfile, labelSubfolderTemplate: templateInput });
                            await UpdateProfile(updated);
                            await refreshProfiles();
                          }}
                        />
                        <span className="settings-hint">
                          {"{parent1}"} = immediate parent folder, {"{parent2}"} = grandparent. Leave empty for flat output.
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "shortcuts" && (
                <ShortcutTable profile={activeProfile} onProfileUpdated={refreshProfiles} />
              )}

              {activeTab === "buttons" && (
                <div>
                  <p className="settings-hint" style={{ marginBottom: 12 }}>
                    Use <code>$image_path</code> as a placeholder for the current image path.
                  </p>
                  <FunctionButtonTable profile={activeProfile} onProfileUpdated={refreshProfiles} />
                </div>
              )}

              {activeTab === "debug" && (
                <div className="settings-form">
                  <p className="settings-hint" style={{ marginBottom: 16 }}>
                    Show a linked image side-by-side for debugging. The app resolves the extra image by walking up the current image's path by the specified depth, then searching under the extra image root for a file with the same stem.
                  </p>

                  <div className="settings-field">
                    <label className="settings-label">Extra image root</label>
                    <FolderPicker
                      value={activeProfile.extraImageRoot || ""}
                      onChange={async (path) => {
                        const updated = new models.Profile({ ...activeProfile, extraImageRoot: path });
                        await UpdateProfile(updated);
                        await refreshProfiles();
                      }}
                      onClear={async () => {
                        const updated = new models.Profile({ ...activeProfile, extraImageRoot: "" });
                        await UpdateProfile(updated);
                        await refreshProfiles();
                      }}
                    />
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">Parent depth</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      style={{ width: 70 }}
                      value={activeProfile.extraImageLinkDepth || 1}
                      onChange={async (e) => {
                        const depth = parseInt(e.target.value, 10);
                        if (isNaN(depth) || depth < 1) return;
                        const updated = new models.Profile({ ...activeProfile, extraImageLinkDepth: depth });
                        await UpdateProfile(updated);
                        await refreshProfiles();
                      }}
                    />
                    <span className="settings-hint">levels up from image file</span>
                  </div>
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="settings-no-profile">
            <p>Select or create a profile to configure it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
