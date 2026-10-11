// accounts_helpers_test.go 提供邮箱缓存与阻塞写盘的测试夹具。

package storage

import (
	"path/filepath"
	"sync"
	"testing"
	"time"
)

// setAccountsCached 替换邮箱缓存并触发异步写盘，供并发测试使用。
func setAccountsCached(accounts []map[string]interface{}) {
	accountsLocationMu.RLock()
	defer accountsLocationMu.RUnlock()
	accountsMu.Lock()
	accountsCache = cloneAccounts(accounts)
	accountsLoaded = true
	accountsDirty = true
	accountsVersion++
	scheduleFlush()
	accountsMu.Unlock()
}

func isolateAccountsCache(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	dataDirMu.Lock()
	oldDir := dataDirCache
	dataDirMu.Unlock()
	accountsMu.Lock()
	oldCache, oldLoaded, oldDirty, oldVersion := accountsCache, accountsLoaded, accountsDirty, accountsVersion
	if accountsFlushTimer != nil {
		accountsFlushTimer.Stop()
	}
	accountsCache, accountsLoaded, accountsDirty, accountsVersion, accountsFlushTimer = nil, false, false, 0, nil
	accountsMu.Unlock()
	dataDirMu.Lock()
	dataDirCache = dir
	dataDirMu.Unlock()
	t.Cleanup(func() {
		FlushAccountsSync()
		accountsLoadMu.Lock()
		defer accountsLoadMu.Unlock()
		accountsFlushMu.Lock()
		defer accountsFlushMu.Unlock()
		accountsMu.Lock()
		accountsCache, accountsLoaded, accountsDirty, accountsVersion = oldCache, oldLoaded, oldDirty, oldVersion
		accountsMu.Unlock()
		dataDirMu.Lock()
		dataDirCache = oldDir
		dataDirMu.Unlock()
	})
	return filepath.Join(dir, "accounts.json")
}

type blockingJSONValue struct {
	entered chan struct{}
	release chan struct{}
	once    sync.Once
}

func (v *blockingJSONValue) MarshalJSON() ([]byte, error) {
	v.once.Do(func() { close(v.entered) })
	<-v.release
	return []byte(`"stored"`), nil
}

func waitForSignal(t *testing.T, ch <-chan struct{}, action string) {
	t.Helper()
	select {
	case <-ch:
	case <-time.After(5 * time.Second):
		t.Fatalf("timed out waiting for %s", action)
	}
}
