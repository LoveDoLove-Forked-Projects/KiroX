// accounts_flush.go 协调邮箱缓存的延迟刷盘和同步落盘。

package storage

import (
	"time"
)

// scheduleFlush 重置延迟写盘计时器；调用者必须持有 accountsMu 写锁。
func scheduleFlush() {
	if accountsFlushTimer != nil {
		accountsFlushTimer.Stop()
	}
	accountsFlushTimer = time.AfterFunc(500*time.Millisecond, flushAccountsToDisk)
}

func flushAccountsToDisk() {
	accountsLocationMu.RLock()
	defer accountsLocationMu.RUnlock()
	flushAccountsToDiskLocked()
}

// flushAccountsToDiskLocked 保存缓存快照；调用者必须持有目录位置锁。
func flushAccountsToDiskLocked() {
	// 快照获取和写盘一并串行化，防止旧快照在新快照之后写入磁盘。
	accountsFlushMu.Lock()
	defer accountsFlushMu.Unlock()
	accountsMu.RLock()
	if !accountsDirty {
		accountsMu.RUnlock()
		return
	}
	data := cloneAccounts(accountsCache)
	version := accountsVersion
	accountsMu.RUnlock()

	err := SaveJSON(GetAccountsPath(), data)

	accountsMu.Lock()
	// 写盘期间可能发生修改，只有版本一致才能清除待写标记。
	if err == nil && accountsVersion == version {
		accountsDirty = false
	}
	accountsMu.Unlock()
}

// FlushAccountsSync 取消待执行的计时器，并同步保存本地缓存。
func FlushAccountsSync() {
	accountsLocationMu.RLock()
	defer accountsLocationMu.RUnlock()
	flushAccountsSyncLocked()
}

// flushAccountsSyncLocked 同步保存缓存；调用者必须持有目录位置锁。
func flushAccountsSyncLocked() {
	accountsMu.Lock()
	if accountsFlushTimer != nil {
		accountsFlushTimer.Stop()
		accountsFlushTimer = nil
	}
	accountsMu.Unlock()
	flushAccountsToDiskLocked()
}
