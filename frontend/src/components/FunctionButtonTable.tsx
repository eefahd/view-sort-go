import { useState, useEffect } from "react";
import { models } from "../../wailsjs/go/models";
import { UpdateProfile } from "../../wailsjs/go/main/App";
import { useAppContext } from "../context/AppContext";

type Profile = models.Profile;
type FunctionButton = models.FunctionButton;

interface FunctionButtonTableProps {
  profile: Profile;
  onProfileUpdated: () => void;
}

export function FunctionButtonTable({
  profile,
  onProfileUpdated,
}: FunctionButtonTableProps) {
  const { showToast } = useAppContext();

  const [localButtons, setLocalButtons] = useState<FunctionButton[]>(
    profile.functionButtons || []
  );

  useEffect(() => {
    setLocalButtons(profile.functionButtons || []);
  }, [profile.id, profile.functionButtons?.length]);

  const saveButtons = async (buttons: FunctionButton[]) => {
    const updated = new models.Profile({
      ...profile,
      functionButtons: buttons,
    });
    try {
      await UpdateProfile(updated);
      onProfileUpdated();
    } catch (err: any) {
      showToast(err?.toString() || "Failed to save");
    }
  };

  const updateLocal = (index: number, changes: Partial<FunctionButton>) => {
    const updated = [...localButtons];
    updated[index] = { ...updated[index], ...changes };
    setLocalButtons(updated);
  };

  const handleBlur = () => {
    saveButtons(localButtons);
  };

  const addButton = () => {
    const updated = [
      ...localButtons,
      new models.FunctionButton({ label: "", command: "" }),
    ];
    setLocalButtons(updated);
    saveButtons(updated);
  };

  const removeButton = (index: number) => {
    const updated = localButtons.filter((_, i) => i !== index);
    setLocalButtons(updated);
    saveButtons(updated);
  };

  return (
    <div className="shortcut-table">
      <table>
        <thead>
          <tr>
            <th>Label</th>
            <th>Command</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {localButtons.map((fb, i) => (
            <tr key={i}>
              <td>
                <input
                  type="text"
                  value={fb.label}
                  placeholder="Button label..."
                  onChange={(e) => updateLocal(i, { label: e.target.value })}
                  onBlur={handleBlur}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={fb.command}
                  placeholder="e.g. python script.py $image_path"
                  onChange={(e) => updateLocal(i, { command: e.target.value })}
                  onBlur={handleBlur}
                />
              </td>
              <td>
                <button
                  className="remove-btn"
                  onClick={() => removeButton(i)}
                  title="Remove button"
                >
                  x
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="add-btn" onClick={addButton}>
        + Add Function Button
      </button>
    </div>
  );
}
