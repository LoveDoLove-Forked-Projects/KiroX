// logs_test.go 验证持久化日志中的敏感信息脱敏。

package storage

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestPersistentLogsRedactCredentials(t *testing.T) {
	isolateStorageLayout(t)
	ConfigurePersistentLogs(true, 7)
	t.Cleanup(func() {
		persistentLogMu.Lock()
		persistentLogEnabled = false
		persistentLogMu.Unlock()
	})

	AppendPersistentLog("验证码: 123456 accessToken=secret-token\n")
	data, err := os.ReadFile(filepath.Join(GetLogsDir(), time.Now().Format("2006-01-02")+".log"))
	if err != nil {
		t.Fatal(err)
	}
	text := string(data)
	if strings.Contains(text, "123456") || strings.Contains(text, "secret-token") {
		t.Fatalf("persistent log contains credentials: %q", text)
	}
	if !strings.Contains(text, "<redacted>") {
		t.Fatalf("persistent log does not contain redaction marker: %q", text)
	}
}
