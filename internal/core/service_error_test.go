package core

import (
	"errors"
	"strings"
	"testing"
)

func TestParseServiceErrorRedactsCaptchaAndRepairsMessage(t *testing.T) {
	body := []byte(`{
		"requestId":"outer-id",
		"message":{
			"text":"è¯·å°è¯éæ°ç»å½",
			"heading":"åçæå¤éè¯¯",
			"type":"ERROR",
			"requestId":"message-id",
			"errorCode":"AUTHENTICATION_FAILED"
		},
		"captchaResponse":{"captchaToken":"secret-token","captchaCDN":"https://example.com"}
	}`)

	err := parseServiceError(body)
	if err == nil {
		t.Fatal("expected a parsed service error")
	}
	if err.Code != "AUTHENTICATION_FAILED" || err.RequestID != "message-id" || !err.Captcha {
		t.Fatalf("unexpected parsed error: %#v", err)
	}
	if err.Message != "请尝试重新登录" {
		t.Fatalf("message = %q", err.Message)
	}
	if strings.Contains(err.Error(), "secret-token") || strings.Contains(err.Error(), "example.com") {
		t.Fatalf("sensitive CAPTCHA response leaked through error: %s", err)
	}
}

func TestRepairMojibakeLeavesUTF8TextAlone(t *testing.T) {
	for _, value := range []string{"请稍后重试", "café", "plain text"} {
		if got := repairMojibake(value); got != value {
			t.Fatalf("repairMojibake(%q) = %q", value, got)
		}
	}
}

func TestUnexpectedServiceResponseNeverIncludesRawBody(t *testing.T) {
	err := unexpectedServiceResponse("密码设置未返回 redirect", []byte(`not-json captchaToken=secret-token`))
	if strings.Contains(err.Error(), "secret-token") || strings.Contains(err.Error(), "captchaToken") {
		t.Fatalf("raw response leaked through error: %s", err)
	}
}

func TestFormatAuthenticationFailure(t *testing.T) {
	r := &Registrar{}
	got := r.formatError("SetPassword", &ServiceError{
		Code:      "AUTHENTICATION_FAILED",
		Message:   "请尝试重新登录",
		RequestID: "request-id",
		Captcha:   true,
	})
	want := "设置密码失败: 服务要求人工验证 (CAPTCHA)，请通过官方页面完成验证 (AUTHENTICATION_FAILED, requestId=request-id)"
	if got != want {
		t.Fatalf("formatError() = %q, want %q", got, want)
	}
}

func TestSendOTPFailurePreservesDiagnosticsWithoutResponseSecrets(t *testing.T) {
	for _, test := range []struct {
		name, body, code, requestID string
		status                      int
		captcha                     bool
	}{
		{"nested", `{"message":{"text":"Request denied","errorCode":"AUTHENTICATION_FAILED","requestId":"body-id"},"captchaResponse":{"captchaToken":"secret-token","captchaURL":"https://challenge.test/secret"}}`, "AUTHENTICATION_FAILED", "body-id", 400, true},
		{"flat", `{"message":"Request denied","__type":"aws.service#InvalidRequestException"}`, "InvalidRequestException", "header-id", 400, false},
		{"flat-code", `{"message":"Request denied","errorCode":"BLOCKED","requestId":"top-id"}`, "BLOCKED", "top-id", 403, false},
		{"non-json", `<html>secret-token</html>`, "", "header-id", 503, false},
		{"body-id-only", `{"requestId":"body-id"}`, "", "body-id", 400, false},
		{"business-challenge", `{"captchaResponse":{"captchaToken":"secret-token"}}`, "CAPTCHA_REQUIRED", "header-id", 200, true},
	} {
		t.Run(test.name, func(t *testing.T) {
			err := sendOTPResponseError(test.status, map[string][]string{"X-Amzn-RequestId": {" header-id "}}, []byte(test.body))
			var serviceErr *ServiceError
			if !errors.As(err, &serviceErr) {
				t.Fatalf("expected service diagnostics, got %v", err)
			}
			if serviceErr.StatusCode != test.status || serviceErr.Code != test.code || serviceErr.RequestID != test.requestID || serviceErr.Captcha != test.captcha {
				t.Fatalf("unexpected diagnostics: %#v", serviceErr)
			}
			message := (&Registrar{}).formatError("SendOTP", err)
			for _, field := range []string{"发送验证码失败", "验证码未确认发送", "HTTP", "requestId=" + test.requestID} {
				if !strings.Contains(message, field) {
					t.Fatalf("missing %q in %q", field, message)
				}
			}
			for _, secret := range []string{"secret-token", "challenge.test", "captchaToken"} {
				if strings.Contains(message, secret) || strings.Contains(err.Error(), secret) {
					t.Fatalf("response secret %q leaked", secret)
				}
			}
		})
	}
}

func TestSendOTPConfirmationDoesNotTreatSuccessMessageAsError(t *testing.T) {
	for _, body := range []string{`{}`, `{"message":"sent"}`, `{"message":{"text":"sent"}}`} {
		if err := sendOTPResponseError(200, nil, []byte(body)); err != nil {
			t.Fatalf("confirmed response %s: %v", body, err)
		}
	}
}

func TestAuthenticationFailureUsesActualStepWithoutGuessingCause(t *testing.T) {
	message := (&Registrar{}).formatError("SendOTP", &ServiceError{Code: "AUTHENTICATION_FAILED"})
	if !strings.Contains(message, "发送验证码失败") || !strings.Contains(message, "官方页面") || strings.Contains(message, "设置密码") || strings.Contains(message, "已过期") {
		t.Fatalf("misleading authentication diagnosis: %s", message)
	}
}
