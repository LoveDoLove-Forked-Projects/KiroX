# Go 后端工程规范

目前已整理的范围为仓库根目录的桌面桥接代码、`internal/storage`、`internal/updater` 和 `tools/go-check`。其他业务包暂未纳入本次结构重构和文件长度检查。

## 模块职责

| 模块 | 职责 |
| --- | --- |
| `main*.go` | Wails 启动、资源嵌入与平台窗口选项 |
| `app.go` | 应用生命周期与保留的任务、代理接口 |
| `app_settings.go` | 用户设置、数据目录、输出目录与语言接口 |
| `app_mail.go` | 邮箱配置与本地列表的桥接接口 |
| `app_dialogs.go` | 文件选择、外部链接与桌面通知接口 |
| `app_logs.go` | 日志分发、读取与磁盘日志清理接口 |
| `app_updates.go` | 应用版本与更新查询接口 |
| `app_lang*.go`、`notification_*.go` | 平台语言识别与原生通知实现 |
| `internal/storage/settings*.go` | 设置模型、默认值、规范化与配置持久化 |
| `internal/storage/paths.go`、`state.go` | 存储布局、目录解析与共享同步状态 |
| `internal/storage/*directory.go`、`migration.go` | 目录切换与旧版数据迁移 |
| `internal/storage/accounts*.go` | 本地邮箱缓存、快照、修改与写盘 |
| `internal/storage/json.go` | 按文件加锁的 JSON 数组读写 |
| `internal/storage/logs.go` | 日志脱敏、保留期限与清理 |
| `internal/storage/proxy_address.go` | 设置中代理地址的字符串规范化 |
| `internal/updater` | 版本比较与发布元数据查询 |
| `tools/go-check` | 公共层工程规范检查 |

桌面桥接层只处理输入、委托调用和前端响应。持久化与目录迁移应放在 `storage`，存储包不依赖 Wails 或桌面桥接层。公开方法名称、参数、返回结构和 JSON 字段需保持前端绑定兼容。

## 文件与注释

- 每个受检查的 Go 文件最多 300 行，包含空行和注释；按职责拆分，不按固定行号切割。
- 使用 `gofmt`，不引入与格式器冲突的手工排版。
- 导出的类型、方法、函数、变量和常量使用以名称开头的 GoDoc 注释。测试函数无需重复解释测试名称。
- 注释统一使用简洁中文，说明用途、约束或原因；协议名和标识符保留原文。构建标签及 `go:embed` 等工具指令保留原样。
- 包用途写在 `doc.go`；复杂锁顺序、快照规则和迁移兼容行为写在对应实现附近。避免装饰性分隔线和重复代码含义的注释。
- 标识符遵循 Go 命名习惯，包内状态使用小写驼峰，不添加前导下划线。
- 测试随实现职责拆分，公共测试夹具集中到 `helpers_test.go` 或专用的 `*_helpers_test.go`。

## 存储并发约束

- 切换数据目录时先获取 `accountsLocationMu`，先刷盘，再获取 `dataDirMu`。缓存操作持有目录位置读锁，以避免在错误目录读写。
- `settingsMu` 保护设置的完整读、改、写事务；`layoutOnce` 负责存储布局的一次性初始化。
- `accountsMu` 保护缓存内容、版本号、待写标记和计时器。修改回调不得重入缓存接口。
- 初次读取通过 `accountsLoadMu` 串行化；磁盘读取期间不占用缓存锁，读取结束后保留已发生的缓存替换。
- `accountsFlushMu` 同时串行化快照获取与写盘。只有版本号未变化时才能清除待写标记，防止并发修改被遗漏。
- 当前邮箱字段为标量，缓存对外通过逐条复制映射返回快照；如新增嵌套字段，需重新检查快照隔离约定。
- JSON 文件和设置先写临时文件，再替换目标文件；目录迁移保留源文件，目标文件已存在时保留目标内容。

## 本地检查

在仓库根目录执行：

```powershell
# 根包通过 go:embed 嵌入前端，首次检出时需先生成 frontend/dist。
npm --prefix frontend ci
npm --prefix frontend run build

go run ./tools/go-check
go vet . ./internal/storage ./internal/updater ./tools/go-check
go test -race . ./internal/storage ./internal/updater ./tools/go-check
go build -o "$env:TEMP/kirox-backend-check.exe" .
```

竞态检查需要启用 CGO 并安装可用的 C 编译器。桌面根包编译需要对应平台的 Wails 依赖；CI 使用 Windows 执行上述公共层检查与编译，不启动桌面应用或连接外部业务服务。

格式修复可对改动文件运行 `gofmt -w <文件路径>`。规范检查工具同时读取不同平台的源文件，不受当前操作系统构建标签影响；检查失败时返回非零退出码。
