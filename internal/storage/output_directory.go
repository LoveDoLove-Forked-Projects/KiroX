// output_directory.go 管理结果输出目录及其默认位置。

package storage

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// getDefaultResultOutputDir 默认输出目录：用户文档目录下的 KiroX 文件夹。
// 若无法解析用户主目录，回落到可执行文件所在目录下的 output。
func getDefaultResultOutputDir() string {
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		return filepath.Join(home, "Documents", "KiroX")
	}
	base := "."
	if exe, err := os.Executable(); err == nil {
		if resolved, err := filepath.EvalSymlinks(exe); err == nil {
			exe = resolved
		}
		base = filepath.Dir(exe)
	} else if cwd, err := os.Getwd(); err == nil {
		base = cwd
	}
	return filepath.Join(base, "output")
}

// GetResultOutputDir 返回结果输出目录，默认位于用户文档目录下的 KiroX。
func GetResultOutputDir() string {
	resultOutputMu.Lock()
	defer resultOutputMu.Unlock()
	if resultOutputDirCache == "" {
		settings := loadSettings()
		if custom := strings.TrimSpace(settings.ResultOutputDir); custom != "" {
			resultOutputDirCache = custom
		} else {
			resultOutputDirCache = getDefaultResultOutputDir()
		}
		os.MkdirAll(resultOutputDirCache, 0755)
	}
	return resultOutputDirCache
}

// SetResultOutputDir 设置自定义输出目录，已有 JSON 文件保留在原位置。
func SetResultOutputDir(dir string) (string, error) {
	resultOutputMu.Lock()
	defer resultOutputMu.Unlock()
	if dir == "" {
		return "", fmt.Errorf("目录不能为空")
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("创建目录失败: %w", err)
	}
	if err := updateSettings(func(settings *settingsFile) {
		settings.ResultOutputDir = dir
	}); err != nil {
		return "", fmt.Errorf("保存配置失败: %w", err)
	}
	resultOutputDirCache = dir
	return dir, nil
}

// ResetResultOutputDir 恢复用户文档目录下的默认输出位置。
func ResetResultOutputDir() (string, error) {
	resultOutputMu.Lock()
	defer resultOutputMu.Unlock()
	defaultDir := getDefaultResultOutputDir()
	if err := os.MkdirAll(defaultDir, 0o755); err != nil {
		return "", fmt.Errorf("创建默认输出目录失败: %w", err)
	}
	if err := updateSettings(func(settings *settingsFile) {
		settings.ResultOutputDir = ""
	}); err != nil {
		return "", err
	}
	resultOutputDirCache = defaultDir
	return defaultDir, nil
}
