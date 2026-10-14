package email

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"reg_go/internal/storage"
)

func getMailNestConfigPath() string {
	return filepath.Join(storage.GetDataDir(), "mailnest.json")
}

func TestMailNestConnection(configJSON string) map[string]interface{} {
	config, err := parseMailNestConfig(configJSON)
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}

	client := NewMailNestClient(config)
	defer client.client.CloseIdleConnections()
	balance, err := client.GetBalance()
	if err != nil {
		return map[string]interface{}{"error": "连接失败: " + err.Error()}
	}

	return map[string]interface{}{
		"success": true,
		"balance": balance.Balance,
	}
}

func SaveMailNestConfig(jsonData string) map[string]interface{} {
	config, err := parseMailNestConfig(jsonData)
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}
	data, err := json.Marshal(config)
	if err != nil {
		return map[string]interface{}{"error": "配置格式错误: " + err.Error()}
	}
	path := getMailNestConfigPath()
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return map[string]interface{}{"error": "保存失败: " + err.Error()}
	}
	if err := saveMailNestConfigFile(path, data); err != nil {
		return map[string]interface{}{"error": "保存失败: " + err.Error()}
	}
	log.Printf("[MailNest] config saved")
	return map[string]interface{}{"success": true}
}

// saveMailNestConfigFile 完成写入后才替换旧配置，失败时清理临时文件。
func saveMailNestConfigFile(path string, data []byte) error {
	file, err := os.CreateTemp(filepath.Dir(path), ".mailnest-*.tmp")
	if err != nil {
		return err
	}
	defer os.Remove(file.Name())
	if _, err := file.Write(data); err != nil {
		_ = file.Close()
		return err
	}
	if err := file.Close(); err != nil {
		return err
	}
	return os.Rename(file.Name(), path)
}

func parseMailNestConfig(data string) (MailNestConfig, error) {
	var config MailNestConfig
	if err := json.Unmarshal([]byte(data), &config); err != nil {
		return config, fmt.Errorf("配置格式错误: %w", err)
	}
	config.APIKey = strings.TrimSpace(config.APIKey)
	config.ProjectCode = strings.TrimSpace(config.ProjectCode)
	if config.APIKey == "" || config.ProjectCode == "" {
		return config, fmt.Errorf("请填写 MailNest API Key 和项目代码")
	}
	return config, nil
}

func GetMailNestConfig() MailNestConfig {
	data, err := os.ReadFile(getMailNestConfigPath())
	if err != nil {
		return MailNestConfig{}
	}
	var config MailNestConfig
	if err := json.Unmarshal(data, &config); err != nil {
		log.Printf("[MailNest] invalid config file, resetting: %v", err)
		_ = os.Remove(getMailNestConfigPath())
		return MailNestConfig{}
	}
	return config
}
