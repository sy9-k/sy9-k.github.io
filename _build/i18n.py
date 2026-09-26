# ページの多言語化（build.py から使う）
# 日本語の HTML から「訳す文」を取り出し、_build/i18n/<言語>.json の辞書（日本語 → 訳）で置き換える。
#   ・リンクや太字などを含む文は、タグごと 1 つの文として訳す（語順が変わる言語でも自然に訳せるように）
#   ・ボタンの文字などアイコン（svg）と並んでいる文字は、その文字だけを訳す
#   ・placeholder / aria-label / title / alt / meta の content も訳す
#   ・日本語（かな・漢字・全角記号）を含まない文字は訳さない（Y-FILTER. などの名前）
#   ・辞書にない文は日本語のまま残し、missing に集める（build が一覧を書き出す）
import html
import json
import re
from html.parser import HTMLParser

LANGS = [
    # (コード, URL の頭, og:locale, 表示名)
    ("ja", "", "ja_JP", "日本語"),
    ("en", "en", "en_US", "English"),
    ("zh-CN", "zh-cn", "zh_CN", "简体中文"),
    ("zh-TW", "zh-tw", "zh_TW", "繁體中文"),
    ("ko", "ko", "ko_KR", "한국어"),
]

JAPANESE = re.compile(r"[぀-ヿ㐀-鿿！-｠　-〿]")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
SKIP = {"script", "style", "svg", "code", "pre", "textarea", "template", "noscript"}
INLINE = {"a", "strong", "b", "em", "i", "small", "span", "br", "time", "mark", "sub", "sup", "kbd", "u", "s", "abbr"}
ATTRS = {"placeholder", "aria-label", "title", "alt", "label"}
META_ATTRS = {"description", "og:title", "og:description", "twitter:title", "twitter:description"}
DATE = re.compile(r"^(\d{4})年(\d{1,2})月(\d{1,2})日$")
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


class Node:
    __slots__ = ("tag", "attrs", "start", "end", "children", "text")

    def __init__(self, tag=None, attrs=None, start="", text=None):
        self.tag, self.attrs, self.start, self.end, self.children, self.text = tag, attrs or [], start, "", [], text

    def html(self):
        if self.text is not None:
            return self.text
        return self.start + "".join(c.html() for c in self.children) + self.end

    def inner(self):
        return "".join(c.html() for c in self.children)


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.root = Node()
        self.stack = [self.root]

    def _add(self, node):
        self.stack[-1].children.append(node)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.get_starttag_text())
        self._add(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self._add(Node(tag, attrs, self.get_starttag_text()))

    def handle_endtag(self, tag):
        # 対応する開始タグまで閉じる（閉じ忘れがあっても壊さない）
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack[i].end = f"</{tag}>"
                del self.stack[i:]
                return
        self._add(Node(text=f"</{tag}>"))

    def handle_data(self, data):
        self._add(Node(text=data))

    def handle_entityref(self, name):
        self._add(Node(text=f"&{name};"))

    def handle_charref(self, name):
        self._add(Node(text=f"&#{name};"))

    def handle_comment(self, data):
        self._add(Node(text=f"<!--{data}-->", tag="#comment"))

    def handle_decl(self, decl):
        self._add(Node(text=f"<!{decl}>", tag="#decl"))


def parse(source):
    b = TreeBuilder()
    b.feed(source)
    b.close()
    return b.root


def normalize(s):
    return re.sub(r"\s+", " ", s).strip()


def canonical_parts(nodes):
    """辞書のキーの形（assets/i18n.js の keyOf と同じ）: 文字は実体参照を戻し、タグは属性を名前順に並べる"""
    out = []
    for n in nodes:
        if n.text is not None:
            if n.tag is None:
                out.append(html.unescape(n.text))
            continue
        attrs = sorted(f'{k}="{"" if v is None else v}"' for k, v in n.attrs)
        out.append(f"<{n.tag}" + (" " + " ".join(attrs) if attrs else "") + ">")
        if n.tag not in VOID:
            out.append(canonical_parts(n.children))
            out.append(f"</{n.tag}>")
    return "".join(out)


def key_of(source):
    """辞書に書いた日本語（HTML を含んでもよい）を、キーの形にする"""
    return normalize(canonical_parts(parse(source).children))


def format_date(lang, y, m, d):
    if lang == "en":
        return f"{MONTHS[int(m) - 1]} {int(d)}, {y}"
    if lang == "ko":
        return f"{y}년 {int(m)}월 {int(d)}일"
    return f"{y}年{int(m)}月{int(d)}日"


class Translator:
    def __init__(self, lang, table):
        self.lang, self.table, self.missing = lang, table, set()

    def lookup(self, msgid):
        m = DATE.match(msgid)
        if m:
            return format_date(self.lang, *m.groups())
        value = self.table.get(msgid)
        if value:
            return value
        self.missing.add(msgid)
        return None

    def text(self, raw):
        """前後の空白は残して、中身だけを訳す"""
        msgid = normalize(html.unescape(raw))
        if not msgid or not JAPANESE.search(msgid):
            return raw
        value = self.lookup(msgid)
        if value is None:
            return raw
        lead = raw[: len(raw) - len(raw.lstrip())]
        trail = raw[len(raw.rstrip()):]
        return lead + value + trail

    def attrs(self, node):
        changed = False
        meta = node.tag == "meta" and any(k in ("name", "property") and v in META_ATTRS for k, v in node.attrs)
        out = []
        for k, v in node.attrs:
            if v is not None and (k in ATTRS or (meta and k == "content")) and JAPANESE.search(v):
                nv = self.lookup(normalize(html.unescape(v)))
                if nv is not None:
                    v, changed = nv, True
            out.append((k, v))
        if changed:
            node.attrs = out
            parts = [node.tag] + [k if v is None else f'{k}="{html.escape(v, quote=True)}"' for k, v in out]
            node.start = "<" + " ".join(parts) + (" />" if node.start.endswith("/>") else ">")

    def inline_only(self, node):
        for c in node.children:
            if c.text is not None:
                continue
            if c.tag not in INLINE or not self.inline_only(c):
                return False
        return True

    def walk(self, node):
        if node.tag in SKIP:
            if node.tag == "textarea":
                self.attrs(node)
            return
        if any(k == "data-i18n-skip" for k, _ in node.attrs):
            return
        if node.tag and node.text is None:
            self.attrs(node)
        has_text = any(c.text is not None and c.tag is None and JAPANESE.search(c.text) for c in node.children)
        if node.tag and has_text and self.inline_only(node) and any(c.text is None for c in node.children):
            # 文の中にリンクなどがある: タグごと 1 つの文として訳す
            raw = node.inner()
            msgid = normalize(canonical_parts(node.children))
            value = self.lookup(msgid)
            if value is not None:
                lead = raw[: len(raw) - len(raw.lstrip())]
                trail = raw[len(raw.rstrip()):]
                node.children = [Node(text=lead + value + trail)]
            return
        for c in node.children:
            if c.text is not None:
                if c.tag is None:
                    c.text = self.text(c.text)
            else:
                self.walk(c)


def translate(source, translator):
    root = parse(source)
    translator.walk(root)
    return root.html()


def load_table(path):
    """辞書を読み込み、キーをキーの形（key_of）にそろえる"""
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {key_of(k): v for k, v in data.items() if not k.startswith("_") and v}
