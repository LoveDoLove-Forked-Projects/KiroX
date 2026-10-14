package email

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestMailNestBalanceChecksBusinessStatusAndPayload(t *testing.T) {
	for _, test := range []struct {
		name, body, balance string
		status              int
	}{
		{"positive", `{"code":"00000","data":{"balance":"10.50"}}`, "10.50", 200},
		{"zero", `{"code":"00000","data":{"balance":"0"}}`, "0", 200},
		{"business-denied", `{"code":"A0401","message":"secret-api-key","data":null}`, "", 200},
		{"missing-code", `{"data":{"balance":"10"}}`, "", 200},
		{"missing-data", `{"code":"00000","data":null}`, "", 200},
		{"empty-balance", `{"code":"00000","data":{"balance":" "}}`, "", 200},
		{"bad-json", `<html>secret-api-key</html>`, "", 200},
		{"unauthorized", `{"message":"secret-api-key"}`, "", 401},
	} {
		t.Run(test.name, func(t *testing.T) {
			client := NewMailNestClient(MailNestConfig{APIKey: "test-key", ProjectCode: "project"})
			client.client.Transport = emailRoundTripFunc(func(req *http.Request) (*http.Response, error) {
				if req.Method != http.MethodGet || req.URL.Path != "/api/v1/balance" || req.Header.Get("Authorization") != "Bearer test-key" {
					t.Fatalf("unexpected balance request: %s %s", req.Method, req.URL)
				}
				return &http.Response{StatusCode: test.status, Body: io.NopCloser(strings.NewReader(test.body)), Header: make(http.Header)}, nil
			})
			balance, err := client.GetBalance()
			if test.balance != "" {
				if err != nil || balance == nil || balance.Balance != test.balance {
					t.Fatalf("balance=%v err=%v", balance, err)
				}
			} else {
				if err == nil || balance != nil {
					t.Fatalf("invalid response accepted: balance=%v err=%v", balance, err)
				}
				if strings.Contains(err.Error(), "secret-api-key") {
					t.Fatalf("raw error response leaked: %v", err)
				}
			}
		})
	}
}

func TestMailNestRejectsUntrustedTLSCertificate(t *testing.T) {
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("untrusted server received an authenticated request")
		fmt.Fprint(w, `{"code":"00000","data":{"balance":"0"}}`)
	}))
	defer server.Close()
	server.Config.ErrorLog = log.New(io.Discard, "", 0)
	endpoint, err := url.Parse(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	client := NewMailNestClient(MailNestConfig{APIKey: "test-key"})
	transport := client.client.Transport
	defer transport.(*http.Transport).CloseIdleConnections()
	client.client.Transport = emailRoundTripFunc(func(req *http.Request) (*http.Response, error) {
		local := req.Clone(req.Context())
		local.URL.Scheme, local.URL.Host = endpoint.Scheme, endpoint.Host
		return transport.RoundTrip(local)
	})
	if balance, err := client.GetBalance(); err == nil || balance != nil {
		t.Fatalf("untrusted certificate accepted: balance=%v err=%v", balance, err)
	}
}

func TestMailNestConfigFileReplacementAndCleanup(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "mailnest.json")
	for _, data := range []string{`{"apiKey":"old-key"}`, `{"apiKey":"new-key"}`} {
		if err := saveMailNestConfigFile(path, []byte(data)); err != nil {
			t.Fatal(err)
		}
		got, err := os.ReadFile(path)
		if err != nil || string(got) != data {
			t.Fatalf("configuration replacement: data=%q err=%v", got, err)
		}
	}
	blocked := filepath.Join(root, "blocked.json")
	if err := os.Mkdir(blocked, 0700); err != nil {
		t.Fatal(err)
	}
	sentinel := filepath.Join(blocked, "keep")
	if err := os.WriteFile(sentinel, []byte("unchanged"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := saveMailNestConfigFile(blocked, []byte(`{}`)); err == nil {
		t.Fatal("configuration replaced a nonempty directory")
	}
	if got, err := os.ReadFile(sentinel); err != nil || string(got) != "unchanged" {
		t.Fatalf("failed replacement changed target: data=%q err=%v", got, err)
	}
	if temporary, err := filepath.Glob(filepath.Join(root, ".mailnest-*.tmp")); err != nil || len(temporary) != 0 {
		t.Fatalf("temporary configuration files remain: %v err=%v", temporary, err)
	}
}

func TestMailNestConfigurationValidationBeforeIO(t *testing.T) {
	for _, data := range []string{`null`, `{}`, `{"apiKey":"key"}`, `{"projectCode":"project"}`, `{"apiKey":" ","projectCode":"project"}`, `invalid-json`} {
		for _, action := range []func(string) map[string]interface{}{TestMailNestConnection, SaveMailNestConfig} {
			result := action(data)
			if result["error"] == nil || result["success"] == true {
				t.Fatalf("invalid configuration accepted: %s -> %v", data, result)
			}
		}
	}
	config, err := parseMailNestConfig(`{"apiKey":" key ","projectCode":" project "}`)
	if err != nil || config.APIKey != "key" || config.ProjectCode != "project" {
		t.Fatalf("config=%v err=%v", config, err)
	}
}
