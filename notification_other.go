//go:build !windows

// notification_other.go 为未集成原生通知的平台提供回退实现。

package main

// showDesktopNotification 在未集成原生通知的平台上直接返回成功。
func showDesktopNotification(_, _ string) error {
	return nil
}
