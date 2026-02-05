package services

import (
	"fmt"
	"sync"

	"view-sort-go/internal/models"
)

const maxUndoEntries = 100

type UndoService struct {
	mu      sync.Mutex
	stack   []models.UndoEntry
	actions *ActionRegistry
}

func NewUndoService(actions *ActionRegistry) *UndoService {
	return &UndoService{
		stack:   make([]models.UndoEntry, 0),
		actions: actions,
	}
}

func (s *UndoService) Push(entry models.UndoEntry) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.stack = append(s.stack, entry)
	if len(s.stack) > maxUndoEntries {
		s.stack = s.stack[len(s.stack)-maxUndoEntries:]
	}
}

func (s *UndoService) Pop() (*models.UndoEntry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.stack) == 0 {
		return nil, fmt.Errorf("nothing to undo")
	}
	entry := s.stack[len(s.stack)-1]
	s.stack = s.stack[:len(s.stack)-1]
	return &entry, nil
}

func (s *UndoService) Undo() (*models.UndoEntry, error) {
	entry, err := s.Pop()
	if err != nil {
		return nil, err
	}

	action, err := s.actions.Get(entry.Action)
	if err != nil {
		return nil, err
	}

	if err := action.Reverse(*entry); err != nil {
		return nil, fmt.Errorf("undo failed: %w", err)
	}
	return entry, nil
}

func (s *UndoService) Count() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.stack)
}

func (s *UndoService) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.stack = s.stack[:0]
}
