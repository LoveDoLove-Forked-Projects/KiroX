// Package storage 提供用户设置、目录布局、本地 JSON 存储和持久化日志。
// 目录迁移保留源文件；缓存读写返回快照，刷盘通过版本号保护并发修改。
package storage
