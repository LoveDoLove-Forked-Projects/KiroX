package email

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
)

type cloudMailAuthState struct {
	mu    sync.Mutex
	token string
}

var cloudMailAuthCache sync.Map

func cloudMailAuthFor(config CloudMailConfig) *cloudMailAuthState {
	// 公共 API 在服务端只保存一个有效令牌；相同凭据的客户端必须共享认证状态。
	// 使用凭据摘要作为键，配置名和域名不影响认证；令牌仅保存在进程内。
	credentials, _ := json.Marshal([]string{
		strings.TrimRight(strings.TrimSpace(config.URL), "/"), config.Email, config.Password,
	})
	key := sha256.Sum256(credentials)
	state, _ := cloudMailAuthCache.LoadOrStore(key, &cloudMailAuthState{})
	return state.(*cloudMailAuthState)
}

// GenToken 通过管理员凭据获取令牌，并串行更新认证状态。
func (c *CloudMailClient) GenToken() error {
	c.auth.mu.Lock()
	defer c.auth.mu.Unlock()
	return c.genTokenLocked()
}

func (c *CloudMailClient) genTokenLocked() error {
	body, _ := json.Marshal(map[string]string{
		"email":    c.config.Email,
		"password": c.config.Password,
	})
	endpoint := strings.TrimRight(c.config.URL, "/") + "/api/public/genToken"
	req, err := http.NewRequestWithContext(c.ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("genToken 请求失败: %w", err)
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("genToken 读取响应失败: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("genToken HTTP %d", resp.StatusCode)
	}
	var wrap cloudMailResp
	if err := json.Unmarshal(respBody, &wrap); err != nil {
		return fmt.Errorf("genToken 解析失败: %w", err)
	}
	if wrap.Code != http.StatusOK {
		return fmt.Errorf("genToken 业务错误 [%d]: %s", wrap.Code, wrap.Message)
	}
	var data struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(wrap.Data, &data); err != nil || strings.TrimSpace(data.Token) == "" {
		return fmt.Errorf("genToken 未返回有效 token")
	}
	c.auth.token = data.Token
	return nil
}

func (c *CloudMailClient) ensureToken() error {
	c.auth.mu.Lock()
	defer c.auth.mu.Unlock()
	if c.auth.token != "" {
		return nil
	}
	return c.genTokenLocked()
}

func (c *CloudMailClient) currentToken() string {
	c.auth.mu.Lock()
	defer c.auth.mu.Unlock()
	return c.auth.token
}

func (c *CloudMailClient) refreshToken(stale string) error {
	c.auth.mu.Lock()
	defer c.auth.mu.Unlock()
	// 另一个请求已经刷新时复用新令牌，避免并发登录互相覆盖。
	if c.auth.token != "" && c.auth.token != stale {
		return nil
	}
	return c.genTokenLocked()
}

func cloudMailUnauthorized(status int, body []byte) bool {
	if status == http.StatusUnauthorized {
		return true
	}
	if status != http.StatusOK {
		return false
	}
	var wrap cloudMailResp
	return json.Unmarshal(body, &wrap) == nil && wrap.Code == http.StatusUnauthorized
}

// doAuthorized 对 HTTP 401 和响应内的业务码 401 最多刷新重试一次。
func (c *CloudMailClient) doAuthorized(path string, payload interface{}) ([]byte, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("%s 请求编码失败: %w", path, err)
	}
	if err := c.ensureToken(); err != nil {
		return nil, err
	}
	for attempt := 0; attempt < 2; attempt++ {
		token := c.currentToken()
		endpoint := strings.TrimRight(c.config.URL, "/") + path
		req, err := http.NewRequestWithContext(c.ctx, http.MethodPost, endpoint, bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := c.client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("%s 请求失败: %w", path, err)
		}
		respBody, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			return nil, fmt.Errorf("%s 读取响应失败: %w", path, readErr)
		}
		if attempt == 0 && cloudMailUnauthorized(resp.StatusCode, respBody) {
			if err := c.refreshToken(token); err != nil {
				return nil, fmt.Errorf("token 失效后重新登录失败: %w", err)
			}
			continue
		}
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("%s HTTP %d: %s", path, resp.StatusCode, string(respBody))
		}
		return respBody, nil
	}
	return nil, fmt.Errorf("%s 认证重试失败", path)
}
