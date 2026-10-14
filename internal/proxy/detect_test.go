package proxy

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"unicode/utf8"
)

func TestProxyErrorRetainsCauseAndRedactsCredentials(t *testing.T) {
	endpoint := "http://ip-api.com/json/?lang=zh-CN&fields=" + strings.Repeat("field,", 30)
	for _, tc := range []struct {
		cause string
		want  string
	}{
		{"EOF", "EOF"},
		{"unexpected EOF", "unexpected EOF"},
		{"Proxy Authentication Required", "代理认证失败 (HTTP 407)，请检查用户名和密码"},
		{"dial tcp: connection refused", "连接被拒绝，请检查代理主机和端口"},
		{"lookup: no such host", "域名解析失败，请检查代理主机"},
		{"context deadline exceeded", "连接超时，请检查代理连通性"},
		{"failed at socks5://user:secret@localhost:1080", "failed at socks5://<redacted>@localhost:1080"},
	} {
		t.Run(tc.cause, func(t *testing.T) {
			got := simplifyProxyErr(`Get "` + endpoint + `": ` + tc.cause)
			if got != tc.want {
				t.Fatalf("got %q, want %q", got, tc.want)
			}
		})
	}
	if got := simplifyProxyErr(strings.Repeat("故障", 100)); !utf8.ValidString(got) || !strings.HasSuffix(got, "...") {
		t.Fatalf("truncation must preserve UTF-8: %q", got)
	}
}

func TestDetectReportsProxyAndProbeFailures(t *testing.T) {
	for _, status := range []int{http.StatusProxyAuthRequired, http.StatusTooManyRequests, http.StatusForbidden} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Hostname() != "ip-api.com" {
					t.Errorf("unexpected proxied target: %s", r.URL.Host)
				}
				w.WriteHeader(status)
			}))
			defer server.Close()
			info := Detect(server.URL)
			if info.OK || info.Error != proxyProbeHTTPError(status) {
				t.Fatalf("Detect() = %+v", info)
			}
		})
	}
}

func TestDetectRejectsInvalidProxyWithoutDirectRequest(t *testing.T) {
	info := Detect("unsupported://localhost:8080")
	if info.OK || !strings.Contains(info.Error, "代理配置无效") {
		t.Fatalf("invalid proxy must fail before probing: %+v", info)
	}
}
