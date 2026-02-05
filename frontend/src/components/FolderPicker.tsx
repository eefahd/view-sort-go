import { SelectDestinationFolder } from "../../wailsjs/go/main/App";

interface FolderPickerProps {
  value: string;
  onChange: (path: string) => void;
}

export function FolderPicker({ value, onChange }: FolderPickerProps) {
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
    <button
      className="folder-picker"
      onClick={handleClick}
      title={value || "Click to select folder"}
    >
      {displayPath}
    </button>
  );
}
