// accounts.go 管理邮箱缓存、快照和修改事务。

package storage

import (
	"maps"
	"sync"
	"time"
)

var (
	accountsCache      []map[string]interface{}
	accountsLocationMu sync.RWMutex
	accountsMu         sync.RWMutex
	accountsLoadMu     sync.Mutex
	accountsFlushMu    sync.Mutex
	accountsLoaded     bool
	accountsDirty      bool
	accountsVersion    uint64
	accountsFlushTimer *time.Timer
)

func resetAccountsCache() {
	accountsLoadMu.Lock()
	defer accountsLoadMu.Unlock()
	accountsFlushMu.Lock()
	defer accountsFlushMu.Unlock()
	accountsMu.Lock()
	defer accountsMu.Unlock()
	if accountsFlushTimer != nil {
		accountsFlushTimer.Stop()
	}
	accountsCache = nil
	accountsLoaded = false
	accountsDirty = false
	accountsVersion = 0
	accountsFlushTimer = nil
}

func loadAccountsCache() {
	accountsMu.RLock()
	loaded := accountsLoaded
	accountsMu.RUnlock()
	if loaded {
		return
	}
	accountsLoadMu.Lock()
	defer accountsLoadMu.Unlock()
	accountsMu.RLock()
	loaded = accountsLoaded
	accountsMu.RUnlock()
	if loaded {
		return
	}

	data, err := LoadJSON(GetAccountsPath())
	if err != nil {
		data = []map[string]interface{}{}
	}
	accountsMu.Lock()
	// 磁盘读取期间若缓存已被替换，保留新缓存，避免旧快照覆盖修改。
	if !accountsLoaded {
		accountsCache = data
		accountsLoaded = true
	}
	accountsMu.Unlock()
}

func cloneAccounts(accounts []map[string]interface{}) []map[string]interface{} {
	result := make([]map[string]interface{}, len(accounts))
	for i, account := range accounts {
		// 当前字段均为标量；逐条复制映射以隔离读取者对缓存的修改。
		result[i] = maps.Clone(account)
	}
	return result
}

// GetAccountsCached 返回本地邮箱缓存的独立快照。
func GetAccountsCached() []map[string]interface{} {
	accountsLocationMu.RLock()
	defer accountsLocationMu.RUnlock()
	loadAccountsCache()
	accountsMu.RLock()
	defer accountsMu.RUnlock()
	return cloneAccounts(accountsCache)
}

// ModifyAccountsCached 在锁内修改邮箱缓存，并安排延迟写盘。
// 回调不得再次调用缓存接口，以免重复获取同一把锁。
func ModifyAccountsCached(fn func([]map[string]interface{}) []map[string]interface{}) {
	accountsLocationMu.RLock()
	defer accountsLocationMu.RUnlock()
	loadAccountsCache()
	accountsMu.Lock()
	accountsCache = fn(accountsCache)
	accountsDirty = true
	accountsVersion++
	scheduleFlush()
	accountsMu.Unlock()
}
