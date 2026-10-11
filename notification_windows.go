//go:build windows

// notification_windows.go 初始化应用通知标识并发送 Windows 桌面通知。

package main

import (
	"sync"

	toast "git.sr.ht/~jackmordaunt/go-toast/v2"
)

var (
	desktopNotificationInitOnce sync.Once
	desktopNotificationInitErr  error
)

// showDesktopNotification 在首次调用时初始化通知标识，随后发送静音通知。
func showDesktopNotification(title, message string) error {
	desktopNotificationInitOnce.Do(func() {
		desktopNotificationInitErr = toast.SetAppData(toast.AppData{AppID: "KiroX"})
	})
	if desktopNotificationInitErr != nil {
		return desktopNotificationInitErr
	}

	notification := toast.Notification{
		AppID:    "KiroX",
		Title:    title,
		Body:     message,
		Audio:    toast.Silent,
		Duration: toast.Short,
	}
	return notification.Push()
}
