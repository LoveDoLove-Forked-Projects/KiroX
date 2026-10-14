package proxy

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"
)

var (
	requestErrorPrefix = regexp.MustCompile(`(?i)^(get|post|head|put|delete|patch) "[^"]*":\s*`)
	proxyCredentials   = regexp.MustCompile(`([a-zA-Z][a-zA-Z0-9+.-]*://)[^\s/]*@`)
	proxyHTTPStatus    = regexp.MustCompile(`(?i)(?:http|status(?: code)?|code:)\s*[:=]?\s*(407|429|403)\b`)
)

func simplifyProxyErr(message string) string {
	// 先移除请求 URL，保留后面的失败原因；旧代码的前 80 字节往往全是 URL。
	message = requestErrorPrefix.ReplaceAllString(message, "")
	message = proxyCredentials.ReplaceAllString(message, "${1}<redacted>@")
	lower := strings.ToLower(message)
	status := proxyHTTPStatus.FindStringSubmatch(message)
	if len(status) == 2 {
		switch status[1] {
		case "407":
			return proxyProbeHTTPError(http.StatusProxyAuthRequired)
		case "429":
			return proxyProbeHTTPError(http.StatusTooManyRequests)
		case "403":
			return proxyProbeHTTPError(http.StatusForbidden)
		}
	}
	switch {
	case strings.Contains(lower, "proxy authentication required"):
		return "代理认证失败 (HTTP 407)，请检查用户名和密码"
	case strings.Contains(lower, "connection refused"), strings.Contains(lower, "actively refused"):
		return "连接被拒绝，请检查代理主机和端口"
	case strings.Contains(lower, "timeout"), strings.Contains(lower, "deadline"):
		return "连接超时，请检查代理连通性"
	case strings.Contains(lower, "no such host"):
		return "域名解析失败，请检查代理主机"
	}
	runes := []rune(message)
	if len(runes) > 160 {
		return string(runes[:160]) + "..."
	}
	return message
}

func proxyProbeHTTPError(status int) string {
	switch status {
	case http.StatusProxyAuthRequired:
		return "代理认证失败 (HTTP 407)，请检查用户名和密码"
	case http.StatusTooManyRequests:
		return "代理或 IP 检测服务限流 (HTTP 429)，请稍后重试"
	case http.StatusForbidden:
		return "检测请求被拒绝 (HTTP 403)，请检查代理响应和 IP 检测服务限制"
	default:
		return fmt.Sprintf("IP 检测请求 HTTP %d", status)
	}
}
