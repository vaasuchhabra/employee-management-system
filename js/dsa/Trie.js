/**
 * Trie (Prefix Tree)
 *
 * Used for: instant name search / autocomplete. Every word of an employee's
 *           name (first name, last name) is inserted, so typing "ra" finds
 *           "Rahul Verma" and "Ananya Rao".
 *
 *  Operation      Time
 *  insert         O(L)          L = length of the word
 *  remove         O(L)
 *  searchPrefix   O(P + M)      P = prefix length, M = matches collected
 *
 * Search cost does NOT depend on how many employees exist — only on the
 * length of what the user typed.
 */
class TrieNode {
  constructor() {
    this.children = Object.create(null); // char -> TrieNode
    this.ids = new Set(); // employee ids whose word ENDS here
  }
}

export class Trie {
  constructor() {
    this.root = new TrieNode();
    this.nodeCount = 1;
    this.wordCount = 0;
  }

  static normalise(word) {
    return String(word).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  insert(word, id) {
    const w = Trie.normalise(word);
    if (!w) return;
    let node = this.root;
    for (const ch of w) {
      if (!node.children[ch]) {
        node.children[ch] = new TrieNode();
        this.nodeCount++;
      }
      node = node.children[ch];
    }
    if (!node.ids.has(id)) this.wordCount++;
    node.ids.add(id);
  }

  /** Insert every word in a full name */
  insertName(fullName, id) {
    for (const part of String(fullName).split(/\s+/)) this.insert(part, id);
  }

  remove(word, id) {
    const w = Trie.normalise(word);
    const path = [this.root];
    let node = this.root;
    for (const ch of w) {
      node = node.children[ch];
      if (!node) return false;
      path.push(node);
    }
    if (!node.ids.delete(id)) return false;
    this.wordCount--;
    // prune now-empty branches bottom-up
    for (let i = w.length; i > 0; i--) {
      const n = path[i];
      if (n.ids.size === 0 && Object.keys(n.children).length === 0) {
        delete path[i - 1].children[w[i - 1]];
        this.nodeCount--;
      } else break;
    }
    return true;
  }

  removeName(fullName, id) {
    for (const part of String(fullName).split(/\s+/)) this.remove(part, id);
  }

  /** Returns a Set of ids for all words that start with prefix */
  searchPrefix(prefix) {
    const p = Trie.normalise(prefix);
    let node = this.root;
    for (const ch of p) {
      node = node.children[ch];
      if (!node) return new Set();
    }
    const result = new Set();
    const stack = [node]; // iterative DFS of the sub-trie
    while (stack.length) {
      const n = stack.pop();
      for (const id of n.ids) result.add(id);
      for (const ch in n.children) stack.push(n.children[ch]);
    }
    return result;
  }

  /** Multi-word query: every typed word must prefix-match (set intersection) */
  searchQuery(query) {
    const parts = String(query).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return null;
    let acc = this.searchPrefix(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      const next = this.searchPrefix(parts[i]);
      acc = new Set([...acc].filter((id) => next.has(id)));
    }
    return acc;
  }

  /** Up to `limit` completed words for autocomplete suggestions */
  suggest(prefix, limit = 6) {
    const p = Trie.normalise(prefix);
    let node = this.root;
    for (const ch of p) {
      node = node.children[ch];
      if (!node) return [];
    }
    const words = [];
    const dfs = (n, acc) => {
      if (words.length >= limit) return;
      if (n.ids.size) words.push(acc);
      for (const ch of Object.keys(n.children).sort()) dfs(n.children[ch], acc + ch);
    };
    dfs(node, p);
    return words;
  }

  clear() {
    this.root = new TrieNode();
    this.nodeCount = 1;
    this.wordCount = 0;
  }
}
