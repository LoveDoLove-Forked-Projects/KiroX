package core

import (
	"encoding/json"
	"fmt"
	"strings"
	"unicode/utf8"
)

// ServiceError 保存服务响应的诊断字段，不包含验证码挑战令牌或原始响应体。
type ServiceError struct {
	StatusCode int
	Code       string
	Message    string
	RequestID  string
	Captcha    bool
}

func (e *ServiceError) Error() string {
	if e == nil {
		return ""
	}
	parts := make([]string, 0, 3)
	if e.StatusCode != 0 {
		parts = append(parts, fmt.Sprintf("HTTP %d", e.StatusCode))
	}
	if e.Code != "" {
		parts = append(parts, e.Code)
	}
	if e.Message != "" {
		parts = append(parts, e.Message)
	}
	if e.RequestID != "" {
		parts = append(parts, "requestId="+e.RequestID)
	}
	if len(parts) == 0 {
		return "服务返回未知错误"
	}
	return strings.Join(parts, ": ")
}

type serviceErrorResponse struct {
	RequestID       string          `json:"requestId"`
	ErrorCode       string          `json:"errorCode"`
	Type            string          `json:"__type"`
	Message         json.RawMessage `json:"message"`
	CaptchaResponse struct {
		CaptchaURL   string `json:"captchaURL"`
		CaptchaCES   string `json:"captchaCES"`
		CaptchaToken string `json:"captchaToken"`
		CaptchaCDN   string `json:"captchaCDN"`
	} `json:"captchaResponse"`
}

func parseServiceError(body []byte) *ServiceError {
	var response serviceErrorResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil
	}

	var message struct {
		Text      string `json:"text"`
		Heading   string `json:"heading"`
		ErrorCode string `json:"errorCode"`
		RequestID string `json:"requestId"`
	}
	if err := json.Unmarshal(response.Message, &message); err != nil {
		_ = json.Unmarshal(response.Message, &message.Text)
	}
	requestID := message.RequestID
	if requestID == "" {
		requestID = response.RequestID
	}
	captcha := response.CaptchaResponse.CaptchaURL != "" ||
		response.CaptchaResponse.CaptchaCES != "" ||
		response.CaptchaResponse.CaptchaToken != "" ||
		response.CaptchaResponse.CaptchaCDN != ""
	code := strings.TrimSpace(message.ErrorCode)
	if code == "" {
		code = strings.TrimSpace(response.ErrorCode)
	}
	if code == "" {
		code = strings.TrimSpace(response.Type)
		if i := strings.LastIndex(code, "#"); i >= 0 {
			code = code[i+1:]
		}
	}
	text := repairMojibake(strings.TrimSpace(message.Text))
	if text == "" {
		text = repairMojibake(strings.TrimSpace(message.Heading))
	}
	if code == "" && captcha {
		code = "CAPTCHA_REQUIRED"
	}
	if code == "" && text == "" && !captcha && requestID == "" {
		return nil
	}

	return &ServiceError{
		Code:      code,
		Message:   text,
		RequestID: requestID,
		Captcha:   captcha,
	}
}

// sendOTPResponseError 区分未确认发送与收件失败，并保留安全的服务诊断字段。
func sendOTPResponseError(status int, headers map[string][]string, body []byte) error {
	serviceErr := parseServiceError(body)
	if status == 200 && (serviceErr == nil || (serviceErr.Code == "" && !serviceErr.Captcha)) {
		return nil
	}
	if serviceErr == nil {
		serviceErr = &ServiceError{}
	}
	serviceErr.StatusCode = status
	if serviceErr.RequestID == "" {
		for name, values := range headers {
			switch strings.ToLower(name) {
			case "x-amzn-requestid", "x-amzn-request-id", "x-amz-request-id", "x-request-id":
				if len(values) > 0 && strings.TrimSpace(values[0]) != "" {
					serviceErr.RequestID = strings.TrimSpace(values[0])
				}
			}
			if serviceErr.RequestID != "" {
				break
			}
		}
	}
	return serviceErr
}

func unexpectedServiceResponse(context string, body []byte) error {
	if serviceErr := parseServiceError(body); serviceErr != nil {
		return serviceErr
	}
	return fmt.Errorf("%s（响应格式异常）", context)
}

// repairMojibake repairs UTF-8 text that was decoded once as ISO-8859-1.
func repairMojibake(value string) string {
	if value == "" {
		return ""
	}
	bytes := make([]byte, 0, len(value))
	for _, r := range value {
		if r > 0xff {
			return value
		}
		bytes = append(bytes, byte(r))
	}
	if !utf8.Valid(bytes) {
		return value
	}
	decoded := string(bytes)
	if decoded == value {
		return value
	}
	return decoded
}
