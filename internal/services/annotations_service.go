package services

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

const annotationsFile = ".annotations.json"

type AnnotationsService struct {
	mu          sync.RWMutex
	workingDir  string
	annotations map[string][]string // filename -> labels
}

func NewAnnotationsService() *AnnotationsService {
	return &AnnotationsService{
		annotations: make(map[string][]string),
	}
}

func (s *AnnotationsService) Load(dir string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.workingDir = dir
	s.annotations = make(map[string][]string)

	data, err := os.ReadFile(filepath.Join(dir, annotationsFile))
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	return json.Unmarshal(data, &s.annotations)
}

func (s *AnnotationsService) save() error {
	data, err := json.MarshalIndent(s.annotations, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(s.workingDir, annotationsFile), data, 0644)
}

func (s *AnnotationsService) Annotate(filename string, labels []string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.annotations[filename] = labels
	return s.save()
}

func (s *AnnotationsService) RemoveAnnotation(filename string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.annotations, filename)
	return s.save()
}

func (s *AnnotationsService) IsAnnotated(filename string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	_, ok := s.annotations[filename]
	return ok
}

func (s *AnnotationsService) GetLabels(filename string) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.annotations[filename]
}

// Reset clears all in-memory annotations and deletes the persisted file.
func (s *AnnotationsService) Reset() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.annotations = make(map[string][]string)
	path := filepath.Join(s.workingDir, annotationsFile)
	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (s *AnnotationsService) GetAnnotatedSet() map[string]bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	set := make(map[string]bool, len(s.annotations))
	for k := range s.annotations {
		set[k] = true
	}
	return set
}
