// node_modules/.pnpm/@promptctl+go-template-js@0.12.0/node_modules/@promptctl/go-template-js/dist/index.js
var TemplateError = class extends Error {
  name = "TemplateError";
  kind = "EvalError";
  pos;
  source;
  constructor(message, pos, ctx = {}) {
    super(message, { cause: ctx.cause });
    this.pos = pos;
    this.source = ctx.source;
  }
  /** 3-line excerpt of the source around the error with caret. */
  get sourceSnippet() {
    return this.source ? buildSnippet(this.source, this.pos) : "";
  }
  toString() {
    const head = `${this.name}: ${this.message}
  at line ${this.pos.line}, column ${this.pos.column}`;
    const snippet = this.sourceSnippet;
    return snippet ? `${head}

${snippet}` : head;
  }
};
var ParseError = class extends TemplateError {
  name = "ParseError";
  kind = "ParseError";
  expected;
  found;
  constructor(message, pos, ctx = {}) {
    super(message, pos, ctx);
    this.expected = ctx.expected;
    this.found = ctx.found;
  }
};
var EvalError = class extends TemplateError {
  name = "EvalError";
  kind = "EvalError";
};
var FuncNotFoundError = class extends EvalError {
  name = "FuncNotFoundError";
  kind = "FuncNotFoundError";
  funcName;
  suggestions;
  constructor(funcName, pos, ctx = {}) {
    const suggestions = nearestMatches(funcName, ctx.available ?? []);
    const tail = suggestions.length === 0 ? "" : ` (did you mean: ${suggestions.join(", ")}?)`;
    super(`function ${JSON.stringify(funcName)} is not registered${tail}`, pos, ctx);
    this.funcName = funcName;
    this.suggestions = suggestions;
  }
};
var ArgCountError = class extends EvalError {
  name = "ArgCountError";
  kind = "ArgCountError";
  funcName;
  accepted;
  got;
  constructor(funcName, accepted, got, pos, ctx = {}) {
    const want = accepted.minimum === accepted.maximum ? `${accepted.minimum}` : `at least ${accepted.minimum}`;
    super(`wrong number of args for ${funcName}: want ${want} got ${got}`, pos, ctx);
    this.funcName = funcName;
    this.accepted = accepted;
    this.got = got;
  }
};
function isStackOverflow(e) {
  return (e instanceof RangeError || e instanceof Error && e.name === "InternalError") && (e.message.includes("call stack") || e.message.includes("too much recursion"));
}
var TypeMismatchError = class extends EvalError {
  name = "TypeMismatchError";
  kind = "TypeMismatchError";
  funcName;
  /** 1-based argument index for human-readable messages. */
  argIndex;
  expected;
  receivedSummary;
  constructor(funcName, argIndex, expected, receivedSummary, pos, ctx = {}) {
    super(`function ${JSON.stringify(funcName)} arg ${argIndex}: expected ${expected}, but a value of type ${receivedSummary} flowed in. Pass it through \`unstyled\` (or your engine's flatten function) to convert.`, pos, ctx);
    this.funcName = funcName;
    this.argIndex = argIndex;
    this.expected = expected;
    this.receivedSummary = receivedSummary;
  }
};
var NotIntegerError = class extends TypeMismatchError {
  constructor(funcName, argIndex, value, pos, ctx = {}) {
    super(funcName, argIndex, "integer", String(value), pos, ctx);
    this.message = Number.isInteger(Number(value)) ? `integer out of range: ${String(value)}` : `expected integer; found ${String(value)}`;
  }
};
var MissingFieldError = class extends EvalError {
  name = "MissingFieldError";
  kind = "MissingFieldError";
  path;
  constructor(path, pos, ctx = {}) {
    super(`field "${path.join(".")}" not found on receiver`, pos, ctx);
    this.path = path;
  }
};
var FailError = class extends EvalError {
  name = "FailError";
  kind = "FailError";
  constructor(message, pos = {
    line: 0,
    column: 0,
    offset: 0
  }, ctx = {}) {
    super(message, pos, ctx);
  }
};
function buildSnippet(source, pos) {
  const lines = source.split("\n");
  const lineIdx = pos.line - 1;
  const display = [];
  if (lineIdx - 1 >= 0 && lineIdx - 1 < lines.length) display.push({
    num: lineIdx,
    text: lines[lineIdx - 1] ?? ""
  });
  if (lineIdx >= 0 && lineIdx < lines.length) display.push({
    num: lineIdx + 1,
    text: lines[lineIdx] ?? ""
  });
  if (lineIdx + 1 < lines.length) display.push({
    num: lineIdx + 2,
    text: lines[lineIdx + 1] ?? ""
  });
  if (display.length === 0) return "";
  const numWidth = String(display[display.length - 1]?.num ?? 1).length;
  const out = [];
  for (const d of display) {
    out.push(`   ${String(d.num).padStart(numWidth, " ")} | ${d.text}`);
    if (d.num === pos.line) {
      const gutter = `   ${" ".repeat(numWidth)} | `;
      const caretPad = " ".repeat(Math.max(0, pos.column - 1));
      out.push(`${gutter}${caretPad}^`);
    }
  }
  return out.join("\n");
}
function nearestMatches(target, candidates) {
  if (candidates.length === 0) return [];
  const ranked = candidates.map((c) => ({
    name: c,
    dist: editDistance(target, c)
  })).sort((a, b) => a.dist - b.dist);
  const cutoff = Math.max(2, Math.floor(target.length / 2));
  return ranked.filter((r) => r.dist <= cutoff).slice(0, 3).map((r) => r.name);
}
function editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1);
  const cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min((cur[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j] ?? 0;
  }
  return prev[n] ?? 0;
}
function assertNever(value) {
  throw new Error(`unhandled node kind: ${JSON.stringify(value)}`);
}
var KEYWORDS = /* @__PURE__ */ new Map([
  ["if", "If"],
  ["else", "Else"],
  ["end", "End"],
  ["range", "Range"],
  ["with", "With"],
  ["break", "Break"],
  ["continue", "Continue"],
  ["define", "Define"],
  ["template", "Template"],
  ["block", "Block"],
  ["true", "Bool"],
  ["false", "Bool"],
  ["nil", "Nil"]
]);
var DEFAULT_DELIMS = {
  left: "{{",
  right: "}}"
};
var COMMENT_OPEN = "/*";
var COMMENT_CLOSE = "*/";
var Lexer = class {
  src;
  leftDelim;
  rightDelim;
  offset = 0;
  line = 1;
  column = 1;
  mode = "text";
  pending;
  constructor(src, delims = DEFAULT_DELIMS) {
    this.src = src;
    this.leftDelim = delims.left;
    this.rightDelim = delims.right;
  }
  /** Position of the next byte to consume. */
  pos() {
    return {
      line: this.line,
      column: this.column,
      offset: this.offset
    };
  }
  /**
  * Build a ParseError that always carries the source for snippet
  * extraction. Lexer call sites use this exclusively.
  */
  err(message, pos, extra = {}) {
    return new ParseError(message, pos, {
      ...extra,
      source: this.src
    });
  }
  next() {
    if (this.pending) {
      const t = this.pending;
      this.pending = void 0;
      return t;
    }
    return this.read();
  }
  peek() {
    if (!this.pending) this.pending = this.read();
    return this.pending;
  }
  read() {
    switch (this.mode) {
      case "text":
        return this.readText();
      case "action":
        return this.readAction();
      case "done":
        return this.makeToken("EOF", "", this.pos());
    }
  }
  readText() {
    if (this.offset >= this.src.length) {
      this.mode = "done";
      return this.makeToken("EOF", "", this.pos());
    }
    const startPos = this.pos();
    let end = this.offset;
    while (end < this.src.length && !this.src.startsWith(this.leftDelim, end)) end += 1;
    const trimLeft = end < this.src.length && this.src[end + this.leftDelim.length] === "-";
    let textEnd = end;
    if (trimLeft) while (textEnd > this.offset && isSpace(this.src[textEnd - 1] ?? "")) textEnd -= 1;
    if (textEnd > this.offset) {
      const value = this.src.slice(this.offset, textEnd);
      this.advanceTo(textEnd);
      return this.makeToken("Text", value, startPos);
    }
    this.advanceTo(end);
    return this.emitLeftDelim(trimLeft);
  }
  emitLeftDelim(trimLeft) {
    const start = this.pos();
    this.advanceBy(this.leftDelim.length);
    if (trimLeft) {
      this.advanceBy(1);
      while (isSpace(this.src[this.offset] ?? "")) this.advanceBy(1);
    }
    this.mode = "action";
    if (this.src.startsWith(COMMENT_OPEN, this.offset)) return this.readComment(start, trimLeft);
    return this.makeToken("LeftDelim", trimLeft ? `${this.leftDelim}-` : this.leftDelim, start, trimLeft ? { trimLeft: true } : {});
  }
  readComment(startDelim, trimLeft) {
    this.advanceBy(2);
    const bodyStart = this.offset;
    const closeIdx = this.src.indexOf(COMMENT_CLOSE, this.offset);
    if (closeIdx === -1) throw this.err("unclosed comment", startDelim, {
      expected: `*/${this.rightDelim}`,
      found: "end of input"
    });
    this.advanceTo(closeIdx);
    const body = this.src.slice(bodyStart, closeIdx).trim();
    this.advanceBy(2);
    while (isSpace(this.src[this.offset] ?? "")) this.advanceBy(1);
    let trimRight = false;
    if (this.src[this.offset] === "-") {
      trimRight = true;
      this.advanceBy(1);
    }
    if (!this.src.startsWith(this.rightDelim, this.offset)) throw this.err(`expected \`${this.rightDelim}\` to close comment`, this.pos(), {
      expected: this.rightDelim,
      found: this.src[this.offset] ?? "end of input"
    });
    this.advanceBy(this.rightDelim.length);
    if (trimRight) while (isSpace(this.src[this.offset] ?? "")) this.advanceBy(1);
    this.mode = "text";
    return this.makeToken("Comment", body, startDelim, {
      ...trimLeft ? { trimLeft: true } : {},
      ...trimRight ? { trimRight: true } : {}
    });
  }
  readAction() {
    this.skipActionSpaces();
    if (this.src.startsWith(`-${this.rightDelim}`, this.offset)) {
      const start2 = this.pos();
      this.advanceBy(1 + this.rightDelim.length);
      this.mode = "text";
      while (isSpace(this.src[this.offset] ?? "")) this.advanceBy(1);
      return this.makeToken("RightDelim", `-${this.rightDelim}`, start2, { trimRight: true });
    }
    if (this.src.startsWith(this.rightDelim, this.offset)) {
      const start2 = this.pos();
      this.advanceBy(this.rightDelim.length);
      this.mode = "text";
      return this.makeToken("RightDelim", this.rightDelim, start2);
    }
    if (this.offset >= this.src.length) throw this.err("unclosed action", this.pos(), {
      expected: this.rightDelim,
      found: "end of input"
    });
    const ch = this.src[this.offset];
    const start = this.pos();
    switch (ch) {
      case "(":
        this.advanceBy(1);
        return this.makeToken("LeftParen", "(", start);
      case ")":
        this.advanceBy(1);
        return this.makeToken("RightParen", ")", start);
      case "|":
        this.advanceBy(1);
        return this.makeToken("Pipe", "|", start);
      case ",":
        this.advanceBy(1);
        return this.makeToken("Comma", ",", start);
      case ":":
        if (this.src[this.offset + 1] === "=") {
          this.advanceBy(2);
          return this.makeToken("Declare", ":=", start);
        }
        throw this.err("expected `:=`", start, {
          expected: ":=",
          found: ":"
        });
      case "=":
        this.advanceBy(1);
        return this.makeToken("Assign", "=", start);
      case '"':
        return this.readQuotedString(start);
      case "`":
        return this.readRawString(start);
      case "'":
        return this.readChar(start);
    }
    if (ch === "$") return this.readVariable(start);
    if (ch !== void 0 && (isDigit(ch) || isSign(ch) && isDigit(this.src[this.offset + 1] ?? "") || ch === "." && isDigit(this.src[this.offset + 1] ?? ""))) return this.readNumber(start);
    if (ch === ".") return this.readDotOrField(start);
    if (ch !== void 0 && isIdentStart(ch)) return this.readIdentifier(start);
    throw this.err(`unexpected character ${JSON.stringify(ch)}`, start, { found: ch ?? "end of input" });
  }
  readQuotedString(start) {
    const startOffset = this.offset;
    this.advanceBy(1);
    while (this.offset < this.src.length) {
      const c = this.src[this.offset];
      if (c === "\\") {
        this.advanceBy(1);
        if (this.offset < this.src.length) this.advanceBy(1);
        continue;
      }
      if (c === "\n") throw this.err("newline in interpreted string", start, { found: "\\n" });
      if (c === '"') {
        this.advanceBy(1);
        return this.makeToken("String", this.src.slice(startOffset, this.offset), start);
      }
      this.advanceBy(1);
    }
    throw this.err("unterminated string literal", start, {
      expected: '"',
      found: "end of input"
    });
  }
  readRawString(start) {
    const startOffset = this.offset;
    this.advanceBy(1);
    while (this.offset < this.src.length) {
      if (this.src[this.offset] === "`") {
        this.advanceBy(1);
        return this.makeToken("String", this.src.slice(startOffset, this.offset), start);
      }
      this.advanceBy(1);
    }
    throw this.err("unterminated raw string literal", start, {
      expected: "`",
      found: "end of input"
    });
  }
  readChar(start) {
    const startOffset = this.offset;
    this.advanceBy(1);
    while (this.offset < this.src.length) {
      const c = this.src[this.offset];
      if (c === "\\") {
        this.advanceBy(1);
        if (this.offset < this.src.length) this.advanceBy(1);
        continue;
      }
      if (c === "\n") throw this.err("newline in rune literal", start, { found: "\\n" });
      if (c === "'") {
        this.advanceBy(1);
        return this.makeToken("Char", this.src.slice(startOffset, this.offset), start);
      }
      this.advanceBy(1);
    }
    throw this.err("unterminated rune literal", start, {
      expected: "'",
      found: "end of input"
    });
  }
  readNumber(start) {
    const startOffset = this.offset;
    if (isSign(this.src[this.offset] ?? "")) this.advanceBy(1);
    if (this.src[this.offset] === "0" && this.offset + 1 < this.src.length) {
      const next = this.src[this.offset + 1];
      if (next === "x" || next === "X") {
        this.advanceBy(2);
        while (isHex(this.src[this.offset] ?? "") || this.src[this.offset] === "_") this.advanceBy(1);
        if (this.src[this.offset] === "." || this.src[this.offset] === "p" || this.src[this.offset] === "P") while (this.isHexFloatTail(this.src[this.offset] ?? "")) this.advanceBy(1);
        return this.finishNumber(startOffset, start);
      }
      if (next === "o" || next === "O") {
        this.advanceBy(2);
        while (isOctal(this.src[this.offset] ?? "") || this.src[this.offset] === "_") this.advanceBy(1);
        return this.finishNumber(startOffset, start);
      }
      if (next === "b" || next === "B") {
        this.advanceBy(2);
        while (isBinary(this.src[this.offset] ?? "") || this.src[this.offset] === "_") this.advanceBy(1);
        return this.finishNumber(startOffset, start);
      }
    }
    while (isDigit(this.src[this.offset] ?? "") || this.src[this.offset] === "_") this.advanceBy(1);
    if (this.src[this.offset] === ".") {
      this.advanceBy(1);
      while (isDigit(this.src[this.offset] ?? "") || this.src[this.offset] === "_") this.advanceBy(1);
    }
    if (this.src[this.offset] === "e" || this.src[this.offset] === "E") {
      this.advanceBy(1);
      if (isSign(this.src[this.offset] ?? "")) this.advanceBy(1);
      while (isDigit(this.src[this.offset] ?? "")) this.advanceBy(1);
    }
    if (this.src[this.offset] === "i") this.advanceBy(1);
    return this.finishNumber(startOffset, start);
  }
  isHexFloatTail(c) {
    return isHex(c) || c === "." || c === "p" || c === "P" || c === "+" || c === "-" || c === "_";
  }
  finishNumber(startOffset, start) {
    if (this.offset === startOffset) throw this.err("expected number", start, { expected: "digit" });
    return this.makeToken("Number", this.src.slice(startOffset, this.offset), start);
  }
  readVariable(start) {
    const startOffset = this.offset;
    this.advanceBy(1);
    while (isIdentPart(this.src[this.offset] ?? "")) this.advanceBy(1);
    while (this.src[this.offset] === "." && isIdentStart(this.src[this.offset + 1] ?? "")) {
      this.advanceBy(1);
      while (isIdentPart(this.src[this.offset] ?? "")) this.advanceBy(1);
    }
    return this.makeToken("Variable", this.src.slice(startOffset, this.offset), start);
  }
  readDotOrField(start) {
    const startOffset = this.offset;
    this.advanceBy(1);
    if (!isIdentStart(this.src[this.offset] ?? "")) return this.makeToken("Dot", ".", start);
    while (isIdentPart(this.src[this.offset] ?? "")) this.advanceBy(1);
    while (this.src[this.offset] === "." && isIdentStart(this.src[this.offset + 1] ?? "")) {
      this.advanceBy(1);
      while (isIdentPart(this.src[this.offset] ?? "")) this.advanceBy(1);
    }
    return this.makeToken("Field", this.src.slice(startOffset, this.offset), start);
  }
  readIdentifier(start) {
    const startOffset = this.offset;
    while (isIdentPart(this.src[this.offset] ?? "")) this.advanceBy(1);
    const text = this.src.slice(startOffset, this.offset);
    const kw = KEYWORDS.get(text);
    if (kw) return this.makeToken(kw, text, start);
    return this.makeToken("Identifier", text, start);
  }
  skipActionSpaces() {
    while (this.offset < this.src.length) {
      const c = this.src[this.offset];
      if (c === " " || c === "	" || c === "\r" || c === "\n") this.advanceBy(1);
      else return;
    }
  }
  advanceBy(n) {
    for (let i = 0; i < n; i++) {
      const c = this.src[this.offset];
      this.offset += 1;
      if (c === "\n") {
        this.line += 1;
        this.column = 1;
      } else this.column += 1;
    }
  }
  advanceTo(target) {
    while (this.offset < target) this.advanceBy(1);
  }
  makeToken(type, value, pos, extra = {}) {
    return Object.freeze({
      type,
      value,
      pos,
      ...extra.trimLeft !== void 0 ? { trimLeft: extra.trimLeft } : {},
      ...extra.trimRight !== void 0 ? { trimRight: extra.trimRight } : {}
    });
  }
};
function isSpace(c) {
  return c === " " || c === "	" || c === "\r" || c === "\n";
}
function isSign(c) {
  return c === "+" || c === "-";
}
function isDigit(c) {
  return c >= "0" && c <= "9";
}
function isHex(c) {
  return isDigit(c) || c >= "a" && c <= "f" || c >= "A" && c <= "F";
}
function isOctal(c) {
  return c >= "0" && c <= "7";
}
function isBinary(c) {
  return c === "0" || c === "1";
}
function isLetter(c) {
  return c >= "a" && c <= "z" || c >= "A" && c <= "Z";
}
function isIdentStart(c) {
  return isLetter(c) || c === "_";
}
function isIdentPart(c) {
  return isIdentStart(c) || isDigit(c);
}
var chainDefines;
var readDefine;
function lookupDefine(defines, name) {
  return readDefine(defines, name);
}
var Defines = class Defines2 {
  static EMPTY = new Defines2(/* @__PURE__ */ new Map(), void 0);
  #own;
  #parent;
  constructor(own, parent) {
    this.#own = own;
    this.#parent = parent;
  }
  static {
    chainDefines = (own, parent) => new Defines2(own, parent);
    readDefine = (d, name) => d.#own.get(name) ?? (d.#parent && readDefine(d.#parent, name));
  }
  has(name) {
    return readDefine(this, name) !== void 0;
  }
  /**
  * Every name this set can render, own and inherited, sorted — what a
  * consumer reads after `evaluateDefine` reports a name as not defined.
  * The parser forbids redeclaring an inherited name, so the chain repeats
  * none; the Set keeps the listing duplicate-free without leaning on that.
  */
  names() {
    const names = /* @__PURE__ */ new Set();
    for (let d = this; d; d = d.#parent) for (const name of d.#own.keys()) names.add(name);
    return [...names].sort();
  }
};
function parse(source, delims, inherit = Defines.EMPTY) {
  return new Parser(source, delims, inherit).parseTemplate();
}
var PIPELINE_CONTEXT = {
  If: "if",
  Range: "range",
  With: "with"
};
var Parser = class {
  lex;
  buf = [];
  defines = /* @__PURE__ */ new Map();
  inherit;
  source;
  rangeDepth = 0;
  constructor(source, delims, inherit) {
    this.source = source;
    this.inherit = inherit;
    this.lex = delims ? new Lexer(source, delims) : new Lexer(source);
  }
  peek(n = 0) {
    while (this.buf.length <= n) this.buf.push(this.lex.next());
    return this.buf[n];
  }
  next() {
    if (this.buf.length > 0) return this.buf.shift();
    return this.lex.next();
  }
  expect(type, what) {
    const t = this.next();
    if (t.type !== type) throw this.errAt(t, `expected ${what}`, {
      expected: what,
      found: tokenLabel(t)
    });
    return t;
  }
  errAt(t, message, extra = {}) {
    return new ParseError(message, t.pos, {
      ...extra,
      source: this.source
    });
  }
  parseTemplate() {
    const root = this.parseList();
    if (this.peek().type !== "EOF") {
      const left = this.peek();
      const inside = this.peek(1);
      if (left.type === "LeftDelim" && (inside.type === "Else" || inside.type === "End")) {
        const keyword = inside.type === "Else" ? "else" : "end";
        throw this.errAt(left, `unexpected \`{{${keyword}}}\` outside of \`if\`, \`range\`, \`with\`, or \`block\``, { found: `{{${keyword}}}` });
      }
      throw this.errAt(left, `unexpected ${tokenLabel(left)}`, { found: tokenLabel(left) });
    }
    return {
      root,
      defines: chainDefines(this.defines, this.inherit),
      ownDefines: this.defines,
      source: this.source
    };
  }
  parseList() {
    const startPos = this.peek().pos;
    const nodes = [];
    while (true) {
      const t = this.peek();
      if (t.type === "EOF") break;
      if (t.type === "Text") {
        this.next();
        nodes.push({
          type: "Text",
          pos: t.pos,
          text: t.value
        });
        continue;
      }
      if (t.type === "Comment") {
        this.next();
        const trim = trimFromToken(t);
        nodes.push({
          type: "Comment",
          pos: t.pos,
          text: t.value,
          trim
        });
        continue;
      }
      if (t.type === "LeftDelim") {
        const inside = this.peek(1).type;
        if (inside === "Else" || inside === "End") return finishList(startPos, nodes);
        const action = this.parseAction();
        if (action !== null) nodes.push(action);
        continue;
      }
      throw this.errAt(t, `unexpected ${tokenLabel(t)} at top level`, { found: tokenLabel(t) });
    }
    return finishList(startPos, nodes);
  }
  parseAction() {
    const left = this.expect("LeftDelim", "`{{`");
    const trimLeft = left.trimLeft === true;
    const head = this.peek();
    switch (head.type) {
      case "If":
        this.next();
        return this.parseBranch("If", left.pos, trimLeft);
      case "Range":
        this.next();
        return this.parseBranch("Range", left.pos, trimLeft);
      case "With":
        this.next();
        return this.parseBranch("With", left.pos, trimLeft);
      case "Break":
        this.next();
        return this.parseBreakOrContinue("Break", left.pos, trimLeft);
      case "Continue":
        this.next();
        return this.parseBreakOrContinue("Continue", left.pos, trimLeft);
      case "Template":
        this.next();
        return this.parseTemplateInvocation(left.pos, trimLeft);
      case "Block":
        this.next();
        return this.parseBlock(left.pos, trimLeft);
      case "Define":
        this.next();
        this.parseDefine(left.pos, trimLeft);
        return null;
      case "RightDelim":
        throw this.errAt(head, "empty action", { expected: "pipeline" });
      default: {
        const pipe = this.parsePipeline("command");
        const right = this.expect("RightDelim", "`}}`");
        return {
          type: "Action",
          pos: left.pos,
          pipe,
          trim: {
            trimLeft,
            trimRight: right.trimRight === true
          }
        };
      }
    }
  }
  parseBranch(kind, startPos, trimLeft) {
    const pipe = this.parsePipeline(PIPELINE_CONTEXT[kind]);
    this.expect("RightDelim", "`}}`");
    if (kind === "Range") this.rangeDepth += 1;
    const list = this.parseList();
    if (kind === "Range") this.rangeDepth -= 1;
    const elsePart = this.parseElsePart();
    const trim = {
      trimLeft,
      trimRight: elsePart.endConsumed ? elsePart.endRight : this.consumeEnd()
    };
    const base = elsePart.list ? {
      pipe,
      list,
      elseList: elsePart.list,
      trim
    } : {
      pipe,
      list,
      trim
    };
    switch (kind) {
      case "If":
        return {
          type: "If",
          pos: startPos,
          ...base
        };
      case "Range":
        return {
          type: "Range",
          pos: startPos,
          ...base
        };
      case "With":
        return {
          type: "With",
          pos: startPos,
          ...base
        };
    }
  }
  parseBreakOrContinue(kind, startPos, trimLeft) {
    if (this.rangeDepth === 0) throw new ParseError(`{{${kind === "Break" ? "break" : "continue"}}} outside of {{range}}`, startPos, { source: this.source });
    const trim = {
      trimLeft,
      trimRight: this.expect("RightDelim", "`}}`").trimRight === true
    };
    return kind === "Break" ? {
      type: "Break",
      pos: startPos,
      trim
    } : {
      type: "Continue",
      pos: startPos,
      trim
    };
  }
  /**
  * Parse the `{{else}}` / `{{else if PIPE}}` segment, if any.
  *
  * `else if` is desugared into a nested IfNode wrapped in the elseList.
  * The recursive parseBranch consumes the chain's single closing
  * `{{end}}`, so the outer caller must NOT consume another — hence the
  * `endConsumed` flag we propagate back.
  */
  parseElsePart() {
    if (this.peek().type !== "LeftDelim" || this.peek(1).type !== "Else") return {
      list: void 0,
      endRight: false,
      endConsumed: false
    };
    const left = this.next();
    this.next();
    if (this.peek().type === "If") {
      this.next();
      const innerIf = this.parseBranch("If", left.pos, left.trimLeft === true);
      return {
        list: {
          type: "List",
          pos: left.pos,
          nodes: [innerIf]
        },
        endRight: innerIf.trim.trimRight,
        endConsumed: true
      };
    }
    this.expect("RightDelim", "`}}`");
    return {
      list: this.parseList(),
      endRight: false,
      endConsumed: false
    };
  }
  /** Consume the closing `{{end}}` and return whether it was a `-}}`. */
  consumeEnd() {
    this.expect("LeftDelim", "`{{end}}`");
    this.expect("End", "`end`");
    return this.expect("RightDelim", "`}}`").trimRight === true;
  }
  parseTemplateInvocation(startPos, trimLeft) {
    const name = this.parseQuotedName();
    const pipe = this.peek().type === "RightDelim" ? void 0 : this.parsePipeline("template clause");
    const trim = {
      trimLeft,
      trimRight: this.expect("RightDelim", "`}}`").trimRight === true
    };
    return pipe ? {
      type: "Template",
      pos: startPos,
      name,
      pipe,
      trim
    } : {
      type: "Template",
      pos: startPos,
      name,
      trim
    };
  }
  parseBlock(startPos, trimLeft) {
    const name = this.parseQuotedName();
    const pipe = this.parsePipeline("block clause");
    this.expect("RightDelim", "`}}`");
    const savedDepth = this.rangeDepth;
    this.rangeDepth = 0;
    const list = this.parseList();
    this.rangeDepth = savedDepth;
    const trim = {
      trimLeft,
      trimRight: this.consumeEnd()
    };
    if (!this.defines.has(name) && !this.inherit.has(name)) this.defines.set(name, {
      list,
      source: this.source
    });
    return {
      type: "Block",
      pos: startPos,
      name,
      pipe,
      list,
      trim
    };
  }
  parseDefine(_startPos, _trimLeft) {
    const name = this.parseQuotedName();
    this.expect("RightDelim", "`}}`");
    const savedDepth = this.rangeDepth;
    this.rangeDepth = 0;
    const list = this.parseList();
    this.rangeDepth = savedDepth;
    this.consumeEnd();
    if (this.defines.has(name) || this.inherit.has(name)) throw new ParseError(`redefinition of template ${JSON.stringify(name)}`, list.pos, { source: this.source });
    this.defines.set(name, {
      list,
      source: this.source
    });
  }
  parseQuotedName() {
    const t = this.next();
    if (t.type !== "String") throw this.errAt(t, "expected template name (quoted string)", {
      expected: "string",
      found: tokenLabel(t)
    });
    return decodeStringLiteral(t.value, t.pos, this.source);
  }
  parsePipeline(context) {
    const startPos = this.peek().pos;
    const decls = this.tryParseDecls(context);
    const end = this.peek();
    if (end.type === "RightDelim" || end.type === "RightParen") throw this.errAt(end, `missing value for ${context}`, { expected: "command" });
    const cmds = [this.parseCommand()];
    while (this.peek().type === "Pipe") {
      this.next();
      const next = this.peek();
      if (!canStartPrimary(next.type)) throw this.errAt(next, "missing command after `|`", {
        expected: "command",
        found: tokenLabel(next)
      });
      cmds.push(this.parseCommand());
    }
    return {
      type: "Pipe",
      pos: startPos,
      decls: decls?.vars ?? [],
      isAssign: decls?.isAssign ?? false,
      cmds
    };
  }
  tryParseDecls(context) {
    if (!isDeclTarget(this.peek())) return void 0;
    let n = 1;
    while (this.peek(n).type === "Comma") {
      if (!isDeclTarget(this.peek(n + 1))) return void 0;
      n += 2;
    }
    const opType = this.peek(n).type;
    if (opType !== "Declare" && opType !== "Assign") return void 0;
    const vars = [varFromToken(this.next())];
    while (this.peek().type === "Comma") {
      const comma = this.next();
      if (vars.length === (context === "range" ? 2 : 1)) throw this.errAt(comma, `too many declarations in ${context}`);
      vars.push(varFromToken(this.expect("Variable", "$variable")));
    }
    return {
      vars,
      isAssign: this.next().type === "Assign"
    };
  }
  parseCommand() {
    const startPos = this.peek().pos;
    const args = [this.parsePrimary()];
    while (canStartPrimary(this.peek().type)) args.push(this.parsePrimary());
    return {
      type: "Command",
      pos: startPos,
      args
    };
  }
  parsePrimary() {
    const t = this.next();
    switch (t.type) {
      case "Dot":
        return {
          type: "Dot",
          pos: t.pos
        };
      case "Field":
        return {
          type: "Field",
          pos: t.pos,
          idents: t.value.slice(1).split(".")
        };
      case "Variable":
        return varFromToken(t);
      case "Identifier":
        return {
          type: "Identifier",
          pos: t.pos,
          ident: t.value
        };
      case "String":
        return {
          type: "String",
          pos: t.pos,
          raw: t.value,
          value: decodeStringLiteral(t.value, t.pos, this.source)
        };
      case "Number":
        return numberFromToken(t);
      case "Char":
        return runeNumberFromToken(t, this.source);
      case "Bool":
        return {
          type: "Bool",
          pos: t.pos,
          value: t.value === "true"
        };
      case "Nil":
        return {
          type: "Nil",
          pos: t.pos
        };
      case "LeftParen":
        return this.parseChainOrPipe(t.pos);
      default:
        throw this.errAt(t, `expected command argument, found ${tokenLabel(t)}`, {
          expected: "command argument",
          found: tokenLabel(t)
        });
    }
  }
  parseChainOrPipe(startPos) {
    const inner = this.parsePipeline("parenthesized pipeline");
    const rparen = this.expect("RightParen", "`)`");
    const fields = [];
    const expectedNextOffset = rparen.pos.offset + 1;
    const t = this.peek();
    if (t.type === "Field" && t.pos.offset === expectedNextOffset) {
      this.next();
      fields.push(...t.value.slice(1).split("."));
    }
    if (fields.length === 0) return inner;
    return {
      type: "Chain",
      pos: startPos,
      node: inner,
      fields
    };
  }
};
function finishList(pos, nodes) {
  return {
    type: "List",
    pos,
    nodes
  };
}
function trimFromToken(t) {
  return {
    trimLeft: t.trimLeft === true,
    trimRight: t.trimRight === true
  };
}
function tokenLabel(t) {
  if (t.type === "EOF") return "end of input";
  return t.value || t.type;
}
function canStartPrimary(t) {
  switch (t) {
    case "Dot":
    case "Field":
    case "Variable":
    case "Identifier":
    case "String":
    case "Number":
    case "Char":
    case "Bool":
    case "Nil":
    case "LeftParen":
      return true;
    default:
      return false;
  }
}
function isDeclTarget(t) {
  return t.type === "Variable" && !t.value.includes(".");
}
function varFromToken(t) {
  return {
    type: "Variable",
    pos: t.pos,
    idents: splitVariableIdents(t.value)
  };
}
function splitVariableIdents(value) {
  const dotIdx = value.indexOf(".");
  if (dotIdx === -1) return [value];
  return [value.slice(0, dotIdx), ...value.slice(dotIdx + 1).split(".")];
}
function numberFromToken(t) {
  const text = t.value;
  const cleaned = text.replace(/_/g, "");
  const isComplex = cleaned.toLowerCase().endsWith("i");
  const body = isComplex ? cleaned.slice(0, -1) : cleaned;
  const isFloat = !isComplex && (body.includes(".") || !body.startsWith("0x") && !body.startsWith("0X") && /[eE]/.test(body) || (body.startsWith("0x") || body.startsWith("0X")) && /[pP]/.test(body));
  const isInt = !isComplex && !isFloat;
  const base = {
    type: "Number",
    pos: t.pos,
    text,
    isInt,
    isUint: false,
    isFloat,
    isComplex
  };
  if (isInt) {
    const intValue = parseIntegerLiteral(body);
    return {
      ...base,
      intValue
    };
  }
  if (isFloat) {
    const floatValue = parseFloatLiteral(body);
    return {
      ...base,
      floatValue
    };
  }
  const im = parseFloatLiteral(body);
  return {
    ...base,
    complexValue: [0, im]
  };
}
function runeNumberFromToken(t, source) {
  const inner = decodeRuneLiteral(t.value, t.pos, source);
  return {
    type: "Number",
    pos: t.pos,
    text: t.value,
    isInt: true,
    isUint: false,
    isFloat: false,
    isComplex: false,
    intValue: BigInt(inner)
  };
}
function parseIntegerLiteral(text) {
  let sign = 1n;
  let body = text;
  if (body.startsWith("+")) body = body.slice(1);
  else if (body.startsWith("-")) {
    sign = -1n;
    body = body.slice(1);
  }
  return sign * BigInt(body);
}
function parseFloatLiteral(text) {
  return Number(text);
}
function decodeStringLiteral(raw, pos, source) {
  if (raw.startsWith("`")) return raw.slice(1, -1);
  let out = "";
  for (let i = 1; i < raw.length - 1; i++) {
    const c = raw[i];
    if (c !== "\\") {
      out += c;
      continue;
    }
    const next = raw[++i];
    switch (next) {
      case "n":
        out += "\n";
        break;
      case "t":
        out += "	";
        break;
      case "r":
        out += "\r";
        break;
      case "\\":
        out += "\\";
        break;
      case '"':
        out += '"';
        break;
      case "'":
        out += "'";
        break;
      case "a":
        out += "\x07";
        break;
      case "b":
        out += "\b";
        break;
      case "f":
        out += "\f";
        break;
      case "v":
        out += "\v";
        break;
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7": {
        const digits = next + (raw[i + 1] ?? "") + (raw[i + 2] ?? "");
        i += 2;
        out += String.fromCodePoint(Number.parseInt(digits, 8));
        break;
      }
      case "x": {
        const digits = (raw[i + 1] ?? "") + (raw[i + 2] ?? "");
        i += 2;
        out += String.fromCodePoint(Number.parseInt(digits, 16));
        break;
      }
      case "u": {
        const digits = raw.slice(i + 1, i + 5);
        i += 4;
        out += String.fromCodePoint(Number.parseInt(digits, 16));
        break;
      }
      case "U": {
        const digits = raw.slice(i + 1, i + 9);
        i += 8;
        out += String.fromCodePoint(Number.parseInt(digits, 16));
        break;
      }
      default:
        throw new ParseError(`bad escape sequence \\${next}`, pos, {
          expected: "valid escape sequence",
          found: `\\${next}`,
          source
        });
    }
  }
  return out;
}
function decodeRuneLiteral(raw, pos, source) {
  const decoded = decodeStringLiteral(`"${raw.slice(1, -1).replace(/"/g, '\\"')}"`, pos, source);
  if (decoded.length === 0) throw new ParseError("empty rune literal", pos, { source });
  return decoded.codePointAt(0) ?? 0;
}
function walk(node, visit) {
  if (visit(node) === false) return;
  for (const child of children(node)) walk(child, visit);
}
function children(node) {
  switch (node.type) {
    case "Text":
    case "Comment":
    case "Dot":
    case "Nil":
    case "Bool":
    case "Number":
    case "String":
    case "Identifier":
    case "Field":
    case "Variable":
    case "Break":
    case "Continue":
      return [];
    case "List":
      return node.nodes;
    case "Chain":
      return [node.node];
    case "Command":
      return node.args;
    case "Pipe":
      return [...node.decls, ...node.cmds];
    case "Action":
      return [node.pipe];
    case "If":
    case "Range":
    case "With":
      return node.elseList ? [
        node.pipe,
        node.list,
        node.elseList
      ] : [node.pipe, node.list];
    case "Template":
      return node.pipe ? [node.pipe] : [];
    case "Block":
      return [node.pipe, node.list];
    default:
      return assertNever(node);
  }
}
var MISSING = /* @__PURE__ */ Symbol("go-template-js.MISSING");
function getField(value, name) {
  if (value === null || value === void 0) return MISSING;
  if (value instanceof Map) return value.has(name) ? value.get(name) : MISSING;
  if (Array.isArray(value)) return MISSING;
  if (typeof value === "object") {
    const obj = value;
    if (name in obj) return obj[name];
    return MISSING;
  }
  return MISSING;
}
function walkFieldChain(value, idents) {
  let cur = value;
  for (const id of idents) {
    if (cur === MISSING) return MISSING;
    cur = getField(cur, id);
  }
  return cur;
}
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || a === void 0 || b === void 0) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) if (!b.has(k) || !deepEqual(v, b.get(k))) return false;
    return true;
  }
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}
var LAZY_FUNCS = /* @__PURE__ */ new WeakSet();
function markLazy(fn) {
  LAZY_FUNCS.add(fn);
  return fn;
}
function isLazy(fn) {
  return LAZY_FUNCS.has(fn);
}
function isTruthy(value) {
  if (value === null || value === void 0) return false;
  if (value === false) return false;
  if (typeof value === "number") return value !== 0 && !Number.isNaN(value);
  if (typeof value === "bigint") return value !== 0n;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value instanceof Map) return value.size > 0;
  if (value instanceof Set) return value.size > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(value);
}
function eagerBuiltins(toString, isT) {
  return {
    eq: {
      fn: (a, ...rest) => rest.some((r) => goEqPair(a, r)),
      argTypes: ["comparable", "comparable"],
      arity: { kind: "variadic" }
    },
    ne: {
      fn: (a, b) => !goEqPair(a, b),
      argTypes: ["comparable", "comparable"],
      arity: { kind: "exact" }
    },
    lt: {
      fn: (a, b) => compare(a, b) < 0,
      argTypes: ["ordered", "ordered"],
      arity: { kind: "exact" }
    },
    le: {
      fn: (a, b) => compare(a, b) <= 0,
      argTypes: ["ordered", "ordered"],
      arity: { kind: "exact" }
    },
    gt: {
      fn: (a, b) => compare(a, b) > 0,
      argTypes: ["ordered", "ordered"],
      arity: { kind: "exact" }
    },
    ge: {
      fn: (a, b) => compare(a, b) >= 0,
      argTypes: ["ordered", "ordered"],
      arity: { kind: "exact" }
    },
    len: {
      fn: (v) => goLen(v),
      argTypes: ["sized"],
      arity: { kind: "exact" }
    },
    index: {
      fn: (collection, ...keys) => {
        let cur = collection;
        for (const k of keys) cur = goIndex(cur, k);
        return cur;
      },
      argTypes: ["collection", "index-key"],
      arity: { kind: "variadic" }
    },
    slice: {
      fn: (collection, ...indices) => goSlice(collection, indices),
      argTypes: ["sliceable", "int"],
      arity: { kind: "variadic" }
    },
    print: {
      fn: (...args) => goPrint(args, toString, isT),
      argTypes: ["stringifiable"],
      arity: { kind: "variadic" },
      returnType: "string"
    },
    println: {
      fn: (...args) => `${goPrintln(args, toString, isT)}
`,
      argTypes: ["stringifiable"],
      arity: { kind: "variadic" },
      returnType: "string"
    },
    printf: {
      fn: (format, ...args) => sprintf(format, args, toString, isT),
      argTypes: ["string", "stringifiable"],
      arity: { kind: "variadic" },
      returnType: "string"
    },
    toString: {
      fn: (v) => formatV(v, toString, isT),
      argTypes: ["value"],
      arity: { kind: "exact" },
      returnType: "string"
    },
    toStrings: {
      fn: (list) => list.map((v) => formatV(v, toString, isT)),
      argTypes: ["list"],
      arity: { kind: "exact" }
    },
    call: {
      fn: (fn, ...args) => fn(...args),
      argTypes: ["callable", "value"],
      arity: { kind: "variadic" },
      writes: true
    },
    html: {
      fn: (...args) => htmlEscape(goPrint(args, toString, isT)),
      argTypes: ["stringifiable"],
      arity: { kind: "variadic" },
      returnType: "string"
    },
    js: {
      fn: (...args) => jsEscape(goPrint(args, toString, isT)),
      argTypes: ["stringifiable"],
      arity: { kind: "variadic" },
      returnType: "string"
    },
    urlquery: {
      fn: (...args) => urlQueryEscape(goPrint(args, toString, isT)),
      argTypes: ["stringifiable"],
      arity: { kind: "variadic" },
      returnType: "string"
    },
    not: {
      fn: (v) => !isTruthy(v),
      argTypes: ["truthy"],
      arity: { kind: "exact" }
    }
  };
}
function lazyBuiltins() {
  return {
    and: markLazy({
      argTypes: ["truthy", "truthy"],
      arity: { kind: "variadic" },
      fn: (...thunks) => {
        let last = true;
        for (const t of thunks) {
          last = t();
          if (!isTruthy(last)) return last;
        }
        return last;
      }
    }),
    or: markLazy({
      argTypes: ["truthy", "truthy"],
      arity: { kind: "variadic" },
      fn: (...thunks) => {
        let last = false;
        for (const t of thunks) {
          last = t();
          if (isTruthy(last)) return last;
        }
        return last;
      }
    })
  };
}
function defaultBuiltins(toString, isT) {
  return {
    ...eagerBuiltins(toString, isT),
    ...lazyBuiltins()
  };
}
function goEqPair(a, b) {
  if (typeof a === "number" && typeof b === "bigint") return BigInt(a) === b;
  if (typeof a === "bigint" && typeof b === "number") return a === BigInt(b);
  return deepEqual(a, b);
}
function compare(a, b) {
  if (typeof a === "bigint" && typeof b === "bigint") return a === b ? 0 : a < b ? -1 : 1;
  if (typeof a === "bigint" || typeof b === "bigint") {
    const an = typeof a === "bigint" ? a : BigInt(Math.trunc(Number(a)));
    const bn = typeof b === "bigint" ? b : BigInt(Math.trunc(Number(b)));
    return an === bn ? 0 : an < bn ? -1 : 1;
  }
  const x = a;
  const y = b;
  return x === y ? 0 : x < y ? -1 : 1;
}
function goLen(value) {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) return value.length;
  if (value instanceof Map) return value.size;
  if (value instanceof Set) return value.size;
  return Object.keys(value).length;
}
function goIndex(collection, key) {
  if (Array.isArray(collection) || typeof collection === "string") {
    const i = indexArg(key, collection.length);
    if (i === collection.length) throw new Error(`index out of range: ${i}`);
    return collection[i];
  }
  if (collection instanceof Map) return collection.get(key);
  if (collection !== null && typeof collection === "object") {
    if (typeof key !== "string") throw new Error(`index: object index must be string, got ${describeType(key)}`);
    return collection[key];
  }
  throw new Error(`index: cannot index ${describeType(collection)}`);
}
function indexArg(key, cap) {
  const x = typeof key === "bigint" ? Number(key) : key;
  if (typeof x !== "number" || !Number.isInteger(x)) throw new Error(`cannot index slice/array with type ${goPrintfType(key)}`);
  if (x < 0 || x > cap) throw new Error(`index out of range: ${String(key)}`);
  return x;
}
function goSlice(collection, indices) {
  if (indices.length > 3) throw new Error(`too many slice indexes: ${indices.length}`);
  if (typeof collection === "string" && indices.length > 2) throw new Error("cannot 3-index slice a string");
  const cap = collection.length;
  const bounds = [
    0,
    cap,
    cap
  ];
  indices.forEach((ix, n) => {
    bounds[n] = indexArg(ix, cap);
  });
  const [i, j, k] = bounds;
  if (i > j) throw new Error(`invalid slice index: ${i} > ${j}`);
  if (j > k) throw new Error(`invalid slice index: ${j} > ${k}`);
  return collection.slice(i, j);
}
function describeType(v) {
  if (v === null) return "null";
  if (v === void 0) return "undefined";
  if (Array.isArray(v)) return "array";
  if (v instanceof Map) return "Map";
  return typeof v;
}
function goPrintfType(v) {
  if (v === null || v === void 0) return "<nil>";
  if (typeof v === "string") return "string";
  if (typeof v === "boolean") return "bool";
  if (typeof v === "bigint") return "int64";
  if (typeof v === "number") return Number.isInteger(v) ? "int" : "float64";
  if (Array.isArray(v)) return "[]interface {}";
  if (v instanceof Map || typeof v === "object") return "map[string]interface {}";
  return typeof v;
}
function goPrint(args, toString, isT) {
  let out = "";
  let prevIsString = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const isString = typeof arg === "string";
    if (i > 0 && !prevIsString && !isString) out += " ";
    out += formatV(arg, toString, isT);
    prevIsString = isString;
  }
  return out;
}
function goPrintln(args, toString, isT) {
  return args.map((arg) => formatV(arg, toString, isT)).join(" ");
}
var HTML_ESCAPE_TABLE = {
  "\0": "\uFFFD",
  '"': "&#34;",
  "'": "&#39;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
function htmlEscape(s) {
  return s.replace(/[\0"'&<>]/g, (c) => HTML_ESCAPE_TABLE[c] ?? c);
}
var JS_FIXED_ESCAPES = {
  "\\": "\\\\",
  "'": "\\'",
  '"': '\\"',
  "<": "\\u003C",
  ">": "\\u003E",
  "&": "\\u0026",
  "=": "\\u003D"
};
var JS_NON_ASCII_PRINTABLE = /^[\p{L}\p{M}\p{N}\p{P}\p{S}]$/u;
function jsEscape(s) {
  let out = "";
  for (const ch of s) {
    const fixed = JS_FIXED_ESCAPES[ch];
    if (fixed !== void 0) {
      out += fixed;
      continue;
    }
    const cp = ch.codePointAt(0);
    if (cp < 32 || cp >= 128 && !JS_NON_ASCII_PRINTABLE.test(ch)) {
      out += `\\u${cp.toString(16).toUpperCase().padStart(4, "0")}`;
      continue;
    }
    out += ch;
  }
  return out;
}
var URL_QUERY_ENCODER = new TextEncoder();
function urlQueryEscape(s) {
  let out = "";
  const bytes = URL_QUERY_ENCODER.encode(s);
  for (const b of bytes) if (b >= 48 && b <= 57 || b >= 65 && b <= 90 || b >= 97 && b <= 122 || b === 45 || b === 46 || b === 95 || b === 126) out += String.fromCharCode(b);
  else if (b === 32) out += "+";
  else out += `%${b.toString(16).toUpperCase().padStart(2, "0")}`;
  return out;
}
function sprintf(format, args, toString, isT) {
  let out = "";
  let argIdx = 0;
  let i = 0;
  while (i < format.length) {
    const ch = format[i];
    if (ch !== "%") {
      out += ch;
      i += 1;
      continue;
    }
    if (format[i + 1] === "%") {
      out += "%";
      i += 2;
      continue;
    }
    let j = i + 1;
    while (j < format.length && "+-# 0".includes(format[j] ?? "")) j += 1;
    while (j < format.length && format[j] !== void 0 && /[0-9]/.test(format[j])) j += 1;
    if (format[j] === ".") {
      j += 1;
      while (j < format.length && format[j] !== void 0 && /[0-9]/.test(format[j])) j += 1;
    }
    const verb = format[j];
    const spec = format.slice(i + 1, j);
    const missing = argIdx >= args.length;
    const arg = args[argIdx++];
    out += missing ? `%!${verb ?? ""}(MISSING)` : formatVerb(verb ?? "", spec, arg, toString, isT);
    i = j + 1;
  }
  return out;
}
function formatVerb(verb, spec, arg, toString, isT) {
  if (arg instanceof Uint8Array && (verb === "s" || verb === "q")) return formatLeafVerb(verb, spec, new TextDecoder().decode(arg), toString, isT);
  if (arg instanceof Uint8Array && verb === "x") return applyWidth(spec, Array.from(arg, (b) => b.toString(16).padStart(2, "0")).join(""));
  return formatWalk(arg, (leaf) => formatLeafVerb(verb, spec, leaf, toString, isT), toString, isT);
}
function formatLeafVerb(verb, spec, arg, toString, isT) {
  switch (verb) {
    case "s":
      return applyWidth(spec, formatLeafV(arg, toString, isT));
    case "d":
      if (typeof arg !== "number" && typeof arg !== "bigint") return badVerb(verb, arg, toString, isT);
      return applyWidth(spec, String(typeof arg === "bigint" ? arg : Math.trunc(arg)));
    case "v":
      return applyWidth(spec, formatLeafV(arg, toString, isT));
    case "q":
      return applyWidth(spec, JSON.stringify(formatLeafV(arg, toString, isT)));
    case "f": {
      if (typeof arg !== "number" && typeof arg !== "bigint") return badVerb(verb, arg, toString, isT);
      const precision = spec.includes(".") ? Number(spec.split(".")[1]) : 6;
      return applyWidth(spec, Number(arg).toFixed(precision));
    }
    case "t":
      if (typeof arg !== "boolean") return badVerb(verb, arg, toString, isT);
      return applyWidth(spec, String(arg));
    case "x":
      if (typeof arg === "string") {
        const bytes = new TextEncoder().encode(arg);
        let hex = "";
        for (const b of bytes) hex += b.toString(16).padStart(2, "0");
        return applyWidth(spec, hex);
      }
      if (typeof arg !== "number" && typeof arg !== "bigint") return badVerb(verb, arg, toString, isT);
      if (typeof arg === "bigint") return applyWidth(spec, arg.toString(16));
      return applyWidth(spec, Math.trunc(arg).toString(16));
    default:
      return badVerb(verb, arg, toString, isT);
  }
}
function badVerb(verb, arg, toString, isT) {
  if (arg === null || arg === void 0) return `%!${verb}(<nil>)`;
  return `%!${verb}(${goPrintfType(arg)}=${formatLeafV(arg, toString, isT)})`;
}
function applyWidth(spec, body) {
  const flag = spec.match(/^([+\-# 0]*)/)?.[1] ?? "";
  const widthMatch = spec.slice(flag.length).match(/^(\d+)/);
  if (!widthMatch) return body;
  const width = Number(widthMatch[1]);
  if (body.length >= width) return body;
  const pad = " ".repeat(width - body.length);
  return flag.includes("-") ? body + pad : pad + body;
}
function formatV(value, toString, isT) {
  try {
    return formatWalk(value, (leaf) => formatLeafV(leaf, toString, isT), toString, isT);
  } catch (err) {
    if (err instanceof UnprintableError) throw new UnprintableError(err.leaf, err.cause, value);
    throw err;
  }
}
function formatWalk(value, leaf, toString, isT) {
  if (isT(value)) return leaf(value);
  const walk2 = (v) => formatWalk(v, leaf, toString, isT);
  if (Array.isArray(value)) return `[${value.map(walk2).join(" ")}]`;
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) return `[${Array.from(value, walk2).join(" ")}]`;
  if (value instanceof Map) return formatEntries([...value.entries()], walk2, toString, isT);
  if (isPlainObject(value)) return formatEntries(Object.entries(value), walk2, toString, isT);
  if (isStruct(value)) return `{${Object.values(value).map(walk2).join(" ")}}`;
  return leaf(value);
}
function isStruct(value) {
  return typeof value === "object" && value !== null && !(value instanceof Set) && !hasOwnString(value);
}
function formatLeafV(value, toString, isT) {
  if (value === null || value === void 0) return "<nil>";
  if (typeof value === "string") return value;
  if (isT(value)) return flattenT(value, toString);
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && hasOwnString(value)) return stringerText(value);
  throw new UnprintableError(value);
}
function flattenT(value, toString) {
  try {
    return toString(value);
  } catch (err) {
    if (isStackOverflow(err)) throw err;
    throw new UnprintableError(value, err);
  }
}
function stringerText(value) {
  try {
    return String(value);
  } catch (err) {
    if (isStackOverflow(err)) throw err;
    throw new UnprintableError(value, err);
  }
}
function hasOwnString(value) {
  let root = value;
  for (let p = Object.getPrototypeOf(root); p !== null; p = Object.getPrototypeOf(p)) root = p;
  const own = value.toString;
  return typeof own === "function" && own !== root.toString;
}
var UnprintableError = class extends Error {
  name = "UnprintableError";
  /** What cannot print, named from the printed value: the leaf alone, or
  * the value holding it. */
  summary;
  constructor(leaf, cause, root = leaf) {
    const summary = root === leaf ? typeNameOf(leaf) : `${typeNameOf(root)} holding ${typeNameOf(leaf)}`;
    const why = cause instanceof TypeMismatchError ? `expected ${cause.expected}` : "it has no text form";
    super(`cannot print a value of type ${summary}: ${why}`, { cause });
    this.leaf = leaf;
    this.summary = summary;
  }
};
function typeNameOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value !== "object") return typeof value;
  if (isPlainObject(value)) return "object";
  for (let p = Object.getPrototypeOf(value); p !== null; p = Object.getPrototypeOf(p)) {
    const name = p.constructor?.name;
    if (typeof name === "string" && name !== "") return name === "Object" ? "object" : name;
  }
  return "object";
}
function formatEntries(entries, walk2, toString, isT) {
  const isNumeric = (k) => typeof k === "number" || typeof k === "bigint";
  const byKey = (a, b) => {
    if (isNumeric(a.k) && isNumeric(b.k)) return a.k < b.k ? -1 : a.k > b.k ? 1 : 0;
    if (isNumeric(a.k) !== isNumeric(b.k)) return isNumeric(a.k) ? -1 : 1;
    return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
  };
  return `map[${entries.map(([k, v]) => ({
    k,
    v,
    text: formatV(k, toString, isT)
  })).sort(byKey).map(({ k, v }) => `${walk2(k)}:${walk2(v)}`).join(" ")}]`;
}
function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  if (value instanceof Map || value instanceof Set) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || Object.getPrototypeOf(proto) === null;
}
var render = () => {
  throw new Error("include was called outside the evaluator's dispatch");
};
function isInclude(fn) {
  return fn.fn === render;
}
var NO_MARKS = /* @__PURE__ */ new Set();
var createMarked;
var openMarked;
var readCarrier;
var Marked = class Marked2 {
  #value;
  #marks;
  constructor(value, marks) {
    this.#value = value;
    this.#marks = marks;
  }
  static {
    createMarked = (value, marks) => value instanceof Marked2 ? new Marked2(value.#value, [...value.#marks, ...marks]) : new Marked2(value, marks);
    openMarked = (result) => result instanceof Marked2 ? {
      value: result.#value,
      marks: result.#marks
    } : {
      value: result,
      marks: []
    };
    readCarrier = (result, into) => {
      if (!(result instanceof Marked2)) return result;
      for (const mark of result.#marks) into.add(mark);
      return result.#value;
    };
  }
};
function unionMarks(a, b) {
  if (b.size === 0) return a;
  if (a.size === 0) return b;
  return /* @__PURE__ */ new Set([...a, ...b]);
}
function rootScope(dot) {
  return {
    dot,
    parent: void 0,
    vars: /* @__PURE__ */ new Map([["$", dot]])
  };
}
function pushScope(parent, dot) {
  return {
    dot,
    parent,
    vars: /* @__PURE__ */ new Map()
  };
}
function findFrame(scope, name) {
  let cur = scope;
  while (cur !== void 0 && !cur.vars.has(name)) cur = cur.parent;
  return cur;
}
function lookupVar(scope, name) {
  return findFrame(scope, name)?.vars.get(name);
}
function declareVar(scope, name, binding) {
  scope.vars.set(name, binding);
}
function assignVar(scope, name, binding) {
  const frame = findFrame(scope, name);
  frame?.vars.set(name, binding);
  return frame !== void 0;
}
function markVar(scope, name, marks) {
  const binding = lookupVar(scope, name);
  if (binding === void 0) return;
  assignVar(scope, name, {
    value: binding.value,
    marks: unionMarks(binding.marks, marks)
  });
}
var ARG_TYPES = [
  "string",
  "int",
  "truncating-int",
  "float",
  "bool",
  "T",
  "ordered",
  "list",
  "dict",
  "sized",
  "comparable",
  "stringifiable",
  "liftable",
  "callable",
  "collection",
  "index-key",
  "sliceable",
  "truthy",
  "reflective",
  "value",
  "serializable"
];
var VALID_MISSING_KEYS = /* @__PURE__ */ new Set([
  "default",
  "zero",
  "error"
]);
function validateMissingKey(value) {
  if (value === void 0) return "default";
  if (VALID_MISSING_KEYS.has(value)) return value;
  throw new Error(`EngineConfig.missingKey: expected "default" | "zero" | "error", got ${describeBoundaryValue(value)}`);
}
function describeBoundaryValue(value) {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null) return "null";
  if (value === void 0) return "undefined";
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "symbol") return value.toString();
  if (typeof value === "function") return "[Function]";
  return `[${typeof value}]`;
}
function validateDelims(value) {
  if (value === void 0) return void 0;
  if (typeof value !== "object" || value === null) throw new Error(`EngineConfig.delims: expected { left, right } object, got ${describeBoundaryValue(value)}`);
  if (typeof value.left !== "string" || value.left.length === 0) throw new Error(`EngineConfig.delims.left: expected non-empty string, got ${describeBoundaryValue(value.left)}`);
  if (typeof value.right !== "string" || value.right.length === 0) throw new Error(`EngineConfig.delims.right: expected non-empty string, got ${describeBoundaryValue(value.right)}`);
  return {
    left: value.left,
    right: value.right
  };
}
function readsSlotsFromArgTypes(arity) {
  switch (arity.kind) {
    case "exact":
      return false;
    case "variadic":
      return true;
    case "alternating":
      return true;
  }
}
function validateArgSpecs(funcs) {
  const legal = new Set(ARG_TYPES);
  for (const [name, fn] of Object.entries(funcs)) {
    fn.argTypes.forEach((declared, slot) => {
      if (!legal.has(declared)) throw new Error(`EngineConfig.funcs.${name}: argTypes[${slot}] is ${JSON.stringify(declared)}, which is not an ArgType; declare one of ${ARG_TYPES.join(", ")}`);
    });
    if (readsSlotsFromArgTypes(fn.arity) && fn.argTypes.length === 0) throw new Error(`EngineConfig.funcs.${name}: arity ${JSON.stringify(fn.arity.kind)} needs at least one declared argType (it reads its repeating slot from the end of argTypes); declare the slots the Go signature has, or use { kind: "exact" }`);
    if (fn.arity.kind === "alternating" && (!Number.isSafeInteger(fn.arity.minimum) || fn.arity.minimum < 0)) throw new Error(`EngineConfig.funcs.${name}: arity "alternating" needs a non-negative integer minimum, got ${String(fn.arity.minimum)}; the gate rejects every count below it, so a negative or non-finite minimum would disable the lower bound`);
  }
  return funcs;
}
var BREAK_SIGNAL = Object.freeze({ kind: "break" });
var CONTINUE_SIGNAL = Object.freeze({ kind: "continue" });
var NO_PIPE = { kind: "none" };
var notDefined = (name) => `template ${JSON.stringify(name)} is not defined`;
var internalCreateTemplate;
var Template = class Template2 {
  source;
  _evaluate;
  _evaluateDefine;
  _defines;
  _referencedFunctions;
  _referencedCalls;
  constructor(source, evaluate, evaluateDefine, defines, referencedFunctions, referencedCalls) {
    this.source = source;
    this._evaluate = evaluate;
    this._evaluateDefine = evaluateDefine;
    this._defines = defines;
    this._referencedFunctions = referencedFunctions;
    this._referencedCalls = referencedCalls;
  }
  static {
    internalCreateTemplate = (source, evaluate, evaluateDefine, defines, referencedFunctions, referencedCalls) => new Template2(source, evaluate, evaluateDefine, defines, referencedFunctions, referencedCalls);
  }
  /**
  * The named sub-templates this template can invoke — its own `{{define}}`s
  * chained onto whatever it inherited at parse. Pass it to `engine.parse` as
  * `inherit` to let another template invoke the same set without re-parsing
  * (and re-allocating) it: the idiom for a shared helper preamble is
  * `const helpers = engine.parse(preamble).defines()` once, then
  * `engine.parse(src, helpers)` per template. Opaque: the AST inside is not
  * part of the public surface.
  */
  defines() {
    return this._defines;
  }
  evaluate(scope) {
    return this._evaluate(scope);
  }
  /**
  * Render one named sub-template — any `{{ define }}` in {@link defines}, its
  * own or inherited — with `scope` as its dot and `$`, as Go's
  * `ExecuteTemplate` does. The output is the same `T[]` a whole-template
  * {@link evaluate} produces, through the same `emitted` / `decided` hooks.
  */
  evaluateDefine(name, scope) {
    return this._evaluateDefine(name, scope);
  }
  /**
  * The FuncMap function names this template references — every identifier that
  * names a function in this parse: the template body and its own `{{ define }}`
  * blocks. A set inherited at parse (see {@link Template.defines}) is described
  * by the template that parsed it, not here.
  *
  * This is a STATIC fact derived from the parsed AST, not an execution trace:
  * a name in the set is a function the template *can* invoke; a name absent
  * from the set is one it provably never invokes. Use it to ask "does this
  * template use helper X?" without evaluating it (e.g. to discover which
  * templates depend on a feature func) — robust where a source-text scan is
  * not, because it sees through whitespace, pipelines, and field/string
  * lookalikes.
  *
  * Built-in operators registered for every engine (`and`, `eq`, `index`,
  * `printf`, …) are reported the same as consumer funcs — a referenced name is
  * a referenced name regardless of who registered it.
  */
  referencedFunctions() {
    return this._referencedFunctions;
  }
  /**
  * Every command-head call in this parse — the template body and its own
  * `{{ define }}` blocks, never an inherited set — in preorder, each paired with its positional arguments projected to literal
  * strings (a non-string-literal argument is reported as `null`, preserving
  * argument positions).
  *
  * Like {@link referencedFunctions} this is a STATIC fact from the parsed AST,
  * not an execution trace. Use it when "is X called?" is not enough and you
  * need the literal arguments a call was written with — e.g. to discover that a
  * template contains `{{ menu "applyTheme" "themePage" }}` and read its first
  * argument without evaluating the template. Each call's `argExprs` carries the
  * full {@link ReferencedArg} projection (scalar literals, nested literal calls
  * like `(dict "k" "v")`, `dynamic` for eval-time values); `args` is its
  * string-literal-only view. Calls whose head is not a bare function
  * identifier (e.g. a field invoked via `call`) are not reported here; their
  * names still appear in {@link referencedFunctions}.
  */
  referencedCalls() {
    return this._referencedCalls;
  }
};
function collectReferencedFunctions(parsed) {
  const names = /* @__PURE__ */ new Set();
  const collect = (root) => {
    walk(root, (node) => {
      if (node.type === "Identifier") names.add(node.ident);
    });
  };
  collect(parsed.root);
  for (const entry of parsed.ownDefines.values()) collect(entry.list);
  return names;
}
var DYNAMIC_ARG = { kind: "dynamic" };
function projectArg(node) {
  switch (node.type) {
    case "String":
      return {
        kind: "literal",
        value: node.value
      };
    case "Bool":
      return {
        kind: "literal",
        value: node.value
      };
    case "Nil":
      return {
        kind: "literal",
        value: null
      };
    case "Number": {
      const value = numberValue(node);
      return typeof value === "number" || typeof value === "bigint" ? {
        kind: "literal",
        value
      } : DYNAMIC_ARG;
    }
    case "Pipe": {
      if (node.decls.length !== 0 || node.cmds.length !== 1) return DYNAMIC_ARG;
      const cmd = node.cmds[0];
      if (cmd === void 0) return DYNAMIC_ARG;
      const head = cmd.args[0];
      if (head === void 0 || head.type !== "Identifier") return DYNAMIC_ARG;
      return {
        kind: "call",
        name: head.ident,
        args: cmd.args.slice(1).map(projectArg)
      };
    }
    default:
      return DYNAMIC_ARG;
  }
}
function collectReferencedCalls(parsed) {
  const calls = [];
  const collect = (root) => {
    walk(root, (node) => {
      if (node.type !== "Command") return;
      const head = node.args[0];
      if (head === void 0 || head.type !== "Identifier") return;
      const argExprs = node.args.slice(1).map(projectArg);
      calls.push({
        name: head.ident,
        args: argExprs.map((arg) => arg.kind === "literal" && typeof arg.value === "string" ? arg.value : null),
        argExprs
      });
    });
  };
  collect(parsed.root);
  for (const entry of parsed.ownDefines.values()) collect(entry.list);
  return calls;
}
var Engine = class {
  fromString;
  toString;
  isT;
  funcs;
  missingKey;
  delims;
  emitted;
  decided;
  constructor(config) {
    this.fromString = config.fromString;
    const userToString = Object.hasOwn(config, "toString") ? config.toString : void 0;
    this.toString = userToString ?? defaultToString;
    this.missingKey = validateMissingKey(config.missingKey);
    this.delims = validateDelims(config.delims);
    this.isT = config.isT ?? DEFAULT_IS_T;
    this.emitted = config.emitted ?? ((value) => value);
    this.decided = config.decided ?? (() => {
    });
    this.funcs = validateArgSpecs({
      ...defaultBuiltins(this.toString, this.isT),
      ...config.funcs ?? {}
    });
  }
  /**
  * Parse a template source into a reusable Template handle.
  *
  * The returned Template is immutable; calling `evaluate(scope)` on
  * it any number of times with different scopes is safe and avoids
  * re-parsing.
  */
  parse(source, inherit) {
    const parsed = parse(source, this.delims, inherit);
    return internalCreateTemplate(parsed.source, (scope) => this.evalParsed(parsed, scope, (root, ctx) => this.evalList(parsed.root, root, ctx)), (name, scope) => {
      const entry = lookupDefine(parsed.defines, name);
      if (!entry) throw new Error(notDefined(name));
      return this.evalParsed(parsed, scope, (root, ctx) => this.renderDefine(name, entry, root.dot, entry.list.pos, {
        ...ctx,
        source: entry.source
      }));
    }, parsed.defines, collectReferencedFunctions(parsed), collectReferencedCalls(parsed));
  }
  /**
  * Convenience sugar for `parse(src).evaluate.bind(template)`.
  *
  * Returns a closure that takes a scope and produces T[]. Useful when
  * the template is parsed once at module load and called many times.
  */
  compile(source) {
    const template = this.parse(source);
    return (scope) => template.evaluate(scope);
  }
  /**
  * Evaluate a parsed template against a scope value, producing T[].
  *
  * Accepts only Templates produced by `engine.parse(src)` so the
  * public type surface stays clear of internal AST shapes.
  */
  evaluate(template, scope) {
    return template.evaluate(scope);
  }
  evalParsed(parsed, scope, body) {
    const out = [];
    body(rootScope({
      value: scope,
      marks: NO_MARKS
    }), {
      emit: (value, marks) => out.push(this.emitted(value, marks)),
      decided: this.decided,
      defines: parsed.defines,
      source: parsed.source,
      marks: NO_MARKS,
      depth: 0
    });
    return out;
  }
  evalList(node, scope, ctx) {
    for (const child of node.nodes) this.evalNode(child, scope, ctx);
  }
  evalNode(node, scope, ctx) {
    switch (node.type) {
      case "Text":
        ctx.emit(this.fromString(node.text), ctx.marks);
        return;
      case "Comment":
        return;
      case "Action":
        this.read(ctx, (reads) => {
          const value = this.evalPipe(node.pipe, scope, ctx, reads);
          if (node.pipe.decls.length === 0) ctx.emit(this.lift(value, node.pos, ctx.source), unionMarks(reads, ctx.marks));
        });
        return;
      case "List":
        this.evalList(node, scope, ctx);
        return;
      case "If":
        this.evalIf(node, scope, ctx);
        return;
      case "Range":
        this.evalRange(node, scope, ctx);
        return;
      case "With":
        this.evalWith(node, scope, ctx);
        return;
      case "Break":
        throw BREAK_SIGNAL;
      case "Continue":
        throw CONTINUE_SIGNAL;
      case "Template":
        this.evalTemplateInvoke(node, scope, ctx);
        return;
      case "Block":
        this.evalBlock(node, scope, ctx);
        return;
      case "Pipe":
      case "Command":
      case "Identifier":
      case "Field":
      case "Variable":
      case "Chain":
      case "Dot":
      case "Nil":
      case "Bool":
      case "Number":
      case "String":
        throw new EvalError(`unexpected ${node.type} at statement position`, node.pos, { source: ctx.source });
      default:
        assertNever(node);
    }
  }
  evalIf(node, scope, ctx) {
    const frame = constructFrame(scope);
    const { value: cond, reads } = this.read(ctx, (r) => this.evalPipe(node.pipe, frame, ctx, r));
    const arm = this.decide(reads, ctx, frame, node);
    if (isTruthy(cond)) this.evalList(node.list, frame, arm);
    else if (node.elseList) this.evalList(node.elseList, frame, arm);
  }
  evalWith(node, scope, ctx) {
    const frame = constructFrame(scope);
    const { value, reads } = this.read(ctx, (r) => this.evalPipe(node.pipe, frame, ctx, r));
    const arm = this.decide(reads, ctx, frame, node);
    if (isTruthy(value)) this.evalList(node.list, pushScope(frame, {
      value,
      marks: arm.marks
    }), arm);
    else if (node.elseList) this.evalList(node.elseList, frame, arm);
  }
  evalRange(node, scope, ctx) {
    const rangeScope = constructFrame(scope);
    const { value, reads } = this.read(ctx, (r) => this.evalPipe(node.pipe, rangeScope, ctx, r));
    const arm = this.decide(reads, ctx, rangeScope, node);
    const { decls, isAssign } = node.pipe;
    const entries = enumerateForRange(value);
    try {
      if (entries.length === 0) {
        if (node.elseList) this.evalList(node.elseList, rangeScope, arm);
        return;
      }
      for (const [key, item] of entries) {
        decls.forEach((decl, i) => {
          const binding = {
            value: i === decls.length - 1 ? item : key,
            marks: arm.marks
          };
          this.bind(rangeScope, decl, isAssign, binding, ctx);
        });
        const child = pushScope(rangeScope, {
          value: item,
          marks: arm.marks
        });
        try {
          this.evalList(node.list, child, arm);
        } catch (e) {
          if (e === CONTINUE_SIGNAL) continue;
          throw e;
        }
      }
    } catch (e) {
      if (e === BREAK_SIGNAL) return;
      throw e;
    }
  }
  evalTemplateInvoke(node, scope, ctx) {
    const entry = this.definedEntry(node.name, node.pos, ctx);
    const dot = this.invocationDot(node.pipe, scope, ctx);
    this.renderDefine(node.name, entry, dot, node.pos, ctx);
  }
  definedEntry(name, pos, ctx) {
    const entry = lookupDefine(ctx.defines, name);
    if (!entry) throw new EvalError(notDefined(name), pos, { source: ctx.source });
    return entry;
  }
  renderDefine(name, body, dot, pos, ctx) {
    try {
      this.evalList(body.list, rootScope(dot), {
        ...ctx,
        source: body.source,
        depth: ctx.depth + 1
      });
    } catch (e) {
      if (!isStackOverflow(e)) throw e;
      throw new EvalError(`template ${JSON.stringify(name)}: nesting depth ${ctx.depth + 1} exceeds the host's stack`, pos, {
        source: ctx.source,
        cause: e
      });
    }
  }
  include(registered, name, data, pos, ctx, reads) {
    const entry = this.definedEntry(name, pos, ctx);
    const parts = [];
    const emit = (value, marks) => {
      parts.push(this.toString(value));
      for (const mark of marks) reads.add(mark);
    };
    const decided = (marks) => {
      ctx.decided(marks);
      for (const mark of marks) reads.add(mark);
    };
    const dot = {
      value: data,
      marks: /* @__PURE__ */ new Set([...reads, ...ctx.marks])
    };
    try {
      this.renderDefine(name, entry, dot, pos, {
        ...ctx,
        emit,
        decided
      });
    } catch (e) {
      if (!(e instanceof TemplateError)) throw e;
      const root = innermost(e);
      throw new (root instanceof FailError ? FailError : EvalError)(`error calling ${registered} ${JSON.stringify(name)}: ${root.message}`, pos, {
        source: ctx.source,
        cause: e
      });
    }
    return parts.join("");
  }
  evalBlock(node, scope, ctx) {
    const dot = this.invocationDot(node.pipe, scope, ctx);
    const entry = lookupDefine(ctx.defines, node.name) ?? {
      list: node.list,
      source: ctx.source
    };
    this.renderDefine(node.name, entry, dot, node.pos, ctx);
  }
  decide(reads, ctx, frame, arms) {
    const marks = unionMarks(ctx.marks, reads);
    ctx.decided(marks);
    for (const name of this.assignedIn(arms)) markVar(frame, name, marks);
    return {
      ...ctx,
      marks
    };
  }
  assigned = /* @__PURE__ */ new WeakMap();
  assignedIn(arms) {
    const cached = this.assigned.get(arms.list);
    if (cached !== void 0) return cached;
    const names = /* @__PURE__ */ new Set();
    const collect = (n) => {
      if (n.type === "Pipe" && n.isAssign) for (const d of n.decls) names.add(d.idents[0] ?? "$");
    };
    for (const list of [arms.list, arms.elseList]) if (list) walk(list, collect);
    const found = [...names];
    this.assigned.set(arms.list, found);
    return found;
  }
  invocationDot(pipe, scope, ctx) {
    const { value, reads } = this.read(ctx, (r) => pipe ? this.evalPipe(pipe, scope, ctx, r) : null);
    return {
      value,
      marks: unionMarks(reads, ctx.marks)
    };
  }
  read(ctx, evaluate) {
    const reads = /* @__PURE__ */ new Set();
    try {
      return {
        value: evaluate(reads),
        reads
      };
    } catch (e) {
      ctx.decided(unionMarks(reads, ctx.marks));
      throw e;
    }
  }
  evalPipe(pipe, scope, ctx, reads) {
    if (pipe.cmds.length === 0) throw new EvalError("empty pipeline", pipe.pos, { source: ctx.source });
    const inputs = /* @__PURE__ */ new Set();
    let value;
    try {
      value = this.evalCommand(pipe.cmds[0], scope, ctx, NO_PIPE, inputs);
      for (let i = 1; i < pipe.cmds.length; i++) {
        const next = pipe.cmds[i];
        value = this.evalCommand(next, scope, ctx, {
          kind: "value",
          value
        }, inputs);
      }
    } finally {
      for (const mark of inputs) reads.add(mark);
    }
    for (const decl of pipe.decls) this.bind(scope, decl, pipe.isAssign, {
      value,
      marks: unionMarks(inputs, ctx.marks)
    }, ctx);
    return value;
  }
  bind(scope, decl, isAssign, binding, ctx) {
    const name = decl.idents[0] ?? "$";
    if (!isAssign) declareVar(scope, name, binding);
    else if (!assignVar(scope, name, binding)) throw undefinedVariable(name, decl.pos, ctx);
  }
  evalCommand(cmd, scope, ctx, piped, reads) {
    if (cmd.args.length === 0) throw new EvalError("empty command", cmd.pos, { source: ctx.source });
    const head = cmd.args[0];
    if (head.type !== "Identifier") {
      if (cmd.args.length > 1) throw new EvalError(`cannot apply arguments to a ${head.type} primary; only functions take arguments`, cmd.pos, { source: ctx.source });
      return this.evalPrimary(head, scope, ctx, reads);
    }
    const fn = this.funcs[head.ident];
    if (!fn) throw new FuncNotFoundError(head.ident, head.pos, {
      source: ctx.source,
      available: Object.keys(this.funcs)
    });
    const argNodes = cmd.args.slice(1);
    const lazy = isLazy(fn);
    const args = argNodes.map((n) => lazy ? () => this.evalPrimary(n, scope, ctx, reads) : this.evalPrimary(n, scope, ctx, reads));
    if (piped.kind === "value") {
      const v = piped.value;
      args.push(lazy ? () => v : v);
    }
    return this.invoke(head.ident, fn, args, cmd.pos, ctx, reads);
  }
  invoke(name, fn, args, pos, ctx, reads) {
    try {
      enforceArgTypes(name, fn, args, pos, ctx.source, this.toString, this.fromString, this.isT);
    } catch (e) {
      if (e instanceof TemplateError) throw e;
      throw new EvalError(`error calling ${name}: ${errorText(e)}`, pos, {
        source: ctx.source,
        cause: e
      });
    }
    let result;
    try {
      result = readCarrier(isInclude(fn) ? this.include(name, args[0], args[1], pos, ctx, reads) : fn.fn(...args), reads);
    } catch (thrown) {
      const e = readCarrier(thrown, reads);
      if (e instanceof TypeMismatchError) throw new TypeMismatchError(e.funcName, e.argIndex, e.expected, e.receivedSummary, pos, { source: ctx.source });
      if (e instanceof FailError) throw new FailError(e.message, pos, {
        source: ctx.source,
        cause: e.cause
      });
      if (e instanceof TemplateError) throw e;
      throw new EvalError(`error calling ${name}: ${errorText(e)}`, pos, {
        source: ctx.source,
        cause: e
      });
    }
    if (fn.writes === true) ctx.decided(/* @__PURE__ */ new Set([...reads, ...ctx.marks]));
    return result;
  }
  evalPrimary(node, scope, ctx, reads) {
    const value = this.evalOperand(node, scope, ctx, reads);
    if (value instanceof Marked) throw new EvalError("a marked() value reached the template from inside a func's return; return marked(...) itself, not a structure containing one", node.pos, { source: ctx.source });
    return value;
  }
  evalOperand(node, scope, ctx, reads) {
    switch (node.type) {
      case "Dot":
        return this.readDot(scope, reads);
      case "Nil":
        return null;
      case "Bool":
        return node.value;
      case "Number":
        return numberValue(node);
      case "String":
        return node.value;
      case "Field":
        return this.resolveFieldChain(this.readDot(scope, reads), node.idents, node.pos, ctx);
      case "Variable":
        return this.resolveVariable(node.idents, scope, node.pos, ctx, reads);
      case "Identifier": {
        const fn = this.funcs[node.ident];
        if (!fn) throw new FuncNotFoundError(node.ident, node.pos, {
          source: ctx.source,
          available: Object.keys(this.funcs)
        });
        return this.invoke(node.ident, fn, [], node.pos, ctx, reads);
      }
      case "Chain":
        return this.resolveFieldChain(this.evalPrimary(node.node, scope, ctx, reads), node.fields, node.pos, ctx);
      case "Pipe":
        return this.evalPipe(node, scope, ctx, reads);
      default:
        throw new EvalError(`cannot evaluate ${node.type} as a value`, node.pos, { source: ctx.source });
    }
  }
  resolveFieldChain(receiver, idents, pos, ctx) {
    const result = walkFieldChain(receiver, idents);
    if (result !== MISSING) return result;
    if (this.missingKey === "error") throw new MissingFieldError(idents, pos, { source: ctx.source });
  }
  resolveVariable(idents, scope, pos, ctx, reads) {
    const head = idents[0] ?? "$";
    const binding = lookupVar(scope, head);
    if (binding === void 0) throw undefinedVariable(head, pos, ctx);
    for (const mark of binding.marks) reads.add(mark);
    const tail = idents.slice(1);
    return tail.length === 0 ? binding.value : this.resolveFieldChain(binding.value, tail, pos, ctx);
  }
  readDot(scope, reads) {
    for (const mark of scope.dot.marks) reads.add(mark);
    return scope.dot.value;
  }
  lift(value, pos, source) {
    if (value === null || value === void 0) return this.fromString("<no value>");
    if (typeof value === "string") return this.fromString(value);
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return this.fromString(String(value));
    if (this.isT(value)) return value;
    try {
      return this.fromString(formatV(value, this.toString, this.isT));
    } catch (err) {
      throw new EvalError(err instanceof UnprintableError ? err.message : `cannot print: ${errorText(err)}`, pos, {
        source,
        cause: err
      });
    }
  }
};
var DEFAULT_IS_T = (v) => typeof v === "string";
function createEngine(config) {
  return new Engine(config);
}
function enforceArgTypes(funcName, spec, values, pos, src, toString = defaultToString, fromString = defaultFromString, isT = DEFAULT_IS_T) {
  const { argTypes, arity } = spec;
  const accepted = acceptedArgCount(argTypes, arity);
  if (values.length < accepted.minimum || values.length > accepted.maximum) throw new ArgCountError(funcName, accepted, values.length, pos, { source: src });
  const lookup = makeSlotLookup(argTypes, arity);
  let firstOrdered = -1;
  let firstComparable = -1;
  for (let i = 0; i < values.length; i++) {
    const declared = lookup(i);
    const value = values[i];
    const refusal = refusalOf(declared, value, toString, isT);
    if (refusal !== void 0) {
      if ((declared === "int" || declared === "truncating-int") && (typeof value === "number" || typeof value === "bigint")) throw new NotIntegerError(funcName, i + 1, value, pos, { source: src });
      throw new TypeMismatchError(funcName, i + 1, humanArgType(declared), refusal, pos, { source: src });
    }
    if (declared === "liftable" && typeof value === "string") values[i] = fromString(value);
    if (declared === "truncating-int") values[i] = Math.trunc(Number(value));
    else if (declared === "int" || declared === "float") values[i] = Number(value);
    if (declared === "ordered") {
      if (firstOrdered === -1) firstOrdered = i;
      else if (!sameOrderedKind(values[firstOrdered], value)) throw new TypeMismatchError(funcName, i + 1, `${humanArgType("ordered")} of the same kind as ${typeNameOf(values[firstOrdered])}`, typeNameOf(value), pos, { source: src });
    }
    if (declared === "comparable") {
      if (firstComparable === -1) firstComparable = i;
      else if (!sameComparableKind(values[firstComparable], value)) throw new TypeMismatchError(funcName, i + 1, `${humanArgType("comparable")} of the same kind as ${typeNameOf(values[firstComparable])}`, typeNameOf(value), pos, { source: src });
    }
  }
}
function acceptedArgCount(argTypes, arity) {
  switch (arity.kind) {
    case "exact":
      return {
        minimum: argTypes.length,
        maximum: argTypes.length
      };
    case "variadic":
      return {
        minimum: argTypes.length - 1,
        maximum: Infinity
      };
    case "alternating":
      return {
        minimum: arity.minimum,
        maximum: Infinity
      };
  }
}
function makeSlotLookup(argTypes, arity) {
  const len = argTypes.length;
  switch (arity.kind) {
    case "exact":
      return (i) => argTypes[i];
    case "variadic":
      return (i) => argTypes[Math.min(i, len - 1)];
    case "alternating":
      return (i) => argTypes[i % len];
  }
}
function matchesArgType(declared, value, isT) {
  switch (declared) {
    case "truthy":
    case "reflective":
    case "value":
      return true;
    case "string":
      return typeof value === "string";
    case "int":
      return typeof value === "number" && Number.isSafeInteger(value) || typeof value === "bigint" && Number.isSafeInteger(Number(value));
    case "truncating-int":
      return typeof value === "number" && Number.isFinite(value) || typeof value === "bigint" && Number.isSafeInteger(Number(value));
    case "float":
      return typeof value === "number" || typeof value === "bigint" && Number.isFinite(Number(value));
    case "bool":
      return typeof value === "boolean";
    case "ordered":
      return typeof value === "string" || typeof value === "number" || typeof value === "bigint" || typeof value === "boolean";
    case "T":
      return isT(value);
    case "list":
      return Array.isArray(value);
    case "dict":
      return isPlainObject(value);
    case "sized":
      return typeof value === "string" || Array.isArray(value) || value instanceof Map || value instanceof Set || isPlainObject(value);
    case "comparable":
      return value === null || value === void 0 || typeof value === "string" || typeof value === "number" || typeof value === "bigint" || typeof value === "boolean" || Array.isArray(value) || value instanceof Map || value instanceof Set || isPlainObject(value);
    case "callable":
      return typeof value === "function";
    case "collection":
      return typeof value === "string" || Array.isArray(value) || value instanceof Map || isPlainObject(value);
    case "index-key":
      return typeof value === "string" || typeof value === "number" || typeof value === "bigint";
    case "sliceable":
      return typeof value === "string" || Array.isArray(value);
    case "liftable":
      return typeof value === "string" || isT(value);
    case "serializable":
      return isJsonSerializable(value);
    default:
      throw new Error(`invalid ArgType: ${String(declared)}`);
  }
}
function defaultFromString(s) {
  return s;
}
function defaultToString(value) {
  if (typeof value === "string") return value;
  if (value === null || value === void 0) return "<nil>";
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") return String(value);
  throw new TypeMismatchError("<engine.toString>", 1, "string (or a consumer-supplied toString that flattens T)", typeNameOf(value), {
    line: 0,
    column: 0,
    offset: 0
  });
}
function isJsonSerializable(value) {
  try {
    return JSON.stringify(value) !== void 0;
  } catch {
    return false;
  }
}
function sameOrderedKind(a, b) {
  if (typeof a === typeof b) return true;
  if (typeof a === "number" && typeof b === "bigint") return true;
  if (typeof a === "bigint" && typeof b === "number") return true;
  return false;
}
function sameComparableKind(a, b) {
  const ka = comparableKind(a);
  const kb = comparableKind(b);
  if (ka === "nil" || kb === "nil") return true;
  return ka === kb;
}
function comparableKind(v) {
  if (v === null || v === void 0) return "nil";
  if (typeof v === "string") return "string";
  if (typeof v === "number" || typeof v === "bigint") return "number";
  if (typeof v === "boolean") return "boolean";
  if (Array.isArray(v)) return "array";
  if (v instanceof Map) return "map";
  if (v instanceof Set) return "set";
  return "object";
}
function humanArgType(t) {
  switch (t) {
    case "int":
      return "integer (safe-integer number or bigint)";
    case "truncating-int":
      return "integer (finite number, truncated toward zero, or safe-integer bigint)";
    case "float":
      return "float (number, including NaN/Infinity, or finite-convertible bigint)";
    case "T":
      return "T (a value the engine's isT accepts)";
    case "ordered":
      return "orderable primitive";
    case "list":
      return "list";
    case "dict":
      return "dict (plain object)";
    case "sized":
      return "sized value (string, list, map, set, or dict)";
    case "comparable":
      return "comparable value (orderable primitive, nil, list, dict, Map, or Set)";
    case "stringifiable":
      return "stringifiable value (string, nil, scalar, a T the engine's toString flattens, an object with its own toString, a class instance, or a list/map of those; not a Set, function or symbol)";
    case "liftable":
      return "liftable value (T or string, the latter lifted via the engine's fromString)";
    case "callable":
      return "callable (function value)";
    case "collection":
      return "collection (string, array, Map, or dict)";
    case "index-key":
      return "index key (number, bigint, or string)";
    case "sliceable":
      return "sliceable value (string or array)";
    case "serializable":
      return "JSON-serializable value";
    case "truthy":
    case "reflective":
    case "value":
    case "string":
    case "bool":
      return t;
    default:
      throw new Error(`invalid ArgType: ${String(t)}`);
  }
}
function constructFrame(scope) {
  return pushScope(scope, scope.dot);
}
function undefinedVariable(name, pos, ctx) {
  return new EvalError(`undefined variable: ${name}`, pos, { source: ctx.source });
}
function innermost(e) {
  return e.cause instanceof TemplateError ? innermost(e.cause) : e;
}
function errorText(e) {
  return e instanceof Error ? e.message : String(e);
}
function refusalOf(declared, value, toString, isT) {
  if (declared === "stringifiable") return printRefusal(value, toString, isT)?.summary;
  return matchesArgType(declared, value, isT) ? void 0 : typeNameOf(value);
}
function printRefusal(value, toString, isT) {
  try {
    formatV(value, toString, isT);
    return;
  } catch (err) {
    if (err instanceof UnprintableError) return err;
    throw err;
  }
}
function enumerateForRange(value) {
  if (value === null || value === void 0) return [];
  if (Array.isArray(value)) return value.map((v, i) => [i, v]);
  if (typeof value === "string") return [...value].map((c, i) => [i, c]);
  if (value instanceof Map) return sortMapEntries([...value.entries()]);
  if (value instanceof Set) return [...value.values()].map((v, i) => [i, v]);
  if (typeof value === "object") return sortMapEntries(Object.entries(value));
  return [];
}
function sortMapEntries(entries) {
  return [...entries].sort((a, b) => compareMapKeys(a[0], b[0]));
}
function compareMapKeys(a, b) {
  if ((typeof a === "number" || typeof a === "bigint") && (typeof b === "number" || typeof b === "bigint")) {
    const ax = typeof a === "bigint" ? Number(a) : a;
    const bx = typeof b === "bigint" ? Number(b) : b;
    return ax === bx ? 0 : ax < bx ? -1 : 1;
  }
  const as = String(a);
  const bs = String(b);
  return as === bs ? 0 : as < bs ? -1 : 1;
}
function numberValue(n) {
  if (n.intValue !== void 0) {
    const bi = n.intValue;
    if (bi >= BigInt(Number.MIN_SAFE_INTEGER) && bi <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(bi);
    return bi;
  }
  if (n.floatValue !== void 0) return n.floatValue;
  if (n.complexValue !== void 0) return n.complexValue;
  throw new Error("internal: NumberNode has none of intValue/floatValue/complexValue \u2014 parser invariant violated");
}
var YEAR = 36e11 * 24 * 365;
var MONTH = 36e11 * 24 * 30;
var DAY = 36e11 * 24;
var _enc$2 = new TextEncoder();
var ALPHA32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
var DECODE32 = new Map(Array.from(ALPHA32).map((c, i) => [c, i]));
var _dec$1 = new TextDecoder();
var _enc$1 = new TextEncoder();
var _dec = new TextDecoder();
var _enc = new TextEncoder();
var ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32)).join("");
var isPunctRe = new RegExp("^\\p{P}$", "u");
var isLetterRe = new RegExp("^\\p{L}$", "u");
var isUpperRe = new RegExp("^\\p{Lu}$", "u");
var isNumberRe = new RegExp("^\\p{N}$", "u");
export {
  createEngine
};
