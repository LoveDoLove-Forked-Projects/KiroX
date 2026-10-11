// accounts_flush_test.go 验证邮箱更新与写盘交错时不丢失新数据。

package storage

import (
	"sync"
	"testing"
)

func TestAccountsFlushPreservesUpdatesDuringIO(t *testing.T) {
	path := isolateAccountsCache(t)
	gate := &blockingJSONValue{entered: make(chan struct{}), release: make(chan struct{})}
	var releaseOnce sync.Once
	defer releaseOnce.Do(func() { close(gate.release) })
	setAccountsCached([]map[string]interface{}{{"email": "user@example.com", "registered": false, "gate": gate}})
	flushed := make(chan struct{})
	go func() {
		FlushAccountsSync()
		close(flushed)
	}()
	waitForSignal(t, gate.entered, "flush to start writing")

	updated := make(chan struct{})
	go func() {
		ModifyAccountsCached(func(accounts []map[string]interface{}) []map[string]interface{} {
			accounts[0]["registered"] = true
			return accounts
		})
		close(updated)
	}()
	waitForSignal(t, updated, "memory update while disk I/O is blocked")
	accountsMu.Lock()
	accountsFlushTimer.Stop()
	accountsFlushTimer = nil
	accountsMu.Unlock()
	releaseOnce.Do(func() { close(gate.release) })
	waitForSignal(t, flushed, "first flush")
	accountsMu.RLock()
	dirty := accountsDirty
	accountsMu.RUnlock()
	if !dirty {
		t.Fatal("old flush cleared the newer update's dirty flag")
	}
	first, err := LoadJSON(path)
	if err != nil {
		t.Fatal(err)
	}
	if first[0]["registered"] != false {
		t.Fatalf("flush snapshot changed during encoding: %v", first)
	}
	FlushAccountsSync()
	latest, err := LoadJSON(path)
	if err != nil {
		t.Fatal(err)
	}
	if latest[0]["registered"] != true {
		t.Fatalf("newer update was not persisted: %v", latest)
	}
}

func TestAccountsConcurrentFlushesPersistLatestSnapshot(t *testing.T) {
	path := isolateAccountsCache(t)
	gate := &blockingJSONValue{entered: make(chan struct{}), release: make(chan struct{})}
	var releaseOnce sync.Once
	defer releaseOnce.Do(func() { close(gate.release) })
	setAccountsCached([]map[string]interface{}{{"email": "user@example.com", "revision": 1, "gate": gate}})
	firstDone, secondDone := make(chan struct{}), make(chan struct{})
	go func() {
		FlushAccountsSync()
		close(firstDone)
	}()
	waitForSignal(t, gate.entered, "first flush to start writing")
	ModifyAccountsCached(func(accounts []map[string]interface{}) []map[string]interface{} {
		accounts[0]["revision"] = 2
		return accounts
	})
	go func() {
		FlushAccountsSync()
		close(secondDone)
	}()
	releaseOnce.Do(func() { close(gate.release) })
	waitForSignal(t, firstDone, "first flush")
	waitForSignal(t, secondDone, "second flush")
	latest, err := LoadJSON(path)
	if err != nil {
		t.Fatal(err)
	}
	if latest[0]["revision"] != float64(2) {
		t.Fatalf("concurrent flushes lost newest revision: %v", latest)
	}
}
