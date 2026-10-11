// accounts_test.go 验证邮箱缓存的快照隔离和并发访问。

package storage

import (
	"encoding/json"
	"sync"
	"testing"
	"time"
)

func TestAccountsCacheOwnsInputAndReturnedMaps(t *testing.T) {
	isolateAccountsCache(t)
	input := []map[string]interface{}{{"email": "user@example.com", "registered": false}}
	setAccountsCached(input)
	input[0]["email"] = "mutated-input@example.com"
	snapshot := GetAccountsCached()
	snapshot[0]["email"] = "mutated-snapshot@example.com"
	ModifyAccountsCached(func(accounts []map[string]interface{}) []map[string]interface{} {
		accounts[0]["registered"] = true
		return accounts
	})
	if snapshot[0]["registered"] != false {
		t.Fatal("cache mutation changed an earlier snapshot")
	}
	latest := GetAccountsCached()
	if latest[0]["email"] != "user@example.com" || latest[0]["registered"] != true {
		t.Fatalf("cache shares maps with caller: %v", latest)
	}
}

func TestAccountsInitialLoadDoesNotBlockOrOverwriteReplacement(t *testing.T) {
	path := isolateAccountsCache(t)
	if err := SaveJSON(path, []map[string]interface{}{{"email": "old@example.com"}}); err != nil {
		t.Fatal(err)
	}
	fileMu := getFileMutex(path)
	fileMu.Lock()
	var unlockOnce sync.Once
	defer unlockOnce.Do(fileMu.Unlock)
	loaded := make(chan []map[string]interface{}, 1)
	go func() { loaded <- GetAccountsCached() }()
	deadline := time.Now().Add(5 * time.Second)
	for accountsLoadMu.TryLock() {
		accountsLoadMu.Unlock()
		if time.Now().After(deadline) {
			t.Fatal("initial load did not start")
		}
		time.Sleep(time.Millisecond)
	}
	replaced := make(chan struct{})
	go func() {
		setAccountsCached([]map[string]interface{}{{"email": "new@example.com"}})
		close(replaced)
	}()
	waitForSignal(t, replaced, "cache replacement while initial disk read is blocked")
	unlockOnce.Do(fileMu.Unlock)
	select {
	case accounts := <-loaded:
		if len(accounts) != 1 || accounts[0]["email"] != "new@example.com" {
			t.Fatalf("initial disk load overwrote replacement: %v", accounts)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("initial load did not finish")
	}
}

func TestAccountsConcurrentReadersModifiersAndFlushes(t *testing.T) {
	path := isolateAccountsCache(t)
	const count = 32
	accounts := make([]map[string]interface{}, count)
	for i := range accounts {
		accounts[i] = map[string]interface{}{"index": i, "registered": false}
	}
	setAccountsCached(accounts)
	var workers sync.WaitGroup
	for i := range accounts {
		workers.Add(3)
		go func() {
			defer workers.Done()
			ModifyAccountsCached(func(accounts []map[string]interface{}) []map[string]interface{} {
				accounts[i]["registered"] = true
				return accounts
			})
		}()
		go func() {
			defer workers.Done()
			if _, err := json.Marshal(GetAccountsCached()); err != nil {
				t.Error(err)
			}
		}()
		go func() {
			defer workers.Done()
			FlushAccountsSync()
		}()
	}
	workers.Wait()
	FlushAccountsSync()
	saved, err := LoadJSON(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(saved) != count {
		t.Fatalf("saved %d accounts, want %d", len(saved), count)
	}
	for _, account := range saved {
		if account["registered"] != true {
			t.Errorf("status update was lost: %v", account)
		}
	}
}
