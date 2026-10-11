// settings_concurrency_test.go 验证并发读写设置时的缓存一致性。

package storage

import (
	"runtime"
	"sync"
	"testing"
)

func TestSettingsCachesConcurrentReadersAndSetters(t *testing.T) {
	isolateStorageLayout(t)
	resetAccountsCache()
	t.Cleanup(resetAccountsCache)
	homeDir := t.TempDir()
	t.Setenv("USERPROFILE", homeDir)
	t.Setenv("HOME", homeDir)
	GetDataDir()
	GetResultOutputDir()
	GetLanguage()
	start := make(chan struct{})
	stop := make(chan struct{})
	var readers, writers sync.WaitGroup
	for range 4 {
		readers.Add(1)
		go func() {
			defer readers.Done()
			<-start
			for {
				select {
				case <-stop:
					return
				default:
					if GetDataDir() == "" || GetResultOutputDir() == "" {
						t.Error("directory getter returned an empty path")
					}
					GetLanguage()
					runtime.Gosched()
				}
			}
		}()
	}
	for worker := range 2 {
		dataDir := t.TempDir()
		resultDir := t.TempDir()
		writers.Add(3)
		go func() {
			defer writers.Done()
			<-start
			for range 8 {
				if _, err := SetDataDirPath(dataDir); err != nil {
					t.Error(err)
				}
				if _, err := ResetDataDirPath(); err != nil {
					t.Error(err)
				}
			}
		}()
		go func() {
			defer writers.Done()
			<-start
			for range 8 {
				if _, err := SetResultOutputDir(resultDir); err != nil {
					t.Error(err)
				}
				if _, err := ResetResultOutputDir(); err != nil {
					t.Error(err)
				}
			}
		}()
		go func() {
			defer writers.Done()
			<-start
			settings := DefaultAppSettings()
			settings.Language = []string{"en", "ja"}[worker]
			for range 16 {
				if _, err := SaveAppSettings(settings); err != nil {
					t.Error(err)
				}
			}
		}()
	}
	close(start)
	writers.Wait()
	close(stop)
	readers.Wait()
	stored := loadSettings()
	wantDataDir := stored.DataDir
	if wantDataDir == "" {
		wantDataDir = GetDefaultDataDir()
	}
	if got := GetDataDir(); got != wantDataDir {
		t.Errorf("data directory cache = %q, persisted = %q", got, wantDataDir)
	}
	wantResultDir := stored.ResultOutputDir
	if wantResultDir == "" {
		wantResultDir = getDefaultResultOutputDir()
	}
	if got := GetResultOutputDir(); got != wantResultDir {
		t.Errorf("result directory cache = %q, persisted = %q", got, wantResultDir)
	}
	if got := GetLanguage(); got != stored.Language {
		t.Errorf("language cache = %q, persisted = %q", got, stored.Language)
	}
}
