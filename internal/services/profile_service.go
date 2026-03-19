package services

import (
	"fmt"

	"view-sort-go/internal/config"
	"view-sort-go/internal/models"

	"github.com/google/uuid"
)

type ProfileService struct {
	configMgr *config.ConfigManager
}

func NewProfileService(configMgr *config.ConfigManager) *ProfileService {
	return &ProfileService{configMgr: configMgr}
}

func (s *ProfileService) GetProfiles() []models.Profile {
	profiles := s.configMgr.GetProfiles()
	for i := range profiles {
		if profiles[i].Shortcuts == nil {
			profiles[i].Shortcuts = []models.Shortcut{}
		}
		if profiles[i].FunctionButtons == nil {
			profiles[i].FunctionButtons = []models.FunctionButton{}
		}
	}
	return profiles
}

func (s *ProfileService) CreateProfile(name string) (models.Profile, error) {
	profiles := s.configMgr.GetProfiles()
	profile := models.Profile{
		ID:              uuid.New().String(),
		Name:            name,
		Shortcuts:       []models.Shortcut{},
		FunctionButtons: []models.FunctionButton{},
	}
	profiles = append(profiles, profile)
	if err := s.configMgr.SetProfiles(profiles); err != nil {
		return models.Profile{}, err
	}
	// If this is the first profile, set it as active
	if len(profiles) == 1 {
		s.configMgr.SetActiveProfileID(profile.ID)
	}
	return profile, nil
}

func (s *ProfileService) DuplicateProfile(id string) (models.Profile, error) {
	profiles := s.configMgr.GetProfiles()
	for _, p := range profiles {
		if p.ID == id {
			dup := p
			dup.ID = uuid.New().String()
			dup.Name = p.Name + " (copy)"
			// Deep-copy slices so the duplicate is independent
			dup.Shortcuts = append([]models.Shortcut{}, p.Shortcuts...)
			dup.FunctionButtons = append([]models.FunctionButton{}, p.FunctionButtons...)
			profiles = append(profiles, dup)
			if err := s.configMgr.SetProfiles(profiles); err != nil {
				return models.Profile{}, err
			}
			return dup, nil
		}
	}
	return models.Profile{}, fmt.Errorf("profile not found: %s", id)
}

func (s *ProfileService) UpdateProfile(profile models.Profile) error {
	profiles := s.configMgr.GetProfiles()
	for i, p := range profiles {
		if p.ID == profile.ID {
			profiles[i] = profile
			return s.configMgr.SetProfiles(profiles)
		}
	}
	return fmt.Errorf("profile not found: %s", profile.ID)
}

func (s *ProfileService) DeleteProfile(id string) error {
	profiles := s.configMgr.GetProfiles()
	for i, p := range profiles {
		if p.ID == id {
			profiles = append(profiles[:i], profiles[i+1:]...)
			if err := s.configMgr.SetProfiles(profiles); err != nil {
				return err
			}
			if s.configMgr.GetActiveProfileID() == id {
				if len(profiles) > 0 {
					s.configMgr.SetActiveProfileID(profiles[0].ID)
				} else {
					s.configMgr.SetActiveProfileID("")
				}
			}
			return nil
		}
	}
	return fmt.Errorf("profile not found: %s", id)
}

func (s *ProfileService) GetActiveProfile() *models.Profile {
	activeID := s.configMgr.GetActiveProfileID()
	if activeID == "" {
		return nil
	}
	profiles := s.configMgr.GetProfiles()
	for _, p := range profiles {
		if p.ID == activeID {
			if p.Shortcuts == nil {
				p.Shortcuts = []models.Shortcut{}
			}
			if p.FunctionButtons == nil {
				p.FunctionButtons = []models.FunctionButton{}
			}
			return &p
		}
	}
	return nil
}

func (s *ProfileService) SetActiveProfile(id string) error {
	return s.configMgr.SetActiveProfileID(id)
}
