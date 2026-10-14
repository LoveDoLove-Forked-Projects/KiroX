package email

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
)

func TestCloudMailConnectionRefreshesBusinessUnauthorized(t *testing.T) {
	var logins, lists atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/public/genToken":
			fmt.Fprintf(w, `{"code":200,"data":{"token":"token-%d"}}`, logins.Add(1))
		case "/api/setting/websiteConfig":
			fmt.Fprint(w, `{"code":200,"data":{"domainList":["example.com"]}}`)
		case "/api/public/emailList":
			if lists.Add(1) == 2 {
				fmt.Fprint(w, `{"code":401,"message":"token验证失败"}`)
				return
			}
			fmt.Fprint(w, `{"code":200,"data":[]}`)
		default:
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()
	client := NewCloudMailClient(CloudMailConfig{URL: server.URL})
	for i := 0; i < 2; i++ {
		domains, err := client.TestConnection()
		if err != nil || len(domains) != 1 || domains[0] != "example.com" {
			t.Fatalf("connection test %d: domains=%v, err=%v", i+1, domains, err)
		}
	}
	if logins.Load() != 2 || lists.Load() != 3 {
		t.Fatalf("logins=%d, lists=%d; want 2 logins and 3 list requests", logins.Load(), lists.Load())
	}
}

func TestCloudMailConnectionTestsShareValidToken(t *testing.T) {
	var logins atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/public/genToken":
			if logins.Add(1) > 1 {
				// 模拟公共令牌覆盖后，服务端暂时仍读取旧值。
				fmt.Fprint(w, `{"code":200,"data":{"token":"not-yet-visible"}}`)
				return
			}
			fmt.Fprint(w, `{"code":200,"data":{"token":"valid"}}`)
		case "/api/setting/websiteConfig":
			fmt.Fprint(w, `{"code":200,"data":{"domainList":["example.com"]}}`)
		case "/api/public/emailList":
			if r.Header.Get("Authorization") != "valid" {
				fmt.Fprint(w, `{"code":401,"message":"token验证失败"}`)
				return
			}
			fmt.Fprint(w, `{"code":200,"data":[]}`)
		}
	}))
	defer server.Close()
	for _, name := range []string{"inline-test", "saved-config", "automatic-test"} {
		payload, _ := json.Marshal(CloudMailConfig{Name: name, URL: server.URL, Email: "admin@example.com", Password: "password"})
		result := TestCloudMailConnection(string(payload))
		if result["success"] != true {
			t.Fatalf("connection test %s: %v", name, result)
		}
	}
	if logins.Load() != 1 {
		t.Fatalf("logins=%d; repeated connection tests must reuse the valid token", logins.Load())
	}
}

func TestCloudMailAuthRetryIsBounded(t *testing.T) {
	for _, tc := range []struct {
		name   string
		status int
		code   int
		want   int32
	}{
		{"HTTP 401", http.StatusUnauthorized, 401, 2},
		{"business 401", http.StatusOK, 401, 2},
		{"permission denied", http.StatusOK, 403, 1},
		{"server error", http.StatusInternalServerError, 401, 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var logins, lists atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/api/public/genToken" {
					logins.Add(1)
					fmt.Fprint(w, `{"code":200,"data":{"token":"token"}}`)
					return
				}
				lists.Add(1)
				w.WriteHeader(tc.status)
				fmt.Fprintf(w, `{"code":%d,"message":"rejected"}`, tc.code)
			}))
			defer server.Close()
			client := NewCloudMailClient(CloudMailConfig{URL: server.URL})
			if _, err := client.EmailList("", 1); err == nil || !strings.Contains(err.Error(), fmt.Sprint(tc.code)) {
				t.Fatalf("expected final rejection, got %v", err)
			}
			if logins.Load() != tc.want || lists.Load() != tc.want {
				t.Fatalf("logins=%d, lists=%d; want %d", logins.Load(), lists.Load(), tc.want)
			}
		})
	}
}

func TestCloudMailConcurrentUnauthorizedSharesRefresh(t *testing.T) {
	const requests = 6
	var logins, staleRequests atomic.Int32
	allStale := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/public/genToken" {
			fmt.Fprintf(w, `{"code":200,"data":{"token":"token-%d"}}`, logins.Add(1))
			return
		}
		if r.Header.Get("Authorization") == "token-1" {
			if staleRequests.Add(1) == requests {
				close(allStale)
			}
			<-allStale
			fmt.Fprint(w, `{"code":401,"message":"expired"}`)
			return
		}
		if r.Header.Get("Authorization") != "token-2" {
			t.Errorf("unexpected authorization: %s", r.Header.Get("Authorization"))
		}
		fmt.Fprint(w, `{"code":200,"data":[]}`)
	}))
	defer server.Close()
	client := NewCloudMailClient(CloudMailConfig{URL: server.URL})
	if err := client.GenToken(); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	for i := 0; i < requests; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			peer := NewCloudMailClient(CloudMailConfig{URL: server.URL})
			if _, err := peer.EmailList("", 1); err != nil {
				t.Errorf("EmailList: %v", err)
			}
		}()
	}
	wg.Wait()
	if logins.Load() != 2 {
		t.Fatalf("logins=%d; concurrent rejection should refresh once", logins.Load())
	}
}

func TestCloudMailChangedCredentialsCannotReuseCachedToken(t *testing.T) {
	var logins atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/public/genToken" {
			logins.Add(1)
			var credentials map[string]string
			json.NewDecoder(r.Body).Decode(&credentials)
			if credentials["password"] != "correct" {
				fmt.Fprint(w, `{"code":403,"message":"incorrect password"}`)
				return
			}
			fmt.Fprint(w, `{"code":200,"data":{"token":"valid"}}`)
			return
		}
		fmt.Fprint(w, `{"code":200,"data":[]}`)
	}))
	defer server.Close()
	valid := NewCloudMailClient(CloudMailConfig{URL: server.URL, Password: "correct"})
	if _, err := valid.EmailList("", 1); err != nil {
		t.Fatal(err)
	}
	invalid := NewCloudMailClient(CloudMailConfig{URL: server.URL, Password: "incorrect"})
	if _, err := invalid.EmailList("", 1); err == nil || !strings.Contains(err.Error(), "incorrect password") {
		t.Fatalf("changed credentials must authenticate independently, got %v", err)
	}
	if logins.Load() != 2 {
		t.Fatalf("logins=%d; changed credentials must not use the cached token", logins.Load())
	}
}

func TestCloudMailRefreshPreservesCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	var logins atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/public/genToken" {
			if logins.Add(1) == 2 {
				cancel()
				return
			}
			fmt.Fprint(w, `{"code":200,"data":{"token":"expired"}}`)
			return
		}
		fmt.Fprint(w, `{"code":401,"message":"expired"}`)
	}))
	defer server.Close()
	client := newCloudMailClient(ctx, CloudMailConfig{URL: server.URL})
	if _, err := client.EmailList("", 1); !errors.Is(err, context.Canceled) {
		t.Fatalf("refresh cancellation = %v", err)
	}
}
