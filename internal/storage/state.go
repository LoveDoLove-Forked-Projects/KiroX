// state.go 集中声明目录缓存、初始化和设置读写的同步状态。

package storage

import (
	"os"
	"runtime"
	"sync"
)

var (
	dataDirCache         string
	dataDirMu            sync.Mutex
	resultOutputDirCache string
	resultOutputMu       sync.Mutex

	layoutOnce sync.Once
	layoutErr  error
	settingsMu sync.Mutex

	localDataBaseResolver = func() (string, error) {
		if runtime.GOOS == "windows" {
			return os.UserCacheDir()
		}
		return os.UserConfigDir()
	}
	configBaseResolver = os.UserConfigDir
)
