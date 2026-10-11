/** @file CSS 模块的语法、属性与选择器检查约定。 */

export default {
  extends: ['stylelint-config-recommended'],
  ignoreFiles: ['dist/**', 'node_modules/**'],
  rules: {
    'selector-pseudo-element-no-unknown': [
      true,
      { ignorePseudoElements: ['view-transition-old', 'view-transition-new'] },
    ],
  },
};
