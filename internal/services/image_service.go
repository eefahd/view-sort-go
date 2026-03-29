package services

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"view-sort-go/internal/models"
)

var imageExtensions = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true,
	".gif": true, ".webp": true, ".bmp": true,
	".tiff": true, ".tif": true,
	".heic": true, ".heif": true,
}

type ImageService struct {
	mu           sync.RWMutex
	workingDir   string
	allImages    []string          // all image files found on disk
	images       []string          // currently visible (filtered) list
	annotated    map[string]bool   // set of annotated filenames
	viewMode     string            // "pending", "all", or "label"
	labelFilter  string            // active label name (when viewMode == "label")
	labeledSet   map[string]bool   // filenames with the active label
	currentIndex int
	processed    int
}

func NewImageService() *ImageService {
	return &ImageService{
		viewMode:  "pending",
		annotated: make(map[string]bool),
	}
}

func (s *ImageService) LoadDirectory(dir string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	s.allImages = nil
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(entry.Name()))
		if imageExtensions[ext] {
			s.allImages = append(s.allImages, entry.Name())
		}
	}

	sort.Strings(s.allImages)
	s.workingDir = dir
	s.currentIndex = 0
	s.processed = 0
	s.rebuildFiltered()
	return nil
}

func (s *ImageService) SetAnnotated(annotated map[string]bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.annotated = annotated
	s.processed = len(annotated)
	s.rebuildFiltered()
}

func (s *ImageService) MarkAnnotated(filename string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.annotated[filename] = true
	s.processed = len(s.annotated)
	oldFilename := ""
	if s.currentIndex < len(s.images) {
		oldFilename = s.images[s.currentIndex]
	}
	s.rebuildFiltered()
	// Try to stay on the same image or advance naturally
	if oldFilename != "" {
		for i, name := range s.images {
			if name == oldFilename {
				s.currentIndex = i
				return
			}
		}
	}
	// Image was filtered out — stay at same index (auto-advance)
	if s.currentIndex >= len(s.images) && len(s.images) > 0 {
		s.currentIndex = len(s.images) - 1
	}
}

func (s *ImageService) UnmarkAnnotated(filename string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.annotated, filename)
	s.processed = len(s.annotated)
	s.rebuildFiltered()
	// Navigate to the un-annotated image
	for i, name := range s.images {
		if name == filename {
			s.currentIndex = i
			return
		}
	}
}

func (s *ImageService) SetViewMode(mode string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if mode != "all" && mode != "pending" {
		mode = "pending"
	}
	oldFilename := ""
	if len(s.images) > 0 && s.currentIndex < len(s.images) {
		oldFilename = s.images[s.currentIndex]
	}
	s.viewMode = mode
	s.labelFilter = ""
	s.labeledSet = nil
	s.rebuildFiltered()
	// Try to keep the same image selected
	if oldFilename != "" {
		for i, name := range s.images {
			if name == oldFilename {
				s.currentIndex = i
				return
			}
		}
	}
	if s.currentIndex >= len(s.images) && len(s.images) > 0 {
		s.currentIndex = len(s.images) - 1
	}
}

func (s *ImageService) GetViewMode() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.viewMode
}

func (s *ImageService) SetLabelFilter(label string, labeledSet map[string]bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	oldFilename := ""
	if len(s.images) > 0 && s.currentIndex < len(s.images) {
		oldFilename = s.images[s.currentIndex]
	}
	if label == "" {
		s.viewMode = "pending"
		s.labelFilter = ""
		s.labeledSet = nil
	} else {
		s.viewMode = "label"
		s.labelFilter = label
		s.labeledSet = labeledSet
	}
	s.rebuildFiltered()
	if oldFilename != "" {
		for i, name := range s.images {
			if name == oldFilename {
				s.currentIndex = i
				return
			}
		}
	}
	if s.currentIndex >= len(s.images) && len(s.images) > 0 {
		s.currentIndex = len(s.images) - 1
	}
}

func (s *ImageService) GetLabelFilter() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.labelFilter
}

// rebuildFiltered rebuilds s.images from s.allImages based on viewMode and annotations.
// Must be called with s.mu held.
func (s *ImageService) rebuildFiltered() {
	switch s.viewMode {
	case "all":
		s.images = make([]string, len(s.allImages))
		copy(s.images, s.allImages)
	case "label":
		s.images = nil
		for _, name := range s.allImages {
			if s.labeledSet[name] {
				s.images = append(s.images, name)
			}
		}
	default: // "pending"
		s.images = nil
		for _, name := range s.allImages {
			if !s.annotated[name] {
				s.images = append(s.images, name)
			}
		}
	}
	if s.currentIndex >= len(s.images) {
		if len(s.images) > 0 {
			s.currentIndex = len(s.images) - 1
		} else {
			s.currentIndex = 0
		}
	}
}

