// Turns the tenant's visible tools into (a) compact TypeScript-style signatures
// the model reads once in the `execute` description and (b) a tiny ranked search.

function tsType(s) {
  if (!s || typeof s !== 'object') return 'any';
  if (Array.isArray(s.enum)) return s.enum.map((v) => JSON.stringify(v)).join(' | ');
  const t = Array.isArray(s.type) ? s.type[0] : s.type;
  switch (t) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return `${tsType(s.items)}[]`;
    case 'object': {
      const props = s.properties || {};
      const req = new Set(s.required || []);
      const keys = Object.keys(props);
      if (!keys.length) return 'Record<string, any>';
      return `{ ${keys.map((k) => `${k}${req.has(k) ? '' : '?'}: ${tsType(props[k])}`).join('; ')} }`;
    }
    default:
      return 'any';
  }
}

export function signature(tool) {
  const argType = tsType({ ...(tool.inputSchema || { type: 'object' }), type: 'object' });
  const hasRequired = (tool.inputSchema?.required || []).length > 0;
  const desc = (tool.description || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  return `codemode.${tool.name}(args${hasRequired ? '' : '?'}: ${argType}): Promise<any>${desc ? `  // ${desc}` : ''}`;
}

export function signatures(tools) {
  return tools.map(signature).join('\n');
}

export function search(tools, query, limit = 10) {
  const words = String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter(Boolean);
  if (!words.length) return tools.slice(0, limit).map((t) => ({ name: t.name, signature: signature(t), score: 0 }));
  return tools
    .map((t) => {
      const name = t.name.toLowerCase();
      const desc = (t.description || '').toLowerCase();
      let score = 0;
      for (const w of words) {
        if (name === w) score += 6;
        else if (name.includes(w)) score += 3;
        if (desc.includes(w)) score += 1;
      }
      return { name: t.name, signature: signature(t), score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
