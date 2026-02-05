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
}

type ImageService struct {
	mu           sync.RWMutex
	workingDir   string
	images       []string
	currentIndex int
	processed    int
}

func NewImageService() *ImageService {
	return &ImageService{}
}

func (s *ImageService) LoadDirectory(dir string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	s.images = nil
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(entry.Name()))
		if imageExtensions[ext] {
			s.images = append(s.images, entry.Name())
		}
	}

	sort.Strings(s.images)
	s.workingDir = dir
	s.currentIndex = 0
	s.processed = 0
	return nil
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

	s.images = append(s.images[:s.currentIndex], s.images[s.currentIndex+1:]...)
	s.processed++

	if s.currentIndex >= len(s.images) && s.currentIndex > 0 {
		s.currentIndex = len(s.images) - 1
	}
}

func (s *ImageService) ReinsertImage(filename string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Binary search for the right insertion position (alphabetical)
	idx := sort.SearchStrings(s.images, filename)
	s.images = append(s.images, "")
	copy(s.images[idx+1:], s.images[idx:])
	s.images[idx] = filename
	s.processed--

	// Navigate to the reinserted image
	s.currentIndex = idx
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

func (s *ImageService) GetCurrentFilename() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if len(s.images) == 0 {
		return ""
	}
	return s.images[s.currentIndex]
}
