/** @file 代理列表、表单、选中项与检测结果的模块状态。 */

export const proxyState = {
  pool: [],
  selected: {},
  formMode: 'create',
  editingId: null,
  searchTimer: null,
  resultView: null,
  listLoading: false,
  probing: {},
};
