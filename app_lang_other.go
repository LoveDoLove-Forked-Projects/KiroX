//go:build !windows

// app_lang_other.go 为非 Windows 平台提供语言识别回退。

package main

// detectOSLanguageNative 返回空字符串，由通用实现读取环境变量或采用默认语言。
func detectOSLanguageNative() string { return "" }
