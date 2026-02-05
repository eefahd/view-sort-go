package services

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

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

type ActionRegistry struct {
	actions map[models.ActionType]FileAction
}

func NewActionRegistry() *ActionRegistry {
	return &ActionRegistry{
		actions: map[models.ActionType]FileAction{
			models.ActionCopy: &CopyAction{},
			models.ActionMove: &MoveAction{},
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
