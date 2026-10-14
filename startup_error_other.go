//go:build !windows

// startup_error_other.go 保留其他平台的终端错误输出行为。

package main

// showStartupError 在非 Windows 平台由主流程输出错误和诊断日志。
func showStartupError(_, _ string) {}
