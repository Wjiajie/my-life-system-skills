# 插件结果视图文法

这是一种声明式片段语言，不是任意网页。系统只编译通过允许列表的结构和样式，在空sandbox iframe中展示。任意题材可设计自己的信息结构，但首版没有JS、远程资源或任意CSS扩展。

```html
<section class="evidence">
  <h2>线索地图</h2>
  <p data-omn-text="/summary"></p>
  <ul><li data-omn-each="/items"><strong data-omn-text="/label"></strong><span data-omn-text="/detail"></span></li></ul>
  <p data-omn-if="/uncertain">还有待核实的信息。</p>
</section>
```

`data-omn-text`以JSON Pointer绑定标量，按文本转义。空pointer表示当前值；`data-omn-each`重复数组项并将项作为内部作用域；`data-omn-if`只接受布尔true。each和if同节点时先each。缺pointer视为空/false，存在但类型错误失败。不支持模板表达式、运算符或原始HTML插值。

允许内容标签：section/article/header/footer/div/span/p、h1–h6、ul/ol/li、dl/dt/dd、table/thead/tbody/tfoot/tr/th/td、strong/em/small/code/pre/blockquote/br/hr。使用闭合标签，br/hr写成 `<br/>` / `<hr/>`。使用安全class/id与有限aria属性；更详细的允许列表以随附compiler为准。不包含html/head/body/doctype、style/script、a/img、按钮/表单、iframe、URL/事件属性或namespace。

## CSS

```css
.evidence {padding:16px;color:var(--omn-text);background:var(--omn-bg);border:1px solid var(--omn-border)}
.evidence h2 {color:#176e65;font-family:serif}
[data-theme="night"] .evidence h2 {color:#9bd0c7}
```

安全根提供只读 `--omn-bg / --omn-text / --omn-muted / --omn-accent / --omn-border`。插件可以用自己的固定颜色或日夜规则。不要定义变量、使用fallback或借用宿主其他token。

- selector为内容tag、安全class/id及空格/`>`组合，逗号最多16分支、每支最多8compound。唯一属性前缀为 `[data-theme="day"]` 或night。不能选html/body/:root、通配/伪类/兄弟组合符或保留omn-身份；规则自动限制到内容根后代。
- 颜色：hex的3/4/6/8位，black/white/red/blue/green/gray/transparent/currentColor，或上面五个var。background只接受颜色。
- 长度：非负px≤4096、rem/em≤256、%≤100，无单位仅0。支持常见width/height/min/max尺寸、margin/padding/gap、border宽度/圆角、font-size。margin可auto；width/height支持auto/min-content/max-content/fit-content；max支持none。
- 字体：family仅serif/sans-serif/monospace/system-ui逗号列表；weight normal/bold或100至900整百；style normal/italic。常见line-height、text-align、white-space、overflow-wrap、word-break可用。
- display支持block/inline/inline-block/flex/grid/none；支持常见flex布局属性、0..12 grow/shrink、-32..32 order。**不要写flex shorthand**，分别写grow/shrink/basis。
- grid tracks≤12；支持长度、auto/min-content/max-content、0<fr≤12、repeat(1..12,tracks)、非递归minmax。不能使用calc等任意表达式。
- 支持box-sizing、overflow、有限border、table-layout/border-collapse/list-style-type。未知属性和值明确失败，不静默丢弃。

不使用CSS注释、`@`规则、URL、字符串/反斜线转义、动画、滤镜、渐变、固定/粘滞定位或不在上述子集内的特性。视觉自由在安全文法内实现，不修改compiler放宽。

HTML/CSS各≤64KiB，源深度32、源节点2048、展开步骤20000、生成节点10000、最终document512KiB。用真实样例编译日夜两种文档；空、长文本和列表上界也应测试。失败时保留安全文本，不把编译失败当成可安装视图完成。
