package main

import (
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"view-sort-go/internal/services"
)

type ImageHandler struct {
	imageService   *services.ImageService
	profileService *services.ProfileService
}

func NewImageHandler(imageService *services.ImageService, profileService *services.ProfileService) *ImageHandler {
	return &ImageHandler{imageService: imageService, profileService: profileService}
}

var mimeTypes = map[string]string{
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".gif":  "image/gif",
	".webp": "image/webp",
	".bmp":  "image/bmp",
	".tiff": "image/tiff",
	".tif":  "image/tiff",
}

func (h *ImageHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case strings.HasPrefix(r.URL.Path, "/images/"):
		h.serveWorkingDirImage(w, r)
	case r.URL.Path == "/extra-image":
		h.serveExtraImage(w, r)
	default:
		http.NotFound(w, r)
	}
}

func (h *ImageHandler) serveWorkingDirImage(w http.ResponseWriter, r *http.Request) {
	filename := strings.TrimPrefix(r.URL.Path, "/images/")
	if filename == "" {
		http.NotFound(w, r)
		return
	}

	workingDir := h.imageService.GetWorkingDir()
	if workingDir == "" {
		http.NotFound(w, r)
		return
	}

	filePath := filepath.Join(workingDir, filename)

	absWorkDir, err := filepath.Abs(workingDir)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	absFile, err := filepath.Abs(filePath)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if !strings.HasPrefix(absFile, absWorkDir+string(os.PathSeparator)) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	h.serveFile(w, r, filePath)
}

func (h *ImageHandler) serveExtraImage(w http.ResponseWriter, r *http.Request) {
	encodedPath := r.URL.Query().Get("path")
	if encodedPath == "" {
		http.NotFound(w, r)
		return
	}

	absPath, err := url.PathUnescape(encodedPath)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// Validate path is within the profile's ExtraImageRoot
	profile := h.profileService.GetActiveProfile()
	if profile == nil || profile.ExtraImageRoot == "" {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	absRoot, err := filepath.Abs(profile.ExtraImageRoot)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	absFile, err := filepath.Abs(absPath)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if !strings.HasPrefix(absFile, absRoot+string(os.PathSeparator)) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	h.serveFile(w, r, absFile)
}

func (h *ImageHandler) serveFile(w http.ResponseWriter, r *http.Request, filePath string) {
	ext := strings.ToLower(filepath.Ext(filePath))
	if ct, ok := mimeTypes[ext]; ok {
		w.Header().Set("Content-Type", ct)
	}
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	http.ServeFile(w, r, filePath)
}
