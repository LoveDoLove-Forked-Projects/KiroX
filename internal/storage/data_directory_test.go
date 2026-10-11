// data_directory_test.go 验证数据目录切换后重新加载邮箱缓存。

package storage

import (
	"path/filepath"
	"testing"
)

func TestSetDataDirReloadsAccountsFromNewDirectory(t *testing.T) {
	isolateStorageLayout(t)
	resetAccountsCache()
	t.Cleanup(resetAccountsCache)

	oldDir := GetDataDir()
	setAccountsCached([]map[string]interface{}{{"email": "old@example.com"}})
	FlushAccountsSync()

	newDir := t.TempDir()
	if err := SaveJSON(filepath.Join(newDir, "accounts.json"), []map[string]interface{}{{"email": "new@example.com"}}); err != nil {
		t.Fatal(err)
	}
	if _, err := SetDataDirPath(newDir); err != nil {
		t.Fatal(err)
	}
	accounts := GetAccountsCached()
	if len(accounts) != 1 || accounts[0]["email"] != "new@example.com" {
		t.Fatalf("account cache was not reloaded from new directory: %v", accounts)
	}
	assertFileContent(t, filepath.Join(oldDir, "accounts.json"), `[{"email":"old@example.com"}]`)
}
