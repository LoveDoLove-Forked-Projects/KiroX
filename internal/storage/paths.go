// paths.go 解析应用目录并初始化本地存储布局。

package storage

import (
	"os"
	"path/filepath"
)

// GetAppRootDir 获取安装版的应用根目录。Windows 下为 %LOCALAPPDATA%\KiroX。
func GetAppRootDir() string {
	baseDir, err := localDataBaseResolver()
	if err != nil {
		baseDir = "."
	}
	return filepath.Join(baseDir, "KiroX")
}

// GetDefaultDataDir 获取默认业务数据目录。
func GetDefaultDataDir() string {
	return filepath.Join(GetAppRootDir(), "data")
}

// GetCacheDir 获取可安全重建的缓存目录。
func GetCacheDir() string {
	dir := filepath.Join(GetAppRootDir(), "cache")
	_ = os.MkdirAll(dir, 0o755)
	return dir
}

// GetLogsDir 获取应用日志目录。
func GetLogsDir() string {
	dir := filepath.Join(GetAppRootDir(), "logs")
	_ = os.MkdirAll(dir, 0o755)
	return dir
}

func getSettingsFilePath() string {
	return filepath.Join(GetAppRootDir(), "settings.json")
}

func ensureStorageLayout() error {
	layoutOnce.Do(func() {
		for _, dir := range []string{GetAppRootDir(), GetDefaultDataDir(), GetCacheDir(), GetLogsDir()} {
			if err := os.MkdirAll(dir, 0o755); err != nil {
				layoutErr = err
				return
			}
		}
		layoutErr = migrateLegacyLayout()
	})
	return layoutErr
}
