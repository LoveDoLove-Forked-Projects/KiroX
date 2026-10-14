// app_startup.go 在桌面窗口创建失败时保留启动诊断。

package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"reg_go/internal/storage"
)

// reportStartupError 保存启动错误，并在 Windows 下显示原生提示。
func reportStartupError(err error) {
	path := filepath.Join(storage.GetLogsDir(), "startup.log")
	if writeErr := writeStartupErrorLog(path, err); writeErr != nil {
		log.Printf("无法保存启动日志: %v", writeErr)
		path = ""
	}
	title := "KiroX could not start"
	message := fmt.Sprintf("%v\n\nCheck that the installer matches your system architecture and Microsoft Edge WebView2 Runtime is installed.", err)
	logLabel := "Startup log: "
	switch detectOSLanguage() {
	case "zh":
		title = "KiroX 无法启动"
		message = fmt.Sprintf("%v\n\n请确认安装包与系统架构匹配，并已安装 Microsoft Edge WebView2 Runtime。", err)
		logLabel = "启动日志："
	case "ja":
		title = "KiroX を起動できません"
		message = fmt.Sprintf("%v\n\nインストーラーがシステムのアーキテクチャと一致し、Microsoft Edge WebView2 Runtime がインストールされているか確認してください。", err)
		logLabel = "起動ログ: "
	}
	if path != "" {
		message += "\n\n" + logLabel + path
	}
	showStartupError(title, message)
}

// writeStartupErrorLog 追加平台信息和错误，保留前次启动诊断。
func writeStartupErrorLog(path string, err error) error {
	file, openErr := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if openErr != nil {
		return openErr
	}
	_, writeErr := fmt.Fprintf(file, "%s os=%s arch=%s go=%s\nerror=%v\n\n",
		time.Now().Format(time.RFC3339), runtime.GOOS, runtime.GOARCH, runtime.Version(), err)
	closeErr := file.Close()
	if writeErr != nil {
		return writeErr
	}
	return closeErr
}
