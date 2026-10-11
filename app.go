// app.go 管理应用生命周期与既有任务接口。

package main

import (
	"context"
	"log"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"reg_go/internal/browser"
	"reg_go/internal/proxy"
	"reg_go/internal/storage"
	"reg_go/internal/task"
)

// App 保存桌面运行上下文，并向前端暴露应用接口。
type App struct {
	ctx         context.Context
	startupDone chan struct{}
}

// NewApp 创建应用实例，并准备启动完成信号。
func NewApp() *App {
	return &App{startupDone: make(chan struct{})}
}

// startup 初始化桌面上下文、日志与本地存储配置。
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	close(a.startupDone)
	// 重定向日志到内存
	log.SetOutput(&logWriter{})
	log.SetFlags(log.Ltime)

	// 初始化代理池（按数据目录持久化）
	proxy.InitPool(storage.GetDataDir())
	settings := storage.GetAppSettings()
	storage.ConfigurePersistentLogs(settings.PersistentLogs, settings.LogRetentionDays)

	// 居中显示窗口
	go func() {
		time.Sleep(200 * time.Millisecond)
		runtime.WindowCenter(ctx)
	}()

}

// restoreWindow 等待首次启动完成后恢复已有窗口。
func (a *App) restoreWindow() {
	<-a.startupDone
	runtime.WindowUnminimise(a.ctx)
	runtime.WindowShow(a.ctx)
}

// shutdown 在应用关闭前同步保存尚未写盘的本地缓存。
func (a *App) shutdown(ctx context.Context) {
	storage.FlushAccountsSync()
}

// GetStatus 获取任务状态
func (a *App) GetStatus() map[string]interface{} {
	return task.Manager.GetStatus()
}

// StartTask 启动注册任务
func (a *App) StartTask(req task.StartTaskRequest) map[string]interface{} {
	return task.StartTask(req)
}

// StopTask 停止注册任务
func (a *App) StopTask() map[string]interface{} {
	return task.StopTask(true)
}

// ResetFingerprintCache 清空所有按代理缓存的浏览器指纹，下一次注册重新生成
func (a *App) ResetFingerprintCache() map[string]interface{} {
	browser.ResetIdentityCache()
	return map[string]interface{}{"success": true}
}

// ListProxyPool 返回当前代理池
func (a *App) ListProxyPool() []proxy.PoolEntry {
	return proxy.List()
}

// AddProxyEntry 新增一条代理（url 会被归一化），weight 1-100
func (a *App) AddProxyEntry(name, rawURL string, weight int) map[string]interface{} {
	normalized := storage.NormalizeProxyAddress(rawURL)
	entry, err := proxy.Add(proxy.PoolEntry{Name: name, URL: normalized, Weight: weight})
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}
	return map[string]interface{}{"success": true, "entry": entry}
}

// UpdateProxyEntry 更新代理（按 id）
func (a *App) UpdateProxyEntry(id, name, rawURL string, weight int, enabled bool) map[string]interface{} {
	var u string
	if rawURL != "" {
		u = storage.NormalizeProxyAddress(rawURL)
	}
	entry, err := proxy.Update(id, proxy.PoolEntry{Name: name, URL: u, Weight: weight, Enabled: enabled})
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}
	return map[string]interface{}{"success": true, "entry": entry}
}

// DeleteProxyEntry 删除（按 id）
func (a *App) DeleteProxyEntry(id string) map[string]interface{} {
	if err := proxy.Delete(id); err != nil {
		return map[string]interface{}{"error": err.Error()}
	}
	return map[string]interface{}{"success": true}
}

// TestProxyByID 测试某条代理（按 id），并把探测结果持久化到代理池
func (a *App) TestProxyByID(id string) map[string]interface{} {
	entry, err := proxy.Get(id)
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}
	start := time.Now()
	info := proxy.Detect(entry.URL)
	ms := int(time.Since(start) / time.Millisecond)
	_ = proxy.SetProbe(id, info, ms)
	return map[string]interface{}{
		"ok": info.OK, "scheme": info.Scheme, "ip": info.IP,
		"country": info.Country, "countryCode": info.CountryCode,
		"region": info.Region, "city": info.City,
		"isp": info.ISP, "proxyType": info.ProxyType,
		"error": info.Error, "ms": ms,
	}
}
