// migration_test.go 验证旧版目录迁移及数据文件保护。

package storage

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestLegacyRoamingLayoutMigratesToLocalAppData(t *testing.T) {
	localBase, configBase := isolateStorageLayout(t)
	legacyRoot := filepath.Join(configBase, "kirox")
	resultDir := filepath.Join(t.TempDir(), "results")
	writeTestFile(t, filepath.Join(legacyRoot, "storage.conf"),
		"result_output_dir="+resultDir+"\nproxy=127.0.0.1:8080\nlanguage=ja\n")

	legacyFiles := map[string]string{
		"accounts.dat":    "accounts",
		"moemail.dat":     "moemail",
		"cloudmail.dat":   "cloudmail",
		"mailnest.dat":    "mailnest",
		"proxy_pool.json": "proxy-pool",
		"identities.dat":  "identities",
	}
	for name, content := range legacyFiles {
		writeTestFile(t, filepath.Join(legacyRoot, name), content)
	}

	wantRoot := filepath.Join(localBase, "KiroX")
	wantDataDir := filepath.Join(wantRoot, "data")
	if got := GetDataDir(); got != wantDataDir {
		t.Fatalf("GetDataDir() = %q, want %q", got, wantDataDir)
	}
	for name, want := range map[string]string{
		"accounts.json":   "accounts",
		"moemail.json":    "moemail",
		"cloudmail.json":  "cloudmail",
		"mailnest.json":   "mailnest",
		"proxy_pool.json": "proxy-pool",
	} {
		assertFileContent(t, filepath.Join(wantDataDir, name), want)
	}
	assertFileContent(t, filepath.Join(wantRoot, "cache", "identities.json"), "identities")
	assertFileContent(t, filepath.Join(legacyRoot, "accounts.dat"), "accounts")

	data, err := os.ReadFile(filepath.Join(wantRoot, "settings.json"))
	if err != nil {
		t.Fatal(err)
	}
	var settings settingsFile
	if err := json.Unmarshal(data, &settings); err != nil {
		t.Fatal(err)
	}
	if settings.SchemaVersion != settingsSchemaVersion || settings.DataDir != "" ||
		settings.ResultOutputDir != resultDir || settings.Proxy != "127.0.0.1:8080" || settings.Language != "ja" {
		t.Fatalf("unexpected migrated settings: %+v", settings)
	}
}

func TestLegacyCustomDataDirIsRetainedAndNormalized(t *testing.T) {
	localBase, configBase := isolateStorageLayout(t)
	customDir := filepath.Join(t.TempDir(), "custom-data")
	writeTestFile(t, filepath.Join(configBase, "kirox", "storage.conf"), "data_dir="+customDir+"\n")
	writeTestFile(t, filepath.Join(customDir, "moemail.dat"), "custom-moemail")
	writeTestFile(t, filepath.Join(customDir, "identities.dat"), "custom-identities")

	if got := GetDataDir(); got != customDir {
		t.Fatalf("GetDataDir() = %q, want %q", got, customDir)
	}
	assertFileContent(t, filepath.Join(customDir, "moemail.json"), "custom-moemail")
	assertFileContent(t, filepath.Join(localBase, "KiroX", "cache", "identities.json"), "custom-identities")
	settings := readSettingsFile()
	if settings.DataDir != customDir || settings.SchemaVersion != settingsSchemaVersion {
		t.Fatalf("unexpected migrated settings: %+v", settings)
	}
}

func TestMigrateDataCopiesAllBusinessFilesWithoutOverwriting(t *testing.T) {
	oldDir := t.TempDir()
	newDir := t.TempDir()
	writeTestFile(t, filepath.Join(oldDir, "accounts.dat"), "old-accounts")
	writeTestFile(t, filepath.Join(oldDir, "moemail.dat"), "moemail")
	writeTestFile(t, filepath.Join(oldDir, "cloudmail.dat"), "cloudmail")
	writeTestFile(t, filepath.Join(oldDir, "mailnest.dat"), "mailnest")
	writeTestFile(t, filepath.Join(oldDir, "proxy_pool.json"), "proxy-pool")
	writeTestFile(t, filepath.Join(newDir, "accounts.json"), "existing-accounts")

	migrated, err := migrateData(oldDir, newDir)
	if err != nil {
		t.Fatal(err)
	}
	if migrated != 4 {
		t.Fatalf("migrated %d files, want 4", migrated)
	}
	assertFileContent(t, filepath.Join(newDir, "accounts.json"), "existing-accounts")
	for name, want := range map[string]string{
		"moemail.json": "moemail", "cloudmail.json": "cloudmail",
		"mailnest.json": "mailnest", "proxy_pool.json": "proxy-pool",
	} {
		assertFileContent(t, filepath.Join(newDir, name), want)
	}
	assertFileContent(t, filepath.Join(oldDir, "moemail.dat"), "moemail")
}
