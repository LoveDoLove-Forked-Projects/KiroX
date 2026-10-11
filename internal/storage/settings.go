// settings.go 读取、验证并原子持久化用户设置。

package storage

import (
	"encoding/json"
	"log"
	"os"
	"strings"
)

const (
	settingsSchemaVersion = 4
	keyDataDir            = "data_dir"
	keyResultOutputDir    = "result_output_dir"
	keyProxy              = "proxy"
	keyLanguage           = "language"
)

type settingsFile struct {
	SchemaVersion   int         `json:"schemaVersion"`
	DataDir         string      `json:"dataDir,omitempty"`
	ResultOutputDir string      `json:"resultOutputDir,omitempty"`
	Proxy           string      `json:"proxy,omitempty"`
	Language        string      `json:"language,omitempty"`
	Runtime         AppSettings `json:"runtime"`
}

func readSettingsFile() settingsFile {
	settings := settingsFile{SchemaVersion: settingsSchemaVersion, Runtime: DefaultAppSettings()}
	data, err := os.ReadFile(getSettingsFilePath())
	if err != nil {
		return settings
	}
	if err := json.Unmarshal(data, &settings); err != nil {
		log.Printf("[存储] settings.json 格式无效: %v", err)
		return settingsFile{SchemaVersion: settingsSchemaVersion, Runtime: DefaultAppSettings()}
	}
	if settings.SchemaVersion < 3 {
		settings.Runtime = DefaultAppSettings()
		settings.Runtime.Language = settings.Language
	}
	settings.Runtime = normalizeAppSettings(settings.Runtime)
	settings.SchemaVersion = settingsSchemaVersion
	return settings
}

func writeSettingsFile(settings settingsFile) error {
	settings.SchemaVersion = settingsSchemaVersion
	settings.Runtime = normalizeAppSettings(settings.Runtime)
	settings.Language = settings.Runtime.Language
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(GetAppRootDir(), 0o755); err != nil {
		return err
	}
	tmp := getSettingsFilePath() + ".tmp"
	if err := os.WriteFile(tmp, data, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, getSettingsFilePath())
}

// GetAppSettings 返回规范化后的用户设置副本。
func GetAppSettings() AppSettings {
	return loadSettings().Runtime
}

// SaveAppSettings 规范化用户设置，并通过临时文件替换原配置。
func SaveAppSettings(appSettings AppSettings) (AppSettings, error) {
	appSettings = normalizeAppSettings(appSettings)
	if err := updateSettings(func(settings *settingsFile) {
		settings.Runtime = appSettings
		settings.Language = appSettings.Language
	}); err != nil {
		return AppSettings{}, err
	}
	return appSettings, nil
}

func loadSettings() settingsFile {
	if err := ensureStorageLayout(); err != nil {
		log.Printf("[存储] 初始化目录失败: %v", err)
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	return readSettingsFile()
}

// updateSettings 在同一把锁内完成读、改、写，防止并发更新覆盖其他字段。
func updateSettings(update func(*settingsFile)) error {
	if err := ensureStorageLayout(); err != nil {
		return err
	}
	settingsMu.Lock()
	defer settingsMu.Unlock()
	settings := readSettingsFile()
	update(&settings)
	return writeSettingsFile(settings)
}

// GetLanguage 返回当前界面语言代码（"zh"/"en"/"ja"），未设置时返回空字符串。
func GetLanguage() string {
	return strings.TrimSpace(loadSettings().Language)
}
