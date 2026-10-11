// settings_types.go 定义用户设置、默认值与输入规范化。

package storage

import (
	"fmt"
	"strings"
)

// AppSettings 定义用户可配置的运行、界面与通知选项。
// 目录选项单独保存在 settings.json 顶层，以便应用初始化前读取。
type AppSettings struct {
	EmailProxyMode       string `json:"emailProxyMode"`
	EmailProxy           string `json:"emailProxy"`
	OTPTimeoutSeconds    int    `json:"otpTimeoutSeconds"`
	RetryProfile         string `json:"retryProfile"`
	StopOnRisk           bool   `json:"stopOnRisk"`
	SoundEnabled         bool   `json:"soundEnabled"`
	DesktopNotifications bool   `json:"desktopNotifications"`
	SoundVolume          int    `json:"soundVolume"`
	AutoCheckUpdates     bool   `json:"autoCheckUpdates"`
	Theme                string `json:"theme"`
	Language             string `json:"language"`
	PersistentLogs       bool   `json:"persistentLogs"`
	LogRetentionDays     int    `json:"logRetentionDays"`
	AutoProbeProxies     bool   `json:"autoProbeProxies"`
	MoeMailExpiryMinutes int    `json:"moeMailExpiryMinutes"`
}

// DefaultAppSettings 返回首次启动和无效字段回退使用的默认设置。
func DefaultAppSettings() AppSettings {
	return AppSettings{
		EmailProxyMode:       "follow-task",
		OTPTimeoutSeconds:    120,
		RetryProfile:         "standard",
		StopOnRisk:           true,
		SoundEnabled:         true,
		DesktopNotifications: true,
		SoundVolume:          70,
		AutoCheckUpdates:     true,
		Theme:                "system",
		LogRetentionDays:     7,
		AutoProbeProxies:     true,
		MoeMailExpiryMinutes: 60,
	}
}

func normalizeAppSettings(s AppSettings) AppSettings {
	d := DefaultAppSettings()
	if !oneOf(s.EmailProxyMode, "direct", "follow-task", "custom") {
		s.EmailProxyMode = d.EmailProxyMode
	}
	s.EmailProxy = NormalizeProxyAddress(strings.TrimSpace(s.EmailProxy))
	if s.EmailProxyMode != "custom" {
		s.EmailProxy = ""
	}
	if !oneOf(fmt.Sprint(s.OTPTimeoutSeconds), "60", "120", "180", "300") {
		s.OTPTimeoutSeconds = d.OTPTimeoutSeconds
	}
	if !oneOf(s.RetryProfile, "fast", "standard", "stable") {
		s.RetryProfile = d.RetryProfile
	}
	s.SoundVolume = clampDefault(s.SoundVolume, 0, 100, d.SoundVolume)
	if !oneOf(s.Theme, "system", "light", "dark") {
		s.Theme = d.Theme
	}
	if s.Language != "" && !oneOf(s.Language, "zh", "en", "ja") {
		s.Language = ""
	}
	s.LogRetentionDays = clampDefault(s.LogRetentionDays, 1, 90, d.LogRetentionDays)
	s.MoeMailExpiryMinutes = clampDefault(s.MoeMailExpiryMinutes, 10, 1440, d.MoeMailExpiryMinutes)
	return s
}

func clampDefault(value, minValue, maxValue, fallback int) int {
	if value < minValue || value > maxValue {
		return fallback
	}
	return value
}

func oneOf(value string, allowed ...string) bool {
	for _, candidate := range allowed {
		if value == candidate {
			return true
		}
	}
	return false
}
