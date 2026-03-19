import { SelectDestinationFolder } from "../../wailsjs/go/main/App";

interface FolderPickerProps {
  value: string;
  onChange: (path: string) => void;
  onClear?: () => void;
}

export function FolderPicker({ value, onChange, onClear }: FolderPickerProps) {
  const handleClick = async () => {
    try {
      const dir = await SelectDestinationFolder();
      if (dir) onChange(dir);
    } catch {
      // User cancelled
    }
  };

  const displayPath = value
    ? value.split("/").slice(-2).join("/")
    : "(none)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button
        className="folder-picker"
        onClick={handleClick}
        title={value || "Click to select folder"}
      >
        {displayPath}
      </button>
      {value && onClear && (
        <button
          className="remove-btn"
          onClick={onClear}
          title="Clear"
          style={{ padding: "2px 7px" }}
        >
          ×
        </button>
      )}
    </div>
  );
}
