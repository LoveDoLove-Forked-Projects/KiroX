package proxy

import (
	"context"
	"encoding/json"
	"io"
	"strings"
	"time"

	fhttp "github.com/bogdanfinn/fhttp"
	httputil "reg_go/internal/http"
)

// Info 代理检测结果
type Info struct {
	OK          bool   `json:"ok"`
	Scheme      string `json:"scheme"`
	IP          string `json:"ip"`
	Country     string `json:"country"`
	CountryCode string `json:"countryCode"`
	Region      string `json:"region"`
	City        string `json:"city"`
	ISP         string `json:"isp"`
	ProxyType   string `json:"proxyType"` // residential / mobile / datacenter
	Error       string `json:"error,omitempty"`
}

// classifyProxyType 依据 ip-api 的 hosting/mobile 布尔字段归类代理类型：
// 托管机房 -> datacenter；移动网络 -> mobile；否则视为家宽 residential。
func classifyProxyType(hosting, mobile bool) string {
	if hosting {
		return "datacenter"
	}
	if mobile {
		return "mobile"
	}
	return "residential"
}

// Detect 通过给定代理访问 ip-api.com，返回出口 IP 和归属信息。
func Detect(proxyURL string) Info {
	proxyURL = strings.TrimSpace(proxyURL)
	if proxyURL == "" {
		return Info{Error: "代理为空"}
	}

	scheme := "http"
	if i := strings.Index(proxyURL, "://"); i > 0 {
		scheme = strings.ToLower(proxyURL[:i])
	}

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	result := make(chan Info, 1)
	go func() {
		client := httputil.NewTLSClient(proxyURL, true)
		defer client.CloseIdleConnections()
		// tls-client 的 SetProxy 失败时可能静默回退，禁止把直连结果当作代理检测结果。
		if client.GetProxy() != proxyURL {
			result <- Info{Scheme: scheme, Error: "代理配置无效，请检查协议、主机和端口"}
			return
		}
		req, _ := fhttp.NewRequestWithContext(ctx, "GET", "http://ip-api.com/json/?lang=zh-CN&fields=status,message,country,countryCode,regionName,city,isp,hosting,mobile,query", nil)
		req.Header.Set("User-Agent", "kirox/proxy-check")
		resp, err := client.Do(req)
		if err != nil {
			result <- Info{Scheme: scheme, Error: simplifyProxyErr(err.Error())}
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			result <- Info{Scheme: scheme, Error: proxyProbeHTTPError(resp.StatusCode)}
			return
		}
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			result <- Info{Scheme: scheme, Error: "读取检测响应失败: " + simplifyProxyErr(err.Error())}
			return
		}
		var data struct {
			Status, Message, Country, CountryCode, RegionName, City, ISP, Query string
			Hosting, Mobile                                                     bool
		}
		if err := json.Unmarshal(body, &data); err != nil {
			result <- Info{Scheme: scheme, Error: "解析响应失败"}
			return
		}
		if data.Status != "success" {
			msg := data.Message
			if msg == "" {
				msg = "查询失败"
			}
			result <- Info{Scheme: scheme, Error: msg}
			return
		}
		result <- Info{
			OK:          true,
			Scheme:      scheme,
			IP:          data.Query,
			Country:     data.Country,
			CountryCode: data.CountryCode,
			Region:      data.RegionName,
			City:        data.City,
			ISP:         data.ISP,
			ProxyType:   classifyProxyType(data.Hosting, data.Mobile),
		}
	}()

	select {
	case info := <-result:
		return info
	case <-ctx.Done():
		return Info{Scheme: scheme, Error: "检测超时"}
	}
}
