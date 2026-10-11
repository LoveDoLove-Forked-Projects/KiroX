// app_lang.go 将系统区域设置映射为支持的界面语言。

package main

import (
	"os"
	"strings"
)

// detectOSLanguage 返回 "zh"/"en"/"ja"，用于首次启动选默认界面语言。
// 优先级：LANG/LC_* 环境变量 → 平台原生 API → 回落 "en"。
func detectOSLanguage() string {
	for _, env := range []string{"LC_ALL", "LC_MESSAGES", "LANG", "LANGUAGE"} {
		if v := strings.TrimSpace(os.Getenv(env)); v != "" {
			if lang := mapLocaleToLang(v); lang != "" {
				return lang
			}
		}
	}
	if v := detectOSLanguageNative(); v != "" {
		return v
	}
	return "en"
}

// mapLocaleToLang 将区域设置映射为支持的语言代码，无法匹配时返回空字符串。
func mapLocaleToLang(locale string) string {
	s := strings.ToLower(locale)
	switch {
	case strings.HasPrefix(s, "zh"):
		return "zh"
	case strings.HasPrefix(s, "ja"):
		return "ja"
	case strings.HasPrefix(s, "en"):
		return "en"
	}
	return ""
}
