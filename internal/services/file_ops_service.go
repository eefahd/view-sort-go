package services

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"view-sort-go/internal/models"
)

type FileAction interface {
	Execute(src, destDir string) (destPath string, err error)
	Reverse(entry models.UndoEntry) error
}

type CopyAction struct{}

func (a *CopyAction) Execute(src, destDir string) (string, error) {
	destPath := uniquePath(destDir, filepath.Base(src))
	return destPath, copyFile(src, destPath)
}

func (a *CopyAction) Reverse(entry models.UndoEntry) error {
	return os.Remove(entry.DestPath)
}

type MoveAction struct{}

func (a *MoveAction) Execute(src, destDir string) (string, error) {
	destPath := uniquePath(destDir, filepath.Base(src))

	// Try rename first (same filesystem)
	if err := os.Rename(src, destPath); err == nil {
		return destPath, nil
	}

	// Cross-filesystem: copy then remove
	if err := copyFile(src, destPath); err != nil {
		return "", err
	}
	if err := os.Remove(src); err != nil {
		// Clean up the copy
		os.Remove(destPath)
		return "", err
	}
	return destPath, nil
}

func (a *MoveAction) Reverse(entry models.UndoEntry) error {
	// Try rename first
	if err := os.Rename(entry.DestPath, entry.SourcePath); err == nil {
		return nil
	}

	// Cross-filesystem: copy then remove
	if err := copyFile(entry.DestPath, entry.SourcePath); err != nil {
		return err
	}
	return os.Remove(entry.DestPath)
}

type LabelAction struct{}

type labelAnnotation struct {
	Image     string `json:"image"`
	Label     string `json:"label"`
	Timestamp string `json:"timestamp"`
}

func (a *LabelAction) Execute(src, destDir string) (string, error) {
	imageFilename := filepath.Base(src)
	ext := filepath.Ext(imageFilename)
	jsonName := strings.TrimSuffix(imageFilename, ext) + ".json"
	destPath := filepath.Join(destDir, jsonName)

	annotation := labelAnnotation{
		Image:     imageFilename,
		Label:     filepath.Base(destDir),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	data, err := json.MarshalIndent(annotation, "", "  ")
	if err != nil {
		return "", err
	}

	if err := os.MkdirAll(destDir, 0755); err != nil {
		return "", err
	}

	if err := os.WriteFile(destPath, data, 0644); err != nil {
		return "", err
	}
	return destPath, nil
}

func (a *LabelAction) Reverse(entry models.UndoEntry) error {
	return os.Remove(entry.DestPath)
}

// WriteSingleLabel writes a label JSON annotation with a given label name to destDir.
// Used when profile-level label output dir is configured.
func WriteSingleLabel(src, labelName, destDir string) (string, error) {
	imageFilename := filepath.Base(src)
	ext := filepath.Ext(imageFilename)
	jsonName := strings.TrimSuffix(imageFilename, ext) + ".json"
	destPath := filepath.Join(destDir, jsonName)

	annotation := labelAnnotation{
		Image:     imageFilename,
		Label:     labelName,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	data, err := json.MarshalIndent(annotation, "", "  ")
	if err != nil {
		return "", err
	}

	if err := os.MkdirAll(destDir, 0755); err != nil {
		return "", err
	}

	if err := os.WriteFile(destPath, data, 0644); err != nil {
		return "", err
	}
	return destPath, nil
}

type multiLabelAnnotation struct {
	Image     string   `json:"image"`
	Labels    []string `json:"labels"`
	Timestamp string   `json:"timestamp"`
}

func WriteMultiLabel(src string, labels []string, destDir string) (string, error) {
	imageFilename := filepath.Base(src)
	ext := filepath.Ext(imageFilename)
	jsonName := strings.TrimSuffix(imageFilename, ext) + ".json"
	destPath := filepath.Join(destDir, jsonName)

	annotation := multiLabelAnnotation{
		Image:     imageFilename,
		Labels:    labels,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	data, err := json.MarshalIndent(annotation, "", "  ")
	if err != nil {
		return "", err
	}

	if err := os.MkdirAll(destDir, 0755); err != nil {
		return "", err
	}

	if err := os.WriteFile(destPath, data, 0644); err != nil {
		return "", err
	}
	return destPath, nil
}

type ActionRegistry struct {
	actions map[models.ActionType]FileAction
}

func NewActionRegistry() *ActionRegistry {
	return &ActionRegistry{
		actions: map[models.ActionType]FileAction{
			models.ActionCopy:  &CopyAction{},
			models.ActionMove:  &MoveAction{},
			models.ActionLabel: &LabelAction{},
		},
	}
}

func (r *ActionRegistry) Get(actionType models.ActionType) (FileAction, error) {
	action, ok := r.actions[actionType]
	if !ok {
		return nil, fmt.Errorf("unknown action type: %s", actionType)
	}
	return action, nil
}

func (r *ActionRegistry) Register(actionType models.ActionType, action FileAction) {
	r.actions[actionType] = action
}

func uniquePath(dir, filename string) string {
	dest := filepath.Join(dir, filename)
	if _, err := os.Stat(dest); os.IsNotExist(err) {
		return dest
	}

	ext := filepath.Ext(filename)
	name := strings.TrimSuffix(filename, ext)
	for i := 1; ; i++ {
		dest = filepath.Join(dir, fmt.Sprintf("%s_%d%s", name, i, ext))
		if _, err := os.Stat(dest); os.IsNotExist(err) {
			return dest
		}
	}
}

func copyFile(src, dst string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}

	dstFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer dstFile.Close()

	if _, err := io.Copy(dstFile, srcFile); err != nil {
		return err
	}
	return dstFile.Sync()
}
