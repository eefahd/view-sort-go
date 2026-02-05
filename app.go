package main

import (
	"context"
	"fmt"
	"path/filepath"

	"view-sort-go/internal/config"
	"view-sort-go/internal/models"
	"view-sort-go/internal/services"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx            context.Context
	configMgr      *config.ConfigManager
	imageService   *services.ImageService
	actionRegistry *services.ActionRegistry
	undoService    *services.UndoService
	profileService *services.ProfileService
}

func NewApp() *App {
	configMgr, err := config.NewConfigManager()
	if err != nil {
		panic(fmt.Sprintf("failed to init config: %v", err))
	}

	actionRegistry := services.NewActionRegistry()
	imageService := services.NewImageService()
	undoService := services.NewUndoService(actionRegistry)
	profileService := services.NewProfileService(configMgr)

	return &App{
		configMgr:      configMgr,
		imageService:   imageService,
		actionRegistry: actionRegistry,
		undoService:    undoService,
		profileService: profileService,
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// --- Directory Selection ---

func (a *App) SelectWorkingDirectory() (string, error) {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Image Folder",
	})
	if err != nil {
		return "", err
	}
	if dir == "" {
		return "", nil
	}
	if err := a.imageService.LoadDirectory(dir); err != nil {
		return "", err
	}
	a.undoService.Clear()
	a.configMgr.SetLastWorkingDir(dir)
	return dir, nil
}

func (a *App) SelectDestinationFolder() (string, error) {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Destination Folder",
	})
	if err != nil {
		return "", err
	}
	return dir, nil
}

func (a *App) SetWorkingDirectory(dir string) error {
	if err := a.imageService.LoadDirectory(dir); err != nil {
		return err
	}
	a.undoService.Clear()
	a.configMgr.SetLastWorkingDir(dir)
	return nil
}

// --- Image Navigation ---

func (a *App) GetCurrentImageInfo() *models.ImageInfo {
	return a.imageService.GetCurrentImage()
}

func (a *App) NextImage() *models.ImageInfo {
	return a.imageService.Next()
}

func (a *App) PreviousImage() *models.ImageInfo {
	return a.imageService.Previous()
}

func (a *App) GetImageCounts() models.ImageCounts {
	return a.imageService.GetCounts()
}

func (a *App) GetWorkingDirectory() string {
	return a.imageService.GetWorkingDir()
}

func (a *App) GetLastWorkingDir() string {
	return a.configMgr.GetLastWorkingDir()
}

// --- Shortcut Execution ---

func (a *App) ExecuteShortcut(key string) (*models.ImageInfo, error) {
	profile := a.profileService.GetActiveProfile()
	if profile == nil {
		return nil, fmt.Errorf("no active profile")
	}

	var shortcut *models.Shortcut
	for _, s := range profile.Shortcuts {
		if s.Key == key {
			shortcut = &s
			break
		}
	}
	if shortcut == nil {
		return nil, fmt.Errorf("no shortcut bound to key: %s", key)
	}

	if shortcut.Destination == "" {
		return nil, fmt.Errorf("no destination set for shortcut: %s", shortcut.Label)
	}

	srcPath := a.imageService.GetCurrentFilePath()
	if srcPath == "" {
		return nil, fmt.Errorf("no image selected")
	}

	action, err := a.actionRegistry.Get(shortcut.Action)
	if err != nil {
		return nil, err
	}

	destPath, err := action.Execute(srcPath, shortcut.Destination)
	if err != nil {
		return nil, fmt.Errorf("action failed: %w", err)
	}

	a.undoService.Push(models.UndoEntry{
		SourcePath: srcPath,
		DestPath:   destPath,
		Action:     shortcut.Action,
	})

	if shortcut.Action == models.ActionMove {
		a.imageService.RemoveCurrent()
	}

	return a.imageService.GetCurrentImage(), nil
}

// --- Undo ---

func (a *App) Undo() (*models.ImageInfo, error) {
	entry, err := a.undoService.Undo()
	if err != nil {
		return nil, err
	}

	if entry.Action == models.ActionMove {
		filename := filepath.Base(entry.SourcePath)
		a.imageService.ReinsertImage(filename)
	}

	return a.imageService.GetCurrentImage(), nil
}

func (a *App) GetUndoCount() int {
	return a.undoService.Count()
}

// --- Profile Management ---

func (a *App) GetProfiles() []models.Profile {
	return a.profileService.GetProfiles()
}

func (a *App) CreateProfile(name string) (models.Profile, error) {
	return a.profileService.CreateProfile(name)
}

func (a *App) UpdateProfile(profile models.Profile) error {
	return a.profileService.UpdateProfile(profile)
}

func (a *App) DeleteProfile(id string) error {
	return a.profileService.DeleteProfile(id)
}

func (a *App) GetActiveProfile() *models.Profile {
	return a.profileService.GetActiveProfile()
}

func (a *App) SetActiveProfile(id string) error {
	return a.profileService.SetActiveProfile(id)
}
