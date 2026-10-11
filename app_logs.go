// app_logs.go 将应用日志分发到内存、磁盘和标准错误输出。

package main

import (
	"net/url"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"reg_go/internal/storage"
	"reg_go/internal/task"
)

// logWriter 将日志同步转发到内存、持久化日志和标准错误输出。
type logWriter struct{}

// Write 转发日志，并返回标准错误输出的写入结果。
func (w *logWriter) Write(p []byte) (int, error) {
	msg := string(p)
	task.Manager.AppendLog(msg)
	storage.AppendPersistentLog(msg)
	return os.Stderr.Write(p)
}

// GetLogs 获取内存中的运行日志。
func (a *App) GetLogs() []string {
	return task.Manager.GetLogs()
}

// OpenLogsDir 使用系统默认程序打开日志目录。
func (a *App) OpenLogsDir() {
	path := storage.GetLogsDir()
	runtime.BrowserOpenURL(a.ctx, (&url.URL{Scheme: "file", Path: path}).String())
}

// ClearLogs 清理磁盘日志，并返回处理结果。
func (a *App) ClearLogs() map[string]interface{} {
	if err := storage.ClearLogs(); err != nil {
		return map[string]interface{}{"error": err.Error()}
	}
	return map[string]interface{}{"success": true}
}
