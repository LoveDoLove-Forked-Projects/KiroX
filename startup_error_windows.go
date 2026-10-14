//go:build windows

// startup_error_windows.go 在 WebView2 窗口不可用时显示原生错误提示。

package main

import (
	"strings"

	"golang.org/x/sys/windows"
)

// showStartupError 显示不依赖 Wails 窗口的 Windows 消息框。
func showStartupError(title, message string) {
	caption, _ := windows.UTF16PtrFromString(strings.ReplaceAll(title, "\x00", ""))
	text, _ := windows.UTF16PtrFromString(strings.ReplaceAll(message, "\x00", ""))
	_, _ = windows.MessageBox(0, text, caption, windows.MB_OK|windows.MB_ICONERROR)
}
