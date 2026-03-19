// Re-export Wails-generated types for convenience
export type { models } from "../wailsjs/go/models";
import { models } from "../wailsjs/go/models";

export type Profile = models.Profile;
export type Shortcut = models.Shortcut;
export type ImageInfo = models.ImageInfo;
export type ImageCounts = models.ImageCounts;

export type ActionType = "copy" | "move" | "label";
export type ProfileActionType = "copy" | "move" | "label" | "custom";
export type LabelMode = "single" | "multi";
