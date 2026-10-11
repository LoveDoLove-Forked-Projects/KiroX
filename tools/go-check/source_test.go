// source_test.go 验证规范检查对真实违规场景的诊断。

package main

import (
	"strings"
	"testing"
)

func TestCheckSource(t *testing.T) {
	cases := []struct {
		name   string
		path   string
		source string
		want   string
	}{
		{
			name:   "documented source",
			path:   "sample.go",
			source: "package sample\n\n// Value 表示示例值。\nconst Value = 1\n",
		},
		{
			name:   "missing function documentation",
			path:   "sample.go",
			source: "package sample\n\nfunc Run() {}\n",
			want:   "导出声明 Run",
		},
		{
			name:   "documentation names another symbol",
			path:   "sample.go",
			source: "package sample\n\n// Runner 是另一种名称。\nfunc Run() {}\n",
			want:   "导出声明 Run",
		},
		{
			name:   "missing type documentation",
			path:   "sample.go",
			source: "package sample\n\ntype Item struct{}\n",
			want:   "导出声明 Item",
		},
		{
			name:   "missing grouped variable documentation",
			path:   "sample.go",
			source: "package sample\n\nvar (\n\tValue = 1\n)\n",
			want:   "导出声明 Value",
		},
		{
			name:   "method documentation",
			path:   "sample.go",
			source: "package sample\n\ntype item struct{}\n\nfunc (item) Run() {}\n",
			want:   "导出声明 Run",
		},
		{
			name:   "unformatted source",
			path:   "sample.go",
			source: "package sample\nfunc run(){ }\n",
			want:   "格式不符合 gofmt",
		},
		{
			name:   "invalid syntax",
			path:   "sample.go",
			source: "package sample\nfunc broken(\n",
			want:   "无法解析 Go 源码",
		},
		{
			name:   "test documentation is optional",
			path:   "sample_test.go",
			source: "package sample\n\nfunc TestExample() {}\n",
		},
		{
			name:   "exact length limit",
			path:   "sample.go",
			source: "package sample\n\n" + strings.Repeat("// comment\n", maxFileLines-2),
		},
		{
			name:   "length limit counts missing final newline",
			path:   "sample_test.go",
			source: "package sample\n\n" + strings.Repeat("// comment\n", maxFileLines-2) + "// final",
			want:   "超过 300 行",
		},
	}
	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			problems := checkSource(test.path, []byte(test.source))
			if test.want == "" {
				if len(problems) != 0 {
					t.Fatalf("unexpected problems: %v", problems)
				}
				return
			}
			if !strings.Contains(strings.Join(problems, "\n"), test.want) {
				t.Fatalf("problems = %v, want diagnostic containing %q", problems, test.want)
			}
		})
	}
}
