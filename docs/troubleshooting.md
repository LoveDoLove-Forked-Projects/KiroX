# 故障排查

先记录应用版本、操作系统与 CPU 架构、邮箱服务类型和失败步骤。反馈时提供脱敏后的错误码、HTTP 状态和 `requestId`，不要提供密码、RefreshToken、API Key、验证码或完整账户文件。

## Cloud-Mail 重复测试连接返回 401

本客户端对接 `/api/public/genToken`、`/api/public/emailList`、`/api/public/addUser`。这些是 Cloud-Mail 的公共管理接口，使用管理员凭据生成的公共令牌，和网页登录返回的 JWT 不同。确认自部署版本保留这些接口，并在配置中填写服务根地址。

Cloud-Mail 的公共管理令牌在服务端共享，每次生成会替换前一个值。修复后，相同服务地址、管理员邮箱和密码的客户端共享进程内的认证状态，重复测试不会重新生成仍然有效的令牌。配置名和域名列表不影响认证；修改凭据会使用独立的认证状态。

HTTP 401 和 HTTP 200 响应内的业务码 401 都会触发一次重新认证。403、服务端 5xx 和网络错误不会触发认证重试；刷新后仍然失败时返回实际错误，不循环登录。缓存不会写入磁盘。其他应用生成新公共令牌、应用重启或服务端存储尚未同步时，仍可能需要在服务端核对令牌状态。

上游实现：[公共接口](https://github.com/maillab/cloud-mail/blob/ec7a2bb17c950576c38d7308128cac7696fea169/mail-worker/src/service/public-service.js)、[认证中间件](https://github.com/maillab/cloud-mail/blob/ec7a2bb17c950576c38d7308128cac7696fea169/mail-worker/src/security/security.js)。上游[接口文档](https://doc.skymail.ink/api/api-doc)描述的 `/api/login` 和用户邮件接口属于另一套认证流程，不能直接把对应的登录令牌填到公共管理接口。

## 邮件没有出现在应用中

区分发送失败和接收失败。如果日志在 `send-otp` 步骤返回 HTTP 400，发送方没有确认发送成功，不能据此认定 Cloud-Mail 的收件接口或令牌有问题。先保留发送阶段的错误码和 `requestId`，通过服务方支持渠道排查。

如果发送成功，检查自部署邮箱的 MX、收件规则和服务端邮件记录，再检查客户端是否能够列出同一收件地址的邮件。

Outlook 的当前主分支会同时检查收件箱和垃圾邮件：Graph 使用 `inbox` / `junkemail`，IMAP 使用 `LIST` 识别垃圾邮件目录。该修复在 v1.0.4 标签之后的提交 [ee7a4624](https://github.com/huey1in/KiroX/commit/ee7a4624005ee6be4bb586b11d6dbfcdfc061faa) 中；下载原有 v1.0.4 安装包不会获得这项后续修复。需要从包含此提交的源码构建，或等待新的安装包。

## 代理已保存，但测试失败

保存配置和检测出口是两个操作。检测失败不表示配置未保存，也不表示注册服务一定不可用。检测使用 `ip-api.com`，代理、网关和该检测服务都可能拒绝请求。

| 错误 | 排查方向 |
| --- | --- |
| HTTP 407 | 检查代理用户名、密码和认证方式 |
| HTTP 429 | 代理或检测服务限流，稍后再次检测 |
| HTTP 403 | 检查代理响应和检测服务的访问限制 |
| 域名解析失败 | 核对代理主机和 DNS |
| 连接被拒绝 / 超时 | 核对代理主机、端口和基本网络连通性 |
| EOF / unexpected EOF | 网关提前关闭连接，需要完整的末尾错误原因 |
| 代理配置无效 | 协议、主机或端口无法应用；检测已终止 |

修复后的检测会保留错误原因并隐藏 URL 中的认证信息。无法应用代理时会终止检测，避免把默认连接的出口误报为指定代理的出口。

应用代理与系统 TUN 可以同时作用于网络连接：应用先连接所选代理网关，系统路由仍可能接管到网关的底层连接。仅凭代理名称、服务器所在国家或 TUN 已开启，不能确定最终出口。#25 的截图只展示了一次出口检测结果，无法证明是哪一层改写了路由；需要代理网关提供的预期出口信息和系统路由记录进行核对。

## Windows 10 无窗口或闪退

使用匹配 CPU 架构的安装包：普通 Intel / AMD 64 位系统选择 `windows-amd64`，ARM 系统选择 `windows-arm64`。确认已安装 [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)。微软说明少量 Windows 10 设备可能没有预装这个运行时，见[分发文档](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)。

如果 Wails 返回启动错误，当前源码会显示原生错误框，并把错误、系统平台、CPU 架构和 Go 版本追加到 `%LOCALAPPDATA%\KiroX\logs\startup.log`。保存日志失败时，弹窗仍会显示启动错误。进程在进入 Wails 之前崩溃、系统拦截程序或二进制架构不匹配的情况仍需检查 Windows 事件查看器和系统提示。

反馈 #15 时应提供 `winver` 显示的 Windows 10 版本、CPU 架构、应用版本、WebView2 安装情况和脱敏的启动错误。目前缺少原报告的运行环境，启动诊断改进不能代替 Windows 10 实机复测。

## MailNest 配置入口

当前应用在「邮箱池」页面提供 MailNest 区域，填写 API Key 和项目代码即可测试连接。项目代码需要按服务端项目填写，输入框中的 `aws001` 仅为示例。若旧版本中没有该区域，请先确认版本并查看当前[邮箱配置说明](../README.md#1-配置邮箱)。

## 身份验证、CAPTCHA、封禁或支付问题

HTTP 400 本身不能确定是 IP、邮箱、密码还是服务端工作流错误。`AUTHENTICATION_FAILED` 且响应包含 CAPTCHA 信息时，应通过服务方的官方交互流程完成验证，保留脱敏的 `requestId` 供支持人员定位。账号暂停或封禁需要由服务方处理或申诉，客户端不能解除限制。

支付方式和订阅资格属于服务方政策，使用官方支持的支付方式；此项目不提供绕过支付验证的渠道。
