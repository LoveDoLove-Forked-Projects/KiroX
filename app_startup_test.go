package main

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestStartupLogRetainsEarlierFailuresAndPlatform(t *testing.T) {
	path := filepath.Join(t.TempDir(), "startup.log")
	for _, failure := range []string{"runtime missing", "window creation failed"} {
		if err := writeStartupErrorLog(path, errors.New(failure)); err != nil {
			t.Fatal(err)
		}
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{"runtime missing", "window creation failed", "os=" + runtime.GOOS, "arch=" + runtime.GOARCH} {
		if !strings.Contains(string(data), expected) {
			t.Fatalf("startup diagnostics missing %q: %s", expected, data)
		}
	}
}

func TestStartupLogReportsUnwritablePath(t *testing.T) {
	if err := writeStartupErrorLog(t.TempDir(), errors.New("startup failed")); err == nil {
		t.Fatal("writing to a directory must report an error")
	}
}
