// migration.go 兼容旧版配置并复制业务数据到新目录。

package storage

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
)

type fileMigration struct {
	Destination string
	Sources     []string
}

var businessDataMigrations = []fileMigration{
	{Destination: "accounts.json", Sources: []string{"accounts.json", "accounts.dat"}},
	{Destination: "moemail.json", Sources: []string{"moemail.json", "moemail.dat"}},
	{Destination: "cloudmail.json", Sources: []string{"cloudmail.json", "cloudmail.dat"}},
	{Destination: "mailnest.json", Sources: []string{"mailnest.json", "mailnest.dat"}},
	{Destination: "proxy_pool.json", Sources: []string{"proxy_pool.json"}},
}

func getLegacyRootDir() string {
	configDir, err := configBaseResolver()
	if err != nil {
		configDir = "."
	}
	return filepath.Join(configDir, "kirox")
}

func getLegacyConfigFilePath() string {
	return filepath.Join(getLegacyRootDir(), "storage.conf")
}

// loadLegacyConfigMap 解析旧版 storage.conf；兼容整文件仅保存 data_dir 的格式。
func loadLegacyConfigMap() map[string]string {
	m := map[string]string{}
	data, err := os.ReadFile(getLegacyConfigFilePath())
	if err != nil {
		return m
	}
	text := strings.TrimSpace(string(data))
	if text == "" {
		return m
	}
	if !strings.ContainsRune(text, '=') {
		m[keyDataDir] = text
		return m
	}
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		i := strings.IndexByte(line, '=')
		if i < 0 {
			continue
		}
		k := strings.TrimSpace(line[:i])
		v := strings.TrimSpace(line[i+1:])
		if k != "" {
			m[k] = v
		}
	}
	return m
}

// migrateLegacyLayout 初始化新存储布局，并兼容旧版便携目录和 Roaming 配置。
// 迁移保留源文件，以便升级失败时回退。
func migrateLegacyLayout() error {
	settingsPath := getSettingsFilePath()
	if _, err := os.Stat(settingsPath); err == nil {
		settings := readSettingsFile()
		return writeSettingsFile(settings)
	} else if !os.IsNotExist(err) {
		return err
	}

	legacy := loadLegacyConfigMap()
	legacyRoot := getLegacyRootDir()
	dataDir := GetDefaultDataDir()
	sourceDir := legacyRoot
	if custom := strings.TrimSpace(legacy[keyDataDir]); custom != "" {
		custom = filepath.Clean(custom)
		if info, err := os.Stat(custom); err == nil && info.IsDir() {
			dataDir = custom
			sourceDir = custom
		}
	}

	migrated, err := migrateData(sourceDir, dataDir)
	if err != nil {
		return fmt.Errorf("迁移旧业务数据失败: %w", err)
	}
	cacheMigrated, err := migrateFiles(sourceDir, GetCacheDir(), []fileMigration{
		{Destination: "identities.json", Sources: []string{"identities.json", "identities.dat"}},
	})
	if err != nil {
		return fmt.Errorf("迁移旧缓存失败: %w", err)
	}

	settings := settingsFile{
		SchemaVersion:   settingsSchemaVersion,
		ResultOutputDir: strings.TrimSpace(legacy[keyResultOutputDir]),
		Proxy:           strings.TrimSpace(legacy[keyProxy]),
		Language:        strings.TrimSpace(legacy[keyLanguage]),
		Runtime:         DefaultAppSettings(),
	}
	settings.Runtime.Language = settings.Language
	if dataDir != GetDefaultDataDir() {
		settings.DataDir = dataDir
	}
	if err := writeSettingsFile(settings); err != nil {
		return fmt.Errorf("写入新设置文件失败: %w", err)
	}
	if migrated+cacheMigrated > 0 {
		log.Printf("[存储] 已从旧版目录复制 %d 个文件", migrated+cacheMigrated)
	}
	return nil
}

// migrateData 将旧目录中的全部业务数据文件复制到新目录。
func migrateData(oldDir, newDir string) (int, error) {
	return migrateFiles(oldDir, newDir, businessDataMigrations)
}

func migrateFiles(oldDir, newDir string, migrations []fileMigration) (int, error) {
	if err := os.MkdirAll(newDir, 0o755); err != nil {
		return 0, err
	}
	migrated := 0
	for _, migration := range migrations {
		dst := filepath.Join(newDir, migration.Destination)
		if _, err := os.Stat(dst); err == nil {
			continue
		} else if !os.IsNotExist(err) {
			return migrated, err
		}

		for _, sourceName := range migration.Sources {
			src := filepath.Join(oldDir, sourceName)
			info, err := os.Stat(src)
			if os.IsNotExist(err) {
				continue
			}
			if err != nil {
				return migrated, err
			}
			if !info.Mode().IsRegular() {
				continue
			}
			data, err := os.ReadFile(src)
			if err != nil {
				return migrated, err
			}
			if err := os.WriteFile(dst, data, 0o600); err != nil {
				return migrated, err
			}
			migrated++
			break
		}
	}
	return migrated, nil
}
