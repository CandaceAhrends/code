class Trie {
  static createNode(parent, data) {
    return {
      parent,
      data,
      children: [],
      isword: false,
    };
  }
  constructor() {
    this.root = Trie.createNode(null, "root");
    this.current = this.root;
    this.results = [];
  }
  generateList(node, collect, w) {
    w += node.data;

    if (!node) return;
    if (node.isword) {
      collect.push(w);
    }
    if (node && node.children && node.children.length)
      node.children.map((child) => {
        this.generateList(child, collect, w);
      });
    return collect;
  }
  search(word) {
    this.current = this.root;
    let found = null;
    word.split("").forEach((letter) => {
      found = this.findChildNode(letter);
      if (found) {
        this.current = found;
      }
    });

    return found ? this.generateList(found, [], word.slice(0, -1)) : [];
  }
  searchLowerCase(word) {
    return this.search(word.toLowerCase());
  }
  reset() {
    this.current = this.root;
  }
  traverse(node) {
    console.log(node.data);
    node.children.forEach((child) => {
      if (child.children.length) {
        this.traverse(child);
      } else {
        console.log(child.data);
      }
    });
  }
  print() {
    this.current = this.root;
    this.traverse(this.current);
  }
  insertNode(parent, data) {
    const node = Trie.createNode(parent, data);
    this.current.children.push(node);
    return node;
  }
  findChildNode(data) {
    const parentNode = this.current || { children: [] };
    return parentNode.children.find((node) => {
      return node.data === data;
    });
  }
  setNodeAsCurrent(node) {
    this.current = node;
  }
  addData(data) {
    let node = this.findChildNode(data) || this.insertNode(this.current, data);

    this.setNodeAsCurrent(node);
  }

  addWord(word) {
    this.reset();
    const chars = word.split("");

    chars.forEach((char) => this.addData(char));
    this.current.isword = true;
  }
  addWordLowerCase(word) {
    this.addWord(word.toLowerCase());
  }
}

module.exports = Trie;
