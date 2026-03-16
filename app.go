package main

import (
	"context"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/rwcarlsen/goexif/exif"
	_ "golang.org/x/image/webp"

	"view-sort-go/internal/config"
	"view-sort-go/internal/models"
	"view-sort-go/internal/services"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var imageExtensions = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".gif": true,
	".bmp": true, ".webp": true, ".tiff": true, ".tif": true,
	".heic": true, ".heif": true,
}

func isImageFile(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	return imageExtensions[ext]
}

type App struct {
	ctx                context.Context
	configMgr          *config.ConfigManager
	imageService       *services.ImageService
	actionRegistry     *services.ActionRegistry
	undoService        *services.UndoService
	profileService     *services.ProfileService
	annotationsService *services.AnnotationsService

	initialFileMu   sync.Mutex
	initialFilePath string // file to open on first frontend load
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
	annotationsService := services.NewAnnotationsService()

	return &App{
		configMgr:          configMgr,
		imageService:       imageService,
		actionRegistry:     actionRegistry,
		undoService:        undoService,
		profileService:     profileService,
		annotationsService: annotationsService,
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// SetInitialFile stores a file path to be opened once the frontend is ready (called before startup).
func (a *App) SetInitialFile(path string) {
	a.initialFileMu.Lock()
	defer a.initialFileMu.Unlock()
	a.initialFilePath = path
}

// HandleFileOpen is called by macOS OnFileOpen (Finder double-click / "Open With").
// If the app is already running, open the file immediately; otherwise store it.
func (a *App) HandleFileOpen(path string) {
	if !isImageFile(path) {
		return
	}
	a.initialFileMu.Lock()
	a.initialFilePath = path
	a.initialFileMu.Unlock()

	// If the app is already started, emit event so frontend reacts immediately.
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "open-file", path)
	}
}

// GetInitialFile returns the file path passed on launch (CLI arg or first file open event),
// then clears it so it's only consumed once.
func (a *App) GetInitialFile() string {
	a.initialFileMu.Lock()
	defer a.initialFileMu.Unlock()
	path := a.initialFilePath
	a.initialFilePath = ""
	return path
}

// OpenImageFile loads the directory containing the given image file and navigates to it.
func (a *App) OpenImageFile(path string) error {
	dir := filepath.Dir(path)
	filename := filepath.Base(path)
	if err := a.imageService.LoadDirectory(dir); err != nil {
		return err
	}
	a.undoService.Clear()
	a.configMgr.SetLastWorkingDir(dir)
	a.loadAnnotations(dir)
	a.imageService.NavigateToFile(filename)
	return nil
}

