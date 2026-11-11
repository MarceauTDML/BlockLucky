import { readFileSync } from 'node:fs';

const ITEM = /^(\s*)[-*] \[(.+?)\]\((.+?)\)\s*$/;

export const parseSummary = (file) => {
  const lines = readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const groups = [];
  let current = { title: null, items: [] };
  groups.push(current);
  const stack = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      current = { title: line.slice(3).trim(), items: [] };
      groups.push(current);
      stack.length = 0;
      continue;
    }
    const match = ITEM.exec(line);
    if (!match) continue;
    const depth = Math.floor(match[1].replace(/\t/g, '  ').length / 2);
    const node = { title: match[2], source: match[3], children: [], depth };
    while (stack.length > depth) stack.pop();
    if (depth === 0 || stack.length === 0) {
      current.items.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack[depth] = node;
    stack.length = depth + 1;
  }

  const pages = [];
  const walk = (items, group, parents) => {
    for (const item of items) {
      pages.push({ ...item, group, parents });
      walk(item.children, group, [...parents, item]);
    }
  };
  for (const group of groups) walk(group.items, group, []);

  return { groups: groups.filter((g) => g.items.length > 0), pages };
};
