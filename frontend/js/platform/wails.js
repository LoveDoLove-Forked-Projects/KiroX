/** @file Wails 注入对象的延迟访问，统一桌面平台与业务模块的边界。 */

/**
 * 每次调用时读取后端接口，兼容模块加载早于 Wails 注入的启动顺序。
 * @returns {Object|undefined} Go 导出的应用接口。
 */
export function getAppApi() {
  return window.go?.main?.App;
}

/** @returns {Object|undefined} Wails 窗口与环境接口。 */
export function getRuntime() {
  return window.runtime;
}
