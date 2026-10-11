# 前端开发约定

前端使用原生 ES Modules，保持静态资源构建方式。页面仅加载 `js/main.js`，模块通过具名导入声明依赖；应用状态和业务函数保留在模块内。Wails 注入的 Go 接口与桌面运行时统一通过 `platform/wails.js` 延迟读取。

## 目录与职责

| 目录               | 职责                                               |
| ------------------ | -------------------------------------------------- |
| `html/layout/`     | 应用框架、窗口标题栏和导航                         |
| `html/pages/`      | 按业务页面组织的内容片段                           |
| `html/dialogs/`    | 任务、代理、账号导入与通用弹窗                     |
| `html/components/` | 独立的共享页面片段                                 |
| `css/base/`        | 重置、设计变量、主题与全局过渡                     |
| `css/layout/`      | 应用框架、导航和响应式布局                         |
| `css/components/`  | 表单、按钮、表格、弹窗与反馈状态                   |
| `css/pages/`       | 各业务页面的布局及专用组件                         |
| `js/core/`         | 应用初始化、导航、动作分发、快捷键和语言同步       |
| `js/platform/`     | Wails 平台接口适配                                 |
| `js/ui/`           | 下拉框、确认弹窗、反馈消息、动态状态和 HTML 转义   |
| `js/settings/`     | 控件读写、变更追踪、快照、保存队列、主题和目录设置 |
| `js/accounts/`     | Outlook 与 iCloud 邮箱列表、分页和维护操作         |
| `js/email/`        | 邮箱提供商配置、连接测试、域名选择和各提供商状态   |
| `js/tasks/`        | 任务表单、操作入口、状态轮询、日志和完成通知       |
| `js/proxy/`        | 代理列表、表单、检测结果、行操作和地址格式处理     |
| `js/about/`        | 版本检查、更新弹窗与更新说明                       |
| `js/i18n/locales/` | 按语言和功能划分的界面文案                         |
| `js/i18n/logs/`    | 日志标签、短语和动态参数翻译规则                   |
| `tooling/`         | HTML 组合、CSS 合并和页面规范检查                  |
| `tests/`           | 设置并发保存、完整页面交互和构建回归测试           |

同一功能的共享状态放在自己的 `state.js` 中。渲染、输入收集和后端操作按职责拆分，避免循环导入。新增函数只导出跨模块需要的接口，新增初始化、事件监听与计时器从入口显式启动。

## HTML 与 CSS

`index.html` 只保留文档框架和资源入口，内容通过相对当前片段的引用组合：

```html
<!-- @include ./html/layout/application.html -->
```

新增页面放在 `html/pages/`，复杂页面继续按内容区域拆分；弹窗放在 `html/dialogs/`。构建时递归展开所有引用，因此完整 DOM 在入口脚本运行前就已存在。缺失文件和循环引用会使构建失败。图片、脚本等资源路径始终相对最终的 `dist/index.html`。

`css/main.css` 是唯一样式入口。使用 `@import` 显式组织模块与级联顺序，构建时由 PostCSS 合并成 `dist/css/main.css`。通用控件和共享布局类放在 `css/components/`，业务页面的规则放在 `css/pages/`；页面专用选择器限定在对应页面或弹窗内，避免影响其他区域。

HTML 和 JavaScript 渲染模板统一使用有语义的 CSS 类，禁止静态 `style` 属性和文档内 `<style>`。状态颜色优先采用有限的修饰类；动态反馈、进度、音量与下拉框定位等运行时状态通过 JavaScript 或 CSS 自定义属性更新。主题使用设计变量，新增规则应复用 `--text`、`--border`、`--accent` 等变量。

按钮显式写 `type="button"`，表单输入声明类型，标签与输入建立关联，图片提供 `alt`。HTML 检查作用于组合后的完整页面，同时检查重复属性、非法嵌套和内联事件。

## 页面事件

HTML 和动态模板使用声明式动作属性：

```html
<button type="button" data-action="switchPage" data-value="settings">设置</button>
<input type="range" data-input-action="syncVolumeLabel" />
<div class="custom-dropdown" data-dropdown-action="selectEmailProvider"></div>
```

动作统一在 `core/actions.js` 的白名单中注册。`data-value` 保存参数，需要数字或控件状态时由对应动作显式转换。下拉框通过 `dropdown:change` 通知动作分发器，并继续触发原生 `change` 供表单追踪。避免内联事件、运行时执行字符串和向 `window` 暴露业务函数。

动态模板中的外部文本和属性值使用 `ui/html.js` 的 `escapeHtml`。更新列表使用容器事件委托，使重渲染后的交互继续有效。

## 文件与注释

- 每个手写 JavaScript、HTML、CSS 文件最多 300 行，包含空行和注释。ESLint 和页面检查脚本会阻止超限；生成的 `dist/` 不受此限制。接近上限时按完整职责拆分。
- 使用 `const`；需要重新赋值时使用 `let`。Prettier 统一两空格缩进、单引号、尾逗号与 LF 换行。
- 每个文件使用中文职责注释：JavaScript 使用 `/** @file ... */`，CSS 使用 `/* @file ... */`，HTML 使用 `<!-- @file ... -->`。对复杂或跨模块接口使用 JSDoc 描述参数、返回值和行为约束。
- 行内注释解释非直观的原因，例如异步响应合并、默认事件行为和日志翻译顺序；避免装饰性分隔线、逐行复述代码和失效的历史说明。
- 对设置的持久化统一经过保存队列，避免独立请求覆盖并发编辑或快捷偏好。

## 开发与验证

```bash
cd frontend
npm ci
npm run format
npm run check
```

`check` 依次执行 ESLint、HTML 校验、Stylelint、格式检查、测试和静态资源构建。可单独运行 `npm run lint:js`、`npm run lint:html`、`npm run lint:css`、`npm test` 或 `npm run build`。`npm run lint:fix` 和 `npm run format` 用于自动修复及统一格式，现有 CI 会执行完整检查。

构建组合 HTML、合并 CSS，并递归复制 `js/` 和静态资源，保留浏览器可加载的相对模块路径。源文件修改后运行构建，Wails 使用的资源仍在 `frontend/dist/`。

测试在独立 VM 中加载真实模块，防止状态跨用例泄漏；DOM 集成测试通过同一个 HTML 组合器读取实际页面，并使用内存 Wails 适配器。构建测试覆盖相对引用、失败条件、样式顺序和媒体查询，不发起外部请求。Node 的 VM 模块接口需要 `--experimental-vm-modules`，测试命令已包含该参数。