// loadAnnotations loads annotations and applies them to the image service filter.
func (a *App) loadAnnotations(dir string) {
	_ = a.annotationsService.Load(dir)
	a.imageService.SetAnnotated(a.annotationsService.GetAnnotatedSet())
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
	a.loadAnnotations(dir)
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
	a.loadAnnotations(dir)
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

func (a *App) GoToImage(index int) *models.ImageInfo {
	return a.imageService.GoToImage(index)
}

func (a *App) GetNearbyImages(count int) []models.ImageInfo {
	return a.imageService.GetNearbyImages(count)
}

func (a *App) GetWorkingDirectory() string {
	return a.imageService.GetWorkingDir()
}

func (a *App) GetLastWorkingDir() string {
	return a.configMgr.GetLastWorkingDir()
}

// --- View Mode ---

func (a *App) SetViewMode(mode string) *models.ImageInfo {
	a.imageService.SetViewMode(mode)
	return a.imageService.GetCurrentImage()
}

func (a *App) GetViewMode() string {
	return a.imageService.GetViewMode()
}

// --- Annotations ---

func (a *App) GetImageLabels(filename string) []string {
	return a.annotationsService.GetLabels(filename)
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

	filename := filepath.Base(srcPath)

	if shortcut.Action == models.ActionMove {
		a.imageService.RemoveCurrent()
	} else if shortcut.Action == models.ActionLabel {
		label := filepath.Base(shortcut.Destination)
		_ = a.annotationsService.Annotate(filename, []string{label})
		a.imageService.MarkAnnotated(filename)
	}

	return a.imageService.GetCurrentImage(), nil
}

func (a *App) ExecuteMultiLabel(keys []string) (*models.ImageInfo, error) {
	profile := a.profileService.GetActiveProfile()
	if profile == nil {
		return nil, fmt.Errorf("no active profile")
	}

	srcPath := a.imageService.GetCurrentFilePath()
	if srcPath == "" {
		return nil, fmt.Errorf("no image selected")
	}

	// Collect labels from shortcut destinations
	var labels []string
	for _, key := range keys {
		for _, s := range profile.Shortcuts {
			if s.Key == key {
				if s.Destination != "" {
					labels = append(labels, filepath.Base(s.Destination))
				}
				break
			}
		}
	}

	if len(labels) == 0 {
		return nil, fmt.Errorf("no labels selected")
	}

	// Write JSON to working directory
	workingDir := a.imageService.GetWorkingDir()
	destPath, err := services.WriteMultiLabel(srcPath, labels, workingDir)
	if err != nil {
		return nil, fmt.Errorf("label failed: %w", err)
	}

	filename := filepath.Base(srcPath)

	a.undoService.Push(models.UndoEntry{
		SourcePath: srcPath,
		DestPath:   destPath,
		Action:     models.ActionLabel,
	})

	_ = a.annotationsService.Annotate(filename, labels)
	a.imageService.MarkAnnotated(filename)

	return a.imageService.GetCurrentImage(), nil
}

// --- Undo ---

func (a *App) Undo() (*models.ImageInfo, error) {
	entry, err := a.undoService.Undo()
	if err != nil {
		return nil, err
	}

	filename := filepath.Base(entry.SourcePath)

	if entry.Action == models.ActionMove {
		a.imageService.ReinsertImage(filename)
	} else if entry.Action == models.ActionLabel {
		_ = a.annotationsService.RemoveAnnotation(filename)
		a.imageService.UnmarkAnnotated(filename)
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

// --- Function Buttons ---

func (a *App) ExecuteFunctionButton(index int) error {
	profile := a.profileService.GetActiveProfile()
	if profile == nil {
		return fmt.Errorf("no active profile")
	}
	if index < 0 || index >= len(profile.FunctionButtons) {
		return fmt.Errorf("invalid function button index")
	}

	imagePath := a.imageService.GetCurrentFilePath()
	if imagePath == "" {
		return fmt.Errorf("no image selected")
	}

	cmdStr := strings.ReplaceAll(profile.FunctionButtons[index].Command, "$image_path", imagePath)

	cmd := exec.Command("sh", "-c", cmdStr)
	cmd.Dir = a.imageService.GetWorkingDir()
	return cmd.Start()
}

// --- Image Metadata ---

func (a *App) GetImageMetadata() *models.ImageMetadata {
	info := a.imageService.GetCurrentImage()
	if info == nil {
		return nil
	}
	path := info.Path

	meta := &models.ImageMetadata{
		Filename: info.Filename,
		Format:   strings.ToLower(strings.TrimPrefix(filepath.Ext(info.Filename), ".")),
	}

	// File stat
	if fi, err := os.Stat(path); err == nil {
		meta.FileSize = fi.Size()
		meta.ModifiedAt = fi.ModTime().Format(time.RFC3339)
	}

	// Image dimensions
	if f, err := os.Open(path); err == nil {
		if cfg, _, err := image.DecodeConfig(f); err == nil {
			meta.Width = cfg.Width
			meta.Height = cfg.Height
		}
		f.Close()
	}

	// EXIF data
	if f, err := os.Open(path); err == nil {
		if x, err := exif.Decode(f); err == nil {
			meta.CameraMake = exifStr(x, exif.Make)
			meta.CameraModel = exifStr(x, exif.Model)
			meta.LensModel = exifStr(x, exif.LensModel)
			meta.ISO = exifStr(x, exif.ISOSpeedRatings)
			meta.Flash = exifStr(x, exif.Flash)

			// Date taken
			if t, err := x.DateTime(); err == nil {
				meta.DateTaken = t.Format(time.RFC3339)
			}

			// Focal length: rational → "50mm"
			if tag, err := x.Get(exif.FocalLength); err == nil {
				if num, den, err := tag.Rat2(0); err == nil && den != 0 {
					meta.FocalLength = fmt.Sprintf("%.0fmm", float64(num)/float64(den))
				}
			}

			// Aperture: FNumber rational → f/N
			if tag, err := x.Get(exif.FNumber); err == nil {
				if num, den, err := tag.Rat2(0); err == nil && den != 0 {
					meta.Aperture = fmt.Sprintf("f/%.1g", float64(num)/float64(den))
				}
			}

			// Shutter speed: ExposureTime rational → "1/250s"
			if tag, err := x.Get(exif.ExposureTime); err == nil {
				if num, den, err := tag.Rat2(0); err == nil && den != 0 {
					if num == 1 {
						meta.ShutterSpeed = fmt.Sprintf("1/%ds", den)
					} else {
						meta.ShutterSpeed = fmt.Sprintf("%.4fs", float64(num)/float64(den))
					}
				}
			}

			// GPS
			if lat, lon, err := x.LatLong(); err == nil {
				meta.GPSLat = math.Round(lat*1e6) / 1e6
				meta.GPSLon = math.Round(lon*1e6) / 1e6
				meta.HasGPS = true
			}
		}
		f.Close()
	}

	return meta
}

// exifStr reads a string EXIF tag, returning "" on error.
func exifStr(x *exif.Exif, field exif.FieldName) string {
	tag, err := x.Get(field)
	if err != nil {
		return ""
	}
	s, err := tag.StringVal()
	if err != nil {
		return strings.Trim(tag.String(), `"`)
	}
	return strings.TrimSpace(s)
}

