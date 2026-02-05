package main

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"view-sort-go/internal/services"
)

type ImageHandler struct {
	imageService *services.ImageService
}

func NewImageHandler(imageService *services.ImageService) *ImageHandler {
	return &ImageHandler{imageService: imageService}
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
	// Only handle /images/ requests
	if !strings.HasPrefix(r.URL.Path, "/images/") {
		// Pass through - return 404 so the default asset handler takes over
		http.NotFound(w, r)
		return
	}

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

	// Security: ensure the path is within the working directory
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

	ext := strings.ToLower(filepath.Ext(filename))
	if ct, ok := mimeTypes[ext]; ok {
		w.Header().Set("Content-Type", ct)
	}

	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	http.ServeFile(w, r, filePath)
}
