// settings_test.go 验证设置升级、字段清理与边界值规范化。

package storage

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestSchemaTwoSettingsGainRecommendedRuntimeDefaults(t *testing.T) {
	localBase, _ := isolateStorageLayout(t)
	path := filepath.Join(localBase, "KiroX", "settings.json")
	writeTestFile(t, path, `{"schemaVersion":2,"language":"en"}`)

	settings := GetAppSettings()
	if settings.EmailProxyMode != "follow-task" || settings.OTPTimeoutSeconds != 120 || !settings.StopOnRisk {
		t.Fatalf("unexpected resilience defaults: %+v", settings)
	}
	if settings.Language != "en" || settings.Theme != "system" || !settings.AutoCheckUpdates {
		t.Fatalf("legacy language or interface defaults were not migrated: %+v", settings)
	}
}

func TestSaveAppSettingsNormalizesBounds(t *testing.T) {
	isolateStorageLayout(t)
	settings := DefaultAppSettings()
	settings.SoundVolume = 150
	settings.EmailProxyMode = "custom"
	settings.EmailProxy = "127.0.0.1:1080"

	saved, err := SaveAppSettings(settings)
	if err != nil {
		t.Fatal(err)
	}
	if saved.SoundVolume != 70 {
		t.Fatalf("numeric settings were not normalized: %+v", saved)
	}
	if saved.EmailProxy != "socks5://127.0.0.1:1080" {
		t.Fatalf("custom email proxy = %q", saved.EmailProxy)
	}
}

func TestStoredSettingsDiscardRetiredRuntimeFields(t *testing.T) {
	localBase, _ := isolateStorageLayout(t)
	path := filepath.Join(localBase, "KiroX", "settings.json")
	retired := map[string]interface{}{
		"awsRegion": "other-region", "oidcBase": "not a URL",
		"requestTimeoutSeconds": 180, "fingerprintTTLHours": 168,
		"fingerprintOffsets": []int{100, 100, 100, 100, 100},
		"wafEnabled":         true, "unknownLegacyOption": "old-value",
		"fingerprintCurvePositions": []int{0, 25, 50, 75, 100},
		"telemetryEnabled":          false,
		"wafWebsiteURL":             "https://old.example", "wafWebsiteKey": "old-key",
		"wafIV": "old-iv", "wafContext": "old-context",
		"wafJSAPIScript":     "https://old.example/jsapi.js",
		"wafChallengeScript": "https://old.example/challenge.js",
		"wafCaptchaScript":   "https://old.example/captcha.js",
		"signinBase":         "https://old.example", "profileBase": "https://old.example",
		"viewBase": "https://old.example", "portalBase": "https://old.example",
		"startURL": "https://old.example", "kiroBase": "https://old.example",
		"kiroRedirectURI": "https://old.example", "directoryID": "old-directory",
	}
	runtime := map[string]interface{}{
		"language": "en", "soundEnabled": false, "otpTimeoutSeconds": 300,
	}
	for key, value := range retired {
		runtime[key] = value
	}
	data, err := json.Marshal(map[string]interface{}{
		"schemaVersion": 3, "runtime": runtime,
	})
	if err != nil {
		t.Fatal(err)
	}
	writeTestFile(t, path, string(data))

	settings := GetAppSettings()
	if settings.Language != "en" || settings.SoundEnabled || settings.OTPTimeoutSeconds != 300 {
		t.Fatalf("existing runtime preferences were changed: %+v", settings)
	}
	data, err = os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var stored struct {
		SchemaVersion int                        `json:"schemaVersion"`
		Runtime       map[string]json.RawMessage `json:"runtime"`
	}
	if err := json.Unmarshal(data, &stored); err != nil {
		t.Fatal(err)
	}
	if stored.SchemaVersion != settingsSchemaVersion {
		t.Fatalf("settings schema = %d, want %d", stored.SchemaVersion, settingsSchemaVersion)
	}
	for key := range retired {
		if _, exists := stored.Runtime[key]; exists {
			t.Errorf("retired field %q survived in settings.json", key)
		}
	}
}
