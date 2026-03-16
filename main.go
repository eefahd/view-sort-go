package main

import (
	"embed"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()
	imageHandler := NewImageHandler(app.imageService)

	// Check for a file path passed as CLI argument (e.g. terminal or drag onto icon)
	if len(os.Args) > 1 {
		arg := os.Args[1]
		if isImageFile(arg) {
			app.SetInitialFile(arg)
		}
	}

	err := wails.Run(&options.App{
		Title:  "ViewSortGo",
		Width:  1280,
		Height: 800,
		AssetServer: &assetserver.Options{
			Assets:  assets,
			Handler: imageHandler,
		},
		BackgroundColour: &options.RGBA{R: 30, G: 30, B: 30, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
		Mac: &mac.Options{
			// Called by macOS when user opens a file with this app (Finder double-click, "Open With", etc.)
			OnFileOpen: func(filePath string) {
				app.HandleFileOpen(filePath)
			},
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
