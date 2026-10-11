//go:build linux
// +build linux

// main_linux.go 配置 Linux 桌面窗口选项。

package main

import (
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
)

// getPlatformOptions 返回 Linux 平台窗口选项。
func getPlatformOptions() []func(*options.App) {
	return []func(*options.App){
		func(app *options.App) {
			app.Linux = &linux.Options{
				ProgramName: "KiroX",
			}
		},
	}
}
