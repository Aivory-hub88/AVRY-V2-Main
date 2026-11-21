// Runs model-written JavaScript in a QuickJS (WASM) context. The context has no
// fetch, require, process, fs or timers: the ONLY way out is the `codemode.*`
// functions we inject, each of which maps to one allowlisted tool call.
import { getQuickJS, shouldInterruptAfterDeadline } from 'quickjs-emscripten';

export const DEFAULT_LIMITS = {
  timeoutMs: 20000,
  memoryBytes: 64 * 1024 * 1024,
  stackBytes: 512 * 1024,
  maxToolCalls: 25,
  maxLogChars: 4000,
  maxResultChars: 20000,
};

function truncate(s, n) {
  return s.length > n ? `${s.slice(0, n)}... [truncated ${s.length - n} chars]` : s;
}

/**
 * @param {{code: string, toolNames: string[], callTool: (name: string, args: object) => Promise<unknown>, limits?: Partial<typeof DEFAULT_LIMITS>}} opts
 * @returns {Promise<{result?: unknown, error?: string, logs: string[], calls: number}>}
 */
export async function runInSandbox({ code, toolNames, callTool, limits = {} }) {
  const L = { ...DEFAULT_LIMITS, ...limits };
  const QuickJS = await getQuickJS();
  const rt = QuickJS.newRuntime();
  rt.setMemoryLimit(L.memoryBytes);
  rt.setMaxStackSize(L.stackBytes);
  const deadline = Date.now() + L.timeoutMs;
  rt.setInterruptHandler(shouldInterruptAfterDeadline(deadline));
  const vm = rt.newContext();

  const logs = [];
  let logChars = 0;
  let calls = 0;
  let finished = false;
  const pendingHost = new Set();

  const pump = () => {
    if (finished) return;
    try {
      rt.executePendingJobs();
    } catch {
      /* surfaced through the result promise */
    }
  };

  try {
    // console.log -> captured, capped
    const consoleObj = vm.newObject();
    const logFn = vm.newFunction('log', (...args) => {
      const line = args
        .map((h) => {
          const v = vm.dump(h);
          return typeof v === 'string' ? v : JSON.stringify(v);
        })
        .join(' ');
      if (logChars < L.maxLogChars) {
        logs.push(truncate(line, L.maxLogChars - logChars));
        logChars += line.length;
      }
    });
    vm.setProp(consoleObj, 'log', logFn);
    vm.setProp(vm.global, 'console', consoleObj);
    logFn.dispose();
    consoleObj.dispose();

    // __call(name, argsJson) -> Promise<string>; the single bridge to the host.
    const callFn = vm.newFunction('__call', (nameH, argsH) => {
      const name = vm.getString(nameH);
      const argsJson = argsH === undefined ? '{}' : vm.getString(argsH);
      const deferred = vm.newPromise();
      const work = (async () => {
        if (!toolNames.includes(name)) throw new Error(`unknown tool: ${name}`);
        if (++calls > L.maxToolCalls) throw new Error(`too many tool calls (max ${L.maxToolCalls})`);
        let args;
        try {
          args = JSON.parse(argsJson);
        } catch {
          throw new Error('arguments must be JSON-serialisable');
        }
        const out = await callTool(name, args && typeof args === 'object' ? args : {});
        return JSON.stringify(out === undefined ? null : out);
      })();
      pendingHost.add(work);
      work
        .then(
          (json) => {
            if (finished) return;
            const h = vm.newString(json);
            deferred.resolve(h);
            h.dispose();
          },
          (err) => {
            if (finished) return;
            const h = vm.newString(String(err && err.message ? err.message : err));
            deferred.reject(h);
            h.dispose();
          },
        )
        .finally(() => {
          pendingHost.delete(work);
          pump();
        });
      return deferred.handle;
    });
    vm.setProp(vm.global, '__call', callFn);
    callFn.dispose();

    const prelude = `
      const codemode = {};
      const __c = __call;
      for (const __n of ${JSON.stringify(toolNames)}) {
        codemode[__n] = async (a) => {
          try { return JSON.parse(await __c(__n, JSON.stringify(a === undefined ? {} : a))); }
          catch (e) { throw new Error(String(e && e.message ? e.message : e)); }
        };
      }
      globalThis.codemode = codemode;
      delete globalThis.__call;
    `;
    const pre = vm.evalCode(prelude);
    if (pre.error) {
      const msg = vm.dump(pre.error);
      pre.error.dispose();
      return { error: `sandbox setup failed: ${JSON.stringify(msg)}`, logs, calls };
    }
    pre.value.dispose();

    const wrapped = `(async () => { ${code}\n })().then((v) => JSON.stringify(v === undefined ? null : v))`;
    const evalRes = vm.evalCode(wrapped, 'program.js');
    if (evalRes.error) {
      const e = vm.dump(evalRes.error);
      evalRes.error.dispose();
      return { error: formatErr(e), logs, calls };
    }
    const settled = vm.resolvePromise(evalRes.value);
    evalRes.value.dispose();
    pump();

    const timeout = new Promise((_, reject) => {
      const t = setTimeout(() => reject(new Error(`timed out after ${L.timeoutMs}ms`)), Math.max(1, deadline - Date.now()));
      settled.finally(() => clearTimeout(t));
    });
    const res = await Promise.race([settled, timeout]);
    if (res.error) {
      const e = vm.dump(res.error);
      res.error.dispose();
      return { error: formatErr(e), logs, calls };
    }
    const json = vm.getString(res.value);
    res.value.dispose();
    const safe = truncate(json, L.maxResultChars);
    let result;
    try {
      result = JSON.parse(safe);
    } catch {
      result = safe; // truncated JSON stays a string so the model sees it was cut
    }
    return { result, logs, calls };
  } catch (e) {
    return { error: String(e && e.message ? e.message : e), logs, calls };
  } finally {
    finished = true;
    try {
      vm.dispose();
    } catch {
      /* pending promise handles: runtime teardown below frees the rest */
    }
    try {
      rt.dispose();
    } catch {
      /* already torn down */
    }
  }
}

function formatErr(e) {
  if (e && typeof e === 'object') return `${e.name || 'Error'}: ${e.message || ''}`.trim();
  return String(e);
}
