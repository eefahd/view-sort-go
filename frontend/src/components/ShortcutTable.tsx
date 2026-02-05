import { useState } from "react";
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

export function ShortcutTable({
  profile,
  onProfileUpdated,
}: ShortcutTableProps) {
  const { showToast } = useAppContext();
  const [capturingIndex, setCapturingIndex] = useState<number | null>(null);

  const updateShortcuts = async (shortcuts: Shortcut[]) => {
    const updated = new models.Profile({
      id: profile.id,
      name: profile.name,
      shortcuts,
    });
    try {
      await UpdateProfile(updated);
      onProfileUpdated();
    } catch (err: any) {
      showToast(err?.toString() || "Failed to save");
    }
  };

  const updateShortcut = (index: number, changes: Partial<Shortcut>) => {
    const shortcuts = [...profile.shortcuts];
    shortcuts[index] = { ...shortcuts[index], ...changes };
    updateShortcuts(shortcuts);
  };

  const addShortcut = () => {
    updateShortcuts([
      ...profile.shortcuts,
      new models.Shortcut({ label: "", key: "", action: "copy", destination: "" }),
    ]);
  };

  const removeShortcut = (index: number) => {
    const shortcuts = profile.shortcuts.filter((_, i) => i !== index);
    updateShortcuts(shortcuts);
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
      updateShortcut(index, { key: e.key });
      setCapturingIndex(null);
    }
  };

  return (
    <div className="shortcut-table">
      <table>
        <thead>
          <tr>
            <th>Label</th>
            <th>Key</th>
            <th>Action</th>
            <th>Destination</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {profile.shortcuts.map((s, i) => (
            <tr key={i}>
              <td>
                <input
                  type="text"
                  value={s.label}
                  placeholder="Label..."
                  onChange={(e) => updateShortcut(i, { label: e.target.value })}
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
              <td>
                <select
                  value={s.action}
                  onChange={(e) =>
                    updateShortcut(i, {
                      action: e.target.value as ActionType,
                    })
                  }
                >
                  <option value="copy">Copy</option>
                  <option value="move">Move</option>
                </select>
              </td>
              <td>
                <FolderPicker
                  value={s.destination}
                  onChange={(path) => updateShortcut(i, { destination: path })}
                />
              </td>
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
