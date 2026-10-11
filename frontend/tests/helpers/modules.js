/** @file 在独立 VM 中加载真实 ES 模块，隔离每个用例的模块状态。 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sourceRoot = fileURLToPath(new URL('../../js/', import.meta.url));

export function createModuleLoader(context) {
  const cache = new Map();
  const sandbox = vm.isContext(context) ? context : vm.createContext(context);

  function getModule(filename) {
    if (!cache.has(filename)) {
      const module = new vm.SourceTextModule(fs.readFileSync(filename, 'utf8'), {
        context: sandbox,
        identifier: filename,
        initializeImportMeta(meta) {
          meta.url = pathToFileURL(filename).href;
        },
      });
      cache.set(filename, module);
    }
    return cache.get(filename);
  }

  return async function loadModule(relativePath) {
    const module = getModule(path.resolve(sourceRoot, relativePath));
    if (module.status === 'unlinked') {
      await module.link((specifier, parent) =>
        getModule(path.resolve(path.dirname(parent.identifier), specifier)),
      );
    }
    if (module.status === 'linked') await module.evaluate();
    return module.namespace;
  };
}
