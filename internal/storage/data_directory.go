// data_directory.go 管理数据目录切换及邮箱缓存的生命周期。

package storage

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
)

// GetDataDir 返回应用数据目录，优先使用有效的自定义目录。
func GetDataDir() string {
	dataDirMu.Lock()
	defer dataDirMu.Unlock()
	return getDataDirLocked()
}

func getDataDirLocked() string {
	if dataDirCache == "" {
		settings := loadSettings()
		custom := strings.TrimSpace(settings.DataDir)
		if custom != "" {
			if info, err := os.Stat(custom); err == nil && info.IsDir() {
				dataDirCache = custom
			}
		}
		if dataDirCache == "" {
			dataDirCache = GetDefaultDataDir()
		}
		os.MkdirAll(dataDirCache, 0755)
	}
	return dataDirCache
}

// SetDataDirPath 设置自定义存储目录并迁移全部业务数据文件。
func SetDataDirPath(dir string) (string, error) {
	dir = filepath.Clean(strings.TrimSpace(dir))
	if dir == "" || dir == "." {
		return "", fmt.Errorf("目录不能为空")
	}
	accountsLocationMu.Lock()
	defer accountsLocationMu.Unlock()
	flushAccountsSyncLocked()
	// 按目录位置锁、目录缓存锁的顺序加锁，与缓存读写保持一致。
	dataDirMu.Lock()
	defer dataDirMu.Unlock()
	oldDir := getDataDirLocked()

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("创建目录失败: %w", err)
	}

	if oldDir != "" && oldDir != dir {
		migrated, migErr := migrateData(oldDir, dir)
		if migErr != nil {
			return "", fmt.Errorf("数据迁移失败: %w", migErr)
		}
		if migrated > 0 {
			log.Printf("已迁移 %d 个数据文件: %s → %s", migrated, oldDir, dir)
		}
	}

	if err := updateSettings(func(settings *settingsFile) {
		settings.DataDir = dir
	}); err != nil {
		return "", fmt.Errorf("保存配置失败: %w", err)
	}

	dataDirCache = dir
	resetAccountsCache()

	return dir, nil
}

// ResetDataDirPath 恢复默认数据目录，并迁移已有数据。
func ResetDataDirPath() (string, error) {
	accountsLocationMu.Lock()
	defer accountsLocationMu.Unlock()
	flushAccountsSyncLocked()
	// 按目录位置锁、目录缓存锁的顺序加锁，与缓存读写保持一致。
	dataDirMu.Lock()
	defer dataDirMu.Unlock()
	oldDir := getDataDirLocked()
	defaultDir := GetDefaultDataDir()

	if oldDir != "" && oldDir != defaultDir {
		migrated, err := migrateData(oldDir, defaultDir)
		if err != nil {
			return "", fmt.Errorf("数据迁移失败: %w", err)
		}
		if migrated > 0 {
			log.Printf("已迁移 %d 个数据文件: %s → %s", migrated, oldDir, defaultDir)
		}
	}

	if err := updateSettings(func(settings *settingsFile) {
		settings.DataDir = ""
	}); err != nil {
		return "", fmt.Errorf("保存配置失败: %w", err)
	}

	os.MkdirAll(defaultDir, 0o755)
	dataDirCache = defaultDir
	resetAccountsCache()

	return defaultDir, nil
}

// GetAccountsPath 返回本地 Outlook 邮箱列表文件的路径。
func GetAccountsPath() string {
	return filepath.Join(GetDataDir(), "accounts.json")
}
