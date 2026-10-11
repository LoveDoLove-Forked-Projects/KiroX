// app_settings.go 提供存储目录、界面语言和设置持久化接口。

package main

import (
	"reg_go/internal/proxy"
	"reg_go/internal/storage"
)

// GetDataDir 返回当前本地数据目录。
func (a *App) GetDataDir() string {
	return storage.GetDataDir()
}

// SetDataDir 设置自定义数据目录，并迁移旧目录中的数据。
func (a *App) SetDataDir(dir string) map[string]interface{} {
	path, err := storage.SetDataDirPath(dir)
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}
	proxy.InitPool(path)
	return map[string]interface{}{"success": true, "path": path}
}

// ResetDataDir 恢复默认数据目录，并迁移已有数据。
func (a *App) ResetDataDir() map[string]interface{} {
	path, err := storage.ResetDataDirPath()
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}
	proxy.InitPool(path)
	return map[string]interface{}{"success": true, "path": path}
}

// GetResultOutputDir 返回结果文件的输出目录。
func (a *App) GetResultOutputDir() string {
	return storage.GetResultOutputDir()
}

// SetResultOutputDir 设置结果输出目录。
func (a *App) SetResultOutputDir(dir string) map[string]interface{} {
	path, err := storage.SetResultOutputDir(dir)
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}
	return map[string]interface{}{"success": true, "path": path}
}

// ResetResultOutputDir 恢复默认输出目录。
func (a *App) ResetResultOutputDir() map[string]interface{} {
	path, err := storage.ResetResultOutputDir()
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}
	return map[string]interface{}{"success": true, "path": path}
}

// GetLanguage 返回界面语言代码，未设置时返回空字符串。
func (a *App) GetLanguage() string {
	return storage.GetLanguage()
}

// GetAppSettings 返回规范化后的用户设置。
func (a *App) GetAppSettings() storage.AppSettings {
	return storage.GetAppSettings()
}

// SaveAppSettings 保存用户设置，并应用日志配置。
func (a *App) SaveAppSettings(settings storage.AppSettings) map[string]interface{} {
	saved, err := storage.SaveAppSettings(settings)
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}
	storage.ConfigurePersistentLogs(saved.PersistentLogs, saved.LogRetentionDays)
	return map[string]interface{}{"success": true, "settings": saved}
}

// GetOSLanguage 返回操作系统语言代码，用于首次启动选择界面语言。
func (a *App) GetOSLanguage() string {
	return detectOSLanguage()
}
