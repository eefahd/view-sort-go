package models

type ActionType string

const (
	ActionCopy  ActionType = "copy"
	ActionMove  ActionType = "move"
	ActionLabel ActionType = "label"
)

type ProfileActionType string

const (
	ProfileActionCopy   ProfileActionType = "copy"
	ProfileActionMove   ProfileActionType = "move"
	ProfileActionLabel  ProfileActionType = "label"
	ProfileActionCustom ProfileActionType = "custom"
)

type Shortcut struct {
	Label       string     `json:"label"`
	Key         string     `json:"key"`
	Action      ActionType `json:"action"`
	Destination string     `json:"destination"`
}

type FunctionButton struct {
	Label   string `json:"label"`
	Command string `json:"command"` // use $image_path as placeholder
	Key     string `json:"key"`     // optional keyboard shortcut
}

type Profile struct {
	ID                     string            `json:"id"`
	Name                   string            `json:"name"`
	LabelMode              string            `json:"labelMode"`
	ActionType             ProfileActionType `json:"actionType"`
	LabelOutputDir         string            `json:"labelOutputDir"`
	LabelSubfolderTemplate string            `json:"labelSubfolderTemplate"`
	ExtraImageRoot         string            `json:"extraImageRoot"`
	ExtraImageLinkDepth    int               `json:"extraImageLinkDepth"`
	Shortcuts              []Shortcut        `json:"shortcuts"`
	FunctionButtons        []FunctionButton  `json:"functionButtons"`
}

type UndoEntry struct {
	SourcePath string     `json:"sourcePath"`
	DestPath   string     `json:"destPath"`
	Action     ActionType `json:"action"`
}

type AppConfig struct {
	Profiles        []Profile `json:"profiles"`
	ActiveProfileID string    `json:"activeProfileId"`
	LastWorkingDir  string    `json:"lastWorkingDir"`
	Projects        []string  `json:"projects"` // ordered list of known project paths (most recent first)
}

type ImageInfo struct {
	Filename string `json:"filename"`
	Path     string `json:"path"`
	Index    int    `json:"index"`
	Total    int    `json:"total"`
}

type ImageCounts struct {
	Remaining int `json:"remaining"`
	Processed int `json:"processed"`
}

type ImageMetadata struct {
	// File info
	Filename   string `json:"filename"`
	FileSize   int64  `json:"fileSize"`
	ModifiedAt string `json:"modifiedAt"`
	Format     string `json:"format"`

	// Dimensions
	Width  int `json:"width"`
	Height int `json:"height"`

	// EXIF
	DateTaken    string  `json:"dateTaken"`
	CameraMake   string  `json:"cameraMake"`
	CameraModel  string  `json:"cameraModel"`
	LensModel    string  `json:"lensModel"`
	FocalLength  string  `json:"focalLength"`
	Aperture     string  `json:"aperture"`
	ShutterSpeed string  `json:"shutterSpeed"`
	ISO          string  `json:"iso"`
	Flash        string  `json:"flash"`
	GPSLat       float64 `json:"gpsLat"`
	GPSLon       float64 `json:"gpsLon"`
	HasGPS       bool    `json:"hasGPS"`
}
