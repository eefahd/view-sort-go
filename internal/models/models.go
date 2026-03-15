package models

type ActionType string

const (
	ActionCopy  ActionType = "copy"
	ActionMove  ActionType = "move"
	ActionLabel ActionType = "label"
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
}

type Profile struct {
	ID              string           `json:"id"`
	Name            string           `json:"name"`
	LabelMode       string           `json:"labelMode"`
	Shortcuts       []Shortcut       `json:"shortcuts"`
	FunctionButtons []FunctionButton `json:"functionButtons"`
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
