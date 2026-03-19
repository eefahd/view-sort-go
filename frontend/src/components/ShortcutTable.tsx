import { useState, useRef, useEffect } from "react";
import type { ActionType } from "../types";
import { models } from "../../wailsjs/go/models";
import { FolderPicker } from "./FolderPicker";
import { UpdateProfile } from "../../wailsjs/go/main/App";
import { useAppContext } from "../context/AppContext";

type Profile = models.Profile;
type Shortcut = models.Shortcut;

interface ShortcutTableProps {
  profile: Profile;
  onProfileUpdated: () => void;
}

// Whether the profile-level action type overrides per-shortcut actions
function isProfileActionFixed(profile: Profile): boolean {
  return !!profile.actionType && profile.actionType !== "custom";
}

export function ShortcutTable({
  profile,
  onProfileUpdated,
}: ShortcutTableProps) {
  const { showToast } = useAppContext();
  const [capturingIndex, setCapturingIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [localShortcuts, setLocalShortcuts] = useState<Shortcut[]>(
    profile.shortcuts || []
  );

  useEffect(() => {
    setLocalShortcuts(profile.shortcuts || []);
  }, [profile.id, profile.shortcuts?.length]);

  const saveShortcuts = async (shortcuts: Shortcut[]) => {
    const updated = new models.Profile({
      ...profile,
      shortcuts,
    });
    try {
      await UpdateProfile(updated);
      onProfileUpdated();
    } catch (err: any) {
      showToast(err?.toString() || "Failed to save");
    }
  };

  const updateLocal = (index: number, changes: Partial<Shortcut>) => {
    const updated = [...localShortcuts];
    updated[index] = { ...updated[index], ...changes };
    setLocalShortcuts(updated);
  };

  const updateAndSave = (index: number, changes: Partial<Shortcut>) => {
    const updated = [...localShortcuts];
    updated[index] = { ...updated[index], ...changes };
    setLocalShortcuts(updated);
    saveShortcuts(updated);
  };

  const handleBlur = () => {
    saveShortcuts(localShortcuts);
  };

  const addShortcut = () => {
    const updated = [
      ...localShortcuts,
      new models.Shortcut({ label: "", key: "", action: "copy", destination: "" }),
    ];
    setLocalShortcuts(updated);
    saveShortcuts(updated);
  };

  const removeShortcut = (index: number) => {
    const updated = localShortcuts.filter((_, i) => i !== index);
    setLocalShortcuts(updated);
    saveShortcuts(updated);
  };

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    const from = dragIndexRef.current;
    if (from === null || from === index) {
      dragIndexRef.current = null;
      setDragOverIndex(null);
      return;
    }
    const shortcuts = [...localShortcuts];
    const [moved] = shortcuts.splice(from, 1);
    shortcuts.splice(index, 0, moved);
    dragIndexRef.current = null;
    setDragOverIndex(null);
    setLocalShortcuts(shortcuts);
    saveShortcuts(shortcuts);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleKeyCapture = (index: number, e: React.KeyboardEvent) => {
    if (capturingIndex !== index) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      setCapturingIndex(null);
      return;
    }
    if (e.key.length === 1) {
      updateAndSave(index, { key: e.key });
      setCapturingIndex(null);
    }
  };

  const fixedAction = isProfileActionFixed(profile);
  const isLabelMode = profile.actionType === "label";

  return (
    <div className="shortcut-table">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Label</th>
            <th>Key</th>
            {!fixedAction && <th>Action</th>}
            {!isLabelMode && <th>Destination</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {localShortcuts.map((s, i) => (
            <tr
              key={i}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={handleDragEnd}
              className={dragOverIndex === i ? "drag-over" : ""}
            >
              <td className="drag-handle" title="Drag to reorder">
                ⠿
              </td>
              <td>
                <input
                  type="text"
                  value={s.label}
                  placeholder="Label..."
                  onChange={(e) => updateLocal(i, { label: e.target.value })}
                  onBlur={handleBlur}
                />
              </td>
              <td>
                <div
                  className={`key-capture ${capturingIndex === i ? "active" : ""}`}
                  tabIndex={0}
                  onClick={() => setCapturingIndex(i)}
                  onKeyDown={(e) => handleKeyCapture(i, e)}
                  onBlur={() => {
                    if (capturingIndex === i) setCapturingIndex(null);
                  }}
                >
                  {capturingIndex === i ? (
                    <span className="capturing">Press a key...</span>
                  ) : (
                    <kbd>{s.key || "..."}</kbd>
                  )}
                </div>
              </td>
              {!fixedAction && (
                <td>
                  <select
                    value={s.action}
                    onChange={(e) =>
                      updateAndSave(i, {
                        action: e.target.value as ActionType,
                      })
                    }
                  >
                    <option value="copy">Copy</option>
                    <option value="move">Move</option>
                    <option value="label">Label</option>
                  </select>
                </td>
              )}
              {!isLabelMode && (
                <td>
                  <FolderPicker
                    value={s.destination}
                    onChange={(path) => updateAndSave(i, { destination: path })}
                  />
                </td>
              )}
              <td>
                <button
                  className="remove-btn"
                  onClick={() => removeShortcut(i)}
                  title="Remove shortcut"
                >
                  x
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="add-btn" onClick={addShortcut}>
        + Add Shortcut
      </button>
    </div>
  );
}
