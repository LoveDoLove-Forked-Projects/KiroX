// helpers_test.go 隔离本地存储环境并提供文件断言。

package storage

import (
	"os"
	"path/filepath"
	"sync"
	"testing"
)

func isolateStorageLayout(t *testing.T) (string, string) {
	t.Helper()
	localBase := filepath.Join(t.TempDir(), "local")
	configBase := filepath.Join(t.TempDir(), "roaming")
	oldLocalResolver := localDataBaseResolver
	oldConfigResolver := configBaseResolver
	localDataBaseResolver = func() (string, error) { return localBase, nil }
	configBaseResolver = func() (string, error) { return configBase, nil }
	resetStorageGlobalsForTest()
	t.Cleanup(func() {
		localDataBaseResolver = oldLocalResolver
		configBaseResolver = oldConfigResolver
		resetStorageGlobalsForTest()
	})
	return localBase, configBase
}

func resetStorageGlobalsForTest() {
	layoutOnce = sync.Once{}
	layoutErr = nil
	dataDirMu.Lock()
	dataDirCache = ""
	dataDirMu.Unlock()
	resultOutputMu.Lock()
	resultOutputDirCache = ""
	resultOutputMu.Unlock()
}

func writeTestFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
}

func assertFileContent(t *testing.T, path, want string) {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	if string(data) != want {
		t.Fatalf("%s = %q, want %q", path, data, want)
	}
}