func (s *ImageService) GetCurrentImage() *models.ImageInfo {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.images) == 0 {
		return nil
	}
	if s.currentIndex >= len(s.images) {
		s.currentIndex = len(s.images) - 1
	}
	if s.currentIndex < 0 {
		s.currentIndex = 0
	}

	return &models.ImageInfo{
		Filename: s.images[s.currentIndex],
		Path:     filepath.Join(s.workingDir, s.images[s.currentIndex]),
		Index:    s.currentIndex,
		Total:    len(s.images),
	}
}

func (s *ImageService) Next() *models.ImageInfo {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.images) == 0 {
		return nil
	}
	if s.currentIndex < len(s.images)-1 {
		s.currentIndex++
	}
	return &models.ImageInfo{
		Filename: s.images[s.currentIndex],
		Path:     filepath.Join(s.workingDir, s.images[s.currentIndex]),
		Index:    s.currentIndex,
		Total:    len(s.images),
	}
}

func (s *ImageService) Previous() *models.ImageInfo {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.images) == 0 {
		return nil
	}
	if s.currentIndex > 0 {
		s.currentIndex--
	}
	return &models.ImageInfo{
		Filename: s.images[s.currentIndex],
		Path:     filepath.Join(s.workingDir, s.images[s.currentIndex]),
		Index:    s.currentIndex,
		Total:    len(s.images),
	}
}

func (s *ImageService) GetCounts() models.ImageCounts {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return models.ImageCounts{
		Remaining: len(s.images),
		Processed: s.processed,
	}
}

func (s *ImageService) RemoveCurrent() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.images) == 0 {
		return
	}

	filename := s.images[s.currentIndex]
	// Also remove from allImages
	for i, name := range s.allImages {
		if name == filename {
			s.allImages = append(s.allImages[:i], s.allImages[i+1:]...)
			break
		}
	}

	s.images = append(s.images[:s.currentIndex], s.images[s.currentIndex+1:]...)
	s.processed++

	if s.currentIndex >= len(s.images) && s.currentIndex > 0 {
		s.currentIndex = len(s.images) - 1
	}
}

func (s *ImageService) ReinsertImage(filename string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Reinsert into allImages
	idx := sort.SearchStrings(s.allImages, filename)
	s.allImages = append(s.allImages, "")
	copy(s.allImages[idx+1:], s.allImages[idx:])
	s.allImages[idx] = filename
	s.processed--

	// Rebuild filtered list and navigate to the image
	s.rebuildFiltered()
	for i, name := range s.images {
		if name == filename {
			s.currentIndex = i
			return
		}
	}
}

func (s *ImageService) GoToImage(index int) *models.ImageInfo {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.images) == 0 {
		return nil
	}
	if index < 0 {
		index = 0
	}
	if index >= len(s.images) {
		index = len(s.images) - 1
	}
	s.currentIndex = index
	return &models.ImageInfo{
		Filename: s.images[s.currentIndex],
		Path:     filepath.Join(s.workingDir, s.images[s.currentIndex]),
		Index:    s.currentIndex,
		Total:    len(s.images),
	}
}

func (s *ImageService) GetNearbyImages(count int) []models.ImageInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if len(s.images) == 0 {
		return nil
	}

	half := count / 2
	start := s.currentIndex - half
	if start < 0 {
		start = 0
	}
	end := start + count
	if end > len(s.images) {
		end = len(s.images)
		start = end - count
		if start < 0 {
			start = 0
		}
	}

	result := make([]models.ImageInfo, 0, end-start)
	for i := start; i < end; i++ {
		result = append(result, models.ImageInfo{
			Filename: s.images[i],
			Path:     filepath.Join(s.workingDir, s.images[i]),
			Index:    i,
			Total:    len(s.images),
		})
	}
	return result
}

func (s *ImageService) GetWorkingDir() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.workingDir
}

func (s *ImageService) GetCurrentFilePath() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if len(s.images) == 0 {
		return ""
	}
	return filepath.Join(s.workingDir, s.images[s.currentIndex])
}

// NavigateToFile sets the current index to the given filename if it exists in the filtered list.
func (s *ImageService) NavigateToFile(filename string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, name := range s.images {
		if name == filename {
			s.currentIndex = i
			return
		}
	}
}

func (s *ImageService) GetCurrentFilename() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if len(s.images) == 0 {
		return ""
	}
	return s.images[s.currentIndex]
}
