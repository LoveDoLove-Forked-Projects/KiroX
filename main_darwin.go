//go:build darwin
// +build darwin

// main_darwin.go 配置 macOS 桌面窗口选项。

package main

import (
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

// getPlatformOptions 返回 macOS 平台窗口选项。
func getPlatformOptions() []func(*options.App) {
	return []func(*options.App){
		func(app *options.App) {
			app.Frameless = false
			app.Mac = &mac.Options{
				TitleBar:             mac.TitleBarHiddenInset(),
				WebviewIsTransparent: true,
				WindowIsTranslucent:  false,
			}
		},
	}
}
