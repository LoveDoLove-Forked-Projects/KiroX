// Command go-check 检查已整理的后端公共层代码规范。
package main

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

const maxFileLines = 300

// 工程规范逐步覆盖公共层；新增检查目录时同步更新 docs/backend.md。
var checkedDirectories = []string{"internal/storage", "internal/updater", "tools/go-check"}

func main() {
	if _, err := os.Stat("go.mod"); err != nil {
		fmt.Fprintln(os.Stderr, "请在仓库根目录执行 go run ./tools/go-check")
		os.Exit(1)
	}
	files, err := collectFiles()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	failures := 0
	for _, path := range files {
		source, err := os.ReadFile(path)
		if err != nil {
			fmt.Fprintf(os.Stderr, "%s: %v\n", path, err)
			failures++
			continue
		}
		for _, problem := range checkSource(path, source) {
			fmt.Fprintf(os.Stderr, "%s: %s\n", filepath.ToSlash(path), problem)
			failures++
		}
	}
	if failures > 0 {
		fmt.Fprintf(os.Stderr, "Go 规范检查失败：%d 项问题\n", failures)
		os.Exit(1)
	}
	fmt.Printf("Go 规范检查通过：%d 个文件，每个文件不超过 %d 行，格式与导出注释符合规范\n", len(files), maxFileLines)
}

func collectFiles() ([]string, error) {
	entries, err := os.ReadDir(".")
	if err != nil {
		return nil, err
	}
	var files []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".go") {
			files = append(files, entry.Name())
		}
	}
	for _, directory := range checkedDirectories {
		err := filepath.WalkDir(directory, func(path string, entry fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".go") {
				files = append(files, path)
			}
			return nil
		})
		if err != nil {
			return nil, err
		}
	}
	sort.Strings(files)
	return files, nil
}
