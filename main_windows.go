//go:build windows
// +build windows

// main_windows.go 配置 Windows 桌面窗口选项。

package main

import (
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

// getPlatformOptions 返回 Windows 平台窗口选项。
func getPlatformOptions() []func(*options.App) {
	return []func(*options.App){
		func(app *options.App) {
			app.Windows = &windows.Options{
				WebviewIsTransparent: false,
				WindowIsTranslucent:  false,
				DisableWindowIcon:    false,
			}
		},
	}
}
