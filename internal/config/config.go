package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"sync"

	"view-sort-go/internal/models"
)

type ConfigManager struct {
	mu       sync.RWMutex
	config   models.AppConfig
	filePath string
}

func NewConfigManager() (*ConfigManager, error) {
	configDir, err := getConfigDir()
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return nil, err
	}
	cm := &ConfigManager{
		filePath: filepath.Join(configDir, "config.json"),
	}
	if err := cm.load(); err != nil {
		cm.config = models.AppConfig{
			Profiles: []models.Profile{},
		}
	}
	return cm, nil
}

func getConfigDir() (string, error) {
	switch runtime.GOOS {
	case "darwin":
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(home, "Library", "Application Support", "ViewSortGo"), nil
	case "windows":
		appData := os.Getenv("APPDATA")
		if appData == "" {
			home, err := os.UserHomeDir()
			if err != nil {
				return "", err
			}
			appData = filepath.Join(home, "AppData", "Roaming")
		}
		return filepath.Join(appData, "ViewSortGo"), nil
	default:
		configHome := os.Getenv("XDG_CONFIG_HOME")
		if configHome == "" {
			home, err := os.UserHomeDir()
			if err != nil {
				return "", err
			}
			configHome = filepath.Join(home, ".config")
		}
		return filepath.Join(configHome, "viewsortgo"), nil
	}
}

func (cm *ConfigManager) load() error {
	data, err := os.ReadFile(cm.filePath)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, &cm.config)
}

func (cm *ConfigManager) Save() error {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	return cm.saveUnsafe()
}

func (cm *ConfigManager) saveUnsafe() error {
	data, err := json.MarshalIndent(cm.config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(cm.filePath, data, 0644)
}

func (cm *ConfigManager) GetConfig() models.AppConfig {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	return cm.config
}

func (cm *ConfigManager) SetConfig(cfg models.AppConfig) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.config = cfg
	return cm.saveUnsafe()
}

func (cm *ConfigManager) GetActiveProfileID() string {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	return cm.config.ActiveProfileID
}

func (cm *ConfigManager) SetActiveProfileID(id string) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.config.ActiveProfileID = id
	return cm.saveUnsafe()
}

func (cm *ConfigManager) GetLastWorkingDir() string {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	return cm.config.LastWorkingDir
}

func (cm *ConfigManager) SetLastWorkingDir(dir string) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.config.LastWorkingDir = dir
	return cm.saveUnsafe()
}

func (cm *ConfigManager) GetProfiles() []models.Profile {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	result := make([]models.Profile, len(cm.config.Profiles))
	copy(result, cm.config.Profiles)
	return result
}

func (cm *ConfigManager) SetProfiles(profiles []models.Profile) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.config.Profiles = profiles
	return cm.saveUnsafe()
}
