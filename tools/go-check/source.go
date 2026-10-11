// source.go 检查文件格式、行数与导出声明的 GoDoc 注释。

package main

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/format"
	"go/parser"
	"go/token"
	"strings"
)

func checkSource(path string, source []byte) []string {
	var problems []string
	lines := bytes.Count(source, []byte{'\n'})
	if len(source) > 0 && source[len(source)-1] != '\n' {
		lines++
	}
	if lines > maxFileLines {
		problems = append(problems, fmt.Sprintf("文件有 %d 行，超过 %d 行上限；请按职责拆分", lines, maxFileLines))
	}
	formatted, err := format.Source(source)
	if err != nil {
		return append(problems, fmt.Sprintf("无法解析 Go 源码：%v", err))
	}
	if !bytes.Equal(source, formatted) {
		problems = append(problems, "格式不符合 gofmt，请运行 gofmt -w")
	}
	if strings.HasSuffix(path, "_test.go") {
		return problems
	}
	fileSet := token.NewFileSet()
	file, err := parser.ParseFile(fileSet, path, source, parser.ParseComments)
	if err != nil {
		return append(problems, err.Error())
	}
	checkDoc := func(name *ast.Ident, doc *ast.CommentGroup) {
		if !name.IsExported() {
			return
		}
		if doc != nil {
			words := strings.Fields(doc.Text())
			if len(words) > 0 && words[0] == name.Name {
				return
			}
		}
		line := fileSet.Position(name.Pos()).Line
		problems = append(problems, fmt.Sprintf("第 %d 行：导出声明 %s 需要以名称开头的 GoDoc 注释", line, name.Name))
	}
	for _, declaration := range file.Decls {
		switch declaration := declaration.(type) {
		case *ast.FuncDecl:
			checkDoc(declaration.Name, declaration.Doc)
		case *ast.GenDecl:
			for _, spec := range declaration.Specs {
				switch spec := spec.(type) {
				case *ast.TypeSpec:
					checkDoc(spec.Name, declarationDoc(spec.Doc, declaration.Doc))
				case *ast.ValueSpec:
					// 同一声明中的多个名称共享注释，以首个导出名称为准。
					for _, name := range spec.Names {
						if name.IsExported() {
							checkDoc(name, declarationDoc(spec.Doc, declaration.Doc))
							break
						}
					}
				}
			}
		}
	}
	return problems
}

func declarationDoc(specDoc, groupDoc *ast.CommentGroup) *ast.CommentGroup {
	if specDoc != nil {
		return specDoc
	}
	return groupDoc
}
