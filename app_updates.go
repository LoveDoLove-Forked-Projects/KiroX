// app_updates.go 提供应用版本与更新查询接口。

package main

import (
	"reg_go/internal/updater"
)

// GetCurrentVersion 获取当前应用版本。
func (a *App) GetCurrentVersion() string {
	return updater.GetCurrentVersion()
}

// CheckUpdate 查询最新发布版本。
func (a *App) CheckUpdate() map[string]interface{} {
	return updater.CheckUpdate()
}
