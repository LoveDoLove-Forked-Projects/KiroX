// app_mail.go 提供邮箱配置与本地邮箱列表的桌面接口。

package main

import (
	"reg_go/internal/email"
)

// GetMoeMailConfigs 返回已保存的 MoeMail 配置。
func (a *App) GetMoeMailConfigs() []email.MoeMailConfig {
	return email.GetMoeMailConfigs()
}

// SaveMoeMailConfigs 保存 JSON 格式的 MoeMail 配置。
func (a *App) SaveMoeMailConfigs(configsJSON string) map[string]interface{} {
	return email.SaveMoeMailConfigs(configsJSON)
}

// TestMoeMailConnection 返回 MoeMail 配置的连接测试结果。
func (a *App) TestMoeMailConnection(configJSON string) map[string]interface{} {
	return email.TestMoeMailConnection(configJSON)
}

// GetCloudMailConfigs 返回已保存的 Cloud-Mail 配置。
func (a *App) GetCloudMailConfigs() []email.CloudMailConfig {
	return email.GetCloudMailConfigs()
}

// SaveCloudMailConfigs 保存 JSON 格式的 Cloud-Mail 配置。
func (a *App) SaveCloudMailConfigs(configsJSON string) map[string]interface{} {
	return email.SaveCloudMailConfigs(configsJSON)
}

// TestCloudMailConnection 返回 Cloud-Mail 配置的连接测试结果。
func (a *App) TestCloudMailConnection(configJSON string) map[string]interface{} {
	return email.TestCloudMailConnection(configJSON)
}

// AddOutlookAccounts 将文本中的邮箱条目添加到本地列表。
func (a *App) AddOutlookAccounts(data string) map[string]interface{} {
	return email.AddOutlookAccounts(data)
}

// GetOutlookAccounts 返回本地 Outlook 邮箱列表。
func (a *App) GetOutlookAccounts() []map[string]interface{} {
	return email.GetOutlookAccounts()
}

// DeleteOutlookAccount 按邮箱地址删除本地条目。
func (a *App) DeleteOutlookAccount(em string) map[string]interface{} {
	return email.DeleteOutlookAccount(em)
}

// ClearOutlookAccounts 清空本地 Outlook 邮箱列表。
func (a *App) ClearOutlookAccounts() map[string]interface{} {
	return email.ClearOutlookAccounts()
}

// ClearRegisteredOutlookAccounts 清理本地列表中标记为已注册的条目。
func (a *App) ClearRegisteredOutlookAccounts() map[string]interface{} {
	return email.ClearRegisteredOutlookAccounts()
}

// ImportOutlookFile 从指定文件导入本地邮箱条目。
func (a *App) ImportOutlookFile(filePath string) map[string]interface{} {
	return email.ImportOutlookFile(filePath)
}

// AddICloudAccounts 将文本中的邮箱条目添加到本地列表。
func (a *App) AddICloudAccounts(data string) map[string]interface{} {
	return email.AddICloudAccounts(data)
}

// GetICloudAccounts 返回本地 iCloud 邮箱列表。
func (a *App) GetICloudAccounts() []map[string]interface{} {
	return email.GetICloudAccounts()
}

// DeleteICloudAccount 按邮箱地址删除本地条目。
func (a *App) DeleteICloudAccount(em string) map[string]interface{} {
	return email.DeleteICloudAccount(em)
}

// ClearICloudAccounts 清空本地 iCloud 邮箱列表。
func (a *App) ClearICloudAccounts() map[string]interface{} {
	return email.ClearICloudAccounts()
}

// ImportICloudFile 从指定文件导入本地邮箱条目。
func (a *App) ImportICloudFile(filePath string) map[string]interface{} {
	return email.ImportICloudFile(filePath)
}

// TestMailNestConnection 返回 MailNest 配置的连接测试结果。
func (a *App) TestMailNestConnection(configJSON string) map[string]interface{} {
	return email.TestMailNestConnection(configJSON)
}

// SaveMailNestConfig 保存 JSON 格式的 MailNest 配置。
func (a *App) SaveMailNestConfig(configsJSON string) map[string]interface{} {
	return email.SaveMailNestConfig(configsJSON)
}

// GetMailNestConfig 返回已保存的 MailNest 配置。
func (a *App) GetMailNestConfig() email.MailNestConfig {
	return email.GetMailNestConfig()
}
