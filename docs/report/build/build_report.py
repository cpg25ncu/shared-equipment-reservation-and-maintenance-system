"""Build the SERMS project report from the course template.

Usage: python3 build_report.py <template.docx> <png_dir> <out.docx> [toc_pages.json]
"""
import copy, json, re, sys
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from PIL import Image

from report_content import CONTENT, COVER

TEMPLATE, PNG, OUT = sys.argv[1:4]
TOC_PAGES = json.load(open(sys.argv[4])) if len(sys.argv) > 4 else {}

doc = Document(TEMPLATE)
body = doc.element.body
paras = doc.paragraphs

# ---------- cover ----------
for p in paras[:15]:
    t = p.text
    if '<Project Name>' in t:
        for r in p.runs:
            r.text = r.text.replace('<Project Name>', COVER['name']).replace('<', '').replace('>', '')
        if COVER['name'] not in p.text:
            for r in p.runs[1:]:
                r.text = ''
            p.runs[0].text = 'Project Report for ' + COVER['name']
    elif 'Team <Number>' in t or ('Team' in t and '<' in t):
        for r in p.runs[1:]:
            r.text = ''
        p.runs[0].text = COVER['team']
    elif '<Member' in t:
        for r in p.runs[1:]:
            r.text = ''
        p.runs[0].text = COVER['members'][0]
        anchor = p
        for name in COVER['members'][1:]:
            np_ = copy.deepcopy(p._p)
            anchor._p.addnext(np_)
            from docx.text.paragraph import Paragraph
            anchor = Paragraph(np_, p._parent)
            for r in anchor.runs[1:]:
                r.text = ''
            anchor.runs[0].text = name

# ---------- remove template body after the TOC ----------
start = None
for p in doc.paragraphs:
    if p.style.name == 'Heading 1' and p.text.strip() == 'Introduction':
        start = p._p
        break
assert start is not None
sectPr = body.find(qn('w:sectPr'))
el = start
while el is not None and el is not sectPr:
    nxt = el.getnext()
    body.remove(el)
    el = nxt

# ---------- bullet numbering ----------
numbering = doc.part.numbering_part.element
abs_ids = [int(a.get(qn('w:abstractNumId'))) for a in numbering.findall(qn('w:abstractNum'))]
num_ids = [int(n.get(qn('w:numId'))) for n in numbering.findall(qn('w:num'))]
ABS = max(abs_ids) + 1
NUM = max(num_ids) + 1
abs_xml = f'''<w:abstractNum xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:abstractNumId="{ABS}">
<w:multiLevelType w:val="hybridMultilevel"/>
<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>
<w:pPr><w:ind w:left="567" w:hanging="283"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr></w:lvl>
<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="–"/><w:lvlJc w:val="left"/>
<w:pPr><w:ind w:left="1134" w:hanging="283"/></w:pPr></w:lvl>
</w:abstractNum>'''
from lxml import etree
abs_el = etree.fromstring(abs_xml)
first_num = numbering.find(qn('w:num'))
first_num.addprevious(abs_el)
num_el = etree.fromstring(
    f'<w:num xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:numId="{NUM}">'
    f'<w:abstractNumId w:val="{ABS}"/></w:num>')
numbering.append(num_el)

# ---------- helpers ----------
BLUE = RGBColor(0x02, 0x3E, 0x7C)
fig_no = [0]
tab_no = [0]


def new_par(style=None):
    p = doc.add_paragraph()
    if style:
        p.style = doc.styles[style]
    # keep the new paragraph before the final sectPr
    sp = body.find(qn('w:sectPr'))
    sp.addprevious(p._p)
    return p


def add_runs(p, text, size=None, italic=False, color=None):
    # **bold** and `code` inline markup
    for part in re.split(r'(\*\*[^*]+\*\*|`[^`]+`)', text):
        if not part:
            continue
        if part.startswith('**'):
            r = p.add_run(part[2:-2]); r.bold = True
        elif part.startswith('`'):
            r = p.add_run(part[1:-1]); r.font.name = 'Consolas'
            r._element.rPr.rFonts.set(qn('w:hAnsi'), 'Consolas')
        else:
            r = p.add_run(part)
        if size:
            r.font.size = Pt(size)
        if italic:
            r.italic = True
        if color:
            r.font.color.rgb = color
    return p


def spacing(p, before=0, after=6, line=None):
    pf = p.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    if line:
        pf.line_spacing = line


def para(text):
    p = new_par('Normal')
    add_runs(p, text)
    spacing(p, 0, 6)
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    return p


def bullet(text, level=0):
    p = new_par('Normal')
    pPr = p._p.get_or_add_pPr()
    numPr = OxmlElement('w:numPr')
    il = OxmlElement('w:ilvl'); il.set(qn('w:val'), str(level))
    ni = OxmlElement('w:numId'); ni.set(qn('w:val'), str(NUM))
    numPr.append(il); numPr.append(ni)
    pPr.append(numPr)
    add_runs(p, text)
    spacing(p, 0, 3)
    return p


def heading(level, text):
    p = new_par(f'Heading {level}')
    p.add_run(text)
    return p


def caption(kind, text):
    p = new_par('Normal')
    if kind == 'Figure':
        fig_no[0] += 1; n = fig_no[0]
    else:
        tab_no[0] += 1; n = tab_no[0]
    r = p.add_run(f'{kind} {n}: '); r.bold = True; r.font.size = Pt(9); r.font.color.rgb = BLUE
    r = p.add_run(text); r.italic = True; r.font.size = Pt(9)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    spacing(p, 2 if kind == 'Figure' else 8, 10 if kind == 'Figure' else 3)
    if kind == 'Table':
        p.paragraph_format.keep_with_next = True
    return p


MAX_W, MAX_H = 6.25, 8.4
LAND = [False]


def section_break(landscape):
    # the paragraph carrying sectPr ends the current section
    main = body.find(qn('w:sectPr'))
    sp = copy.deepcopy(main)
    pg = sp.find(qn('w:pgSz'))
    W_, H_ = 11906, 16838
    if landscape:
        # end a portrait section here; next section will be landscape
        pass
    pg.set(qn('w:w'), str(W_)); pg.set(qn('w:h'), str(H_))
    if pg.get(qn('w:orient')) is not None:
        del pg.attrib[qn('w:orient')]
    if not landscape:
        # ending a landscape section
        pg.set(qn('w:w'), str(H_)); pg.set(qn('w:h'), str(W_)); pg.set(qn('w:orient'), 'landscape')
    t = sp.find(qn('w:type'))
    if t is None:
        t = OxmlElement('w:type')
        refs = [c for c in sp if c.tag in (qn('w:headerReference'), qn('w:footerReference'), qn('w:footnotePr'), qn('w:endnotePr'))]
        if refs:
            refs[-1].addnext(t)
        else:
            sp.insert(0, t)
    t.set(qn('w:val'), 'nextPage')
    p = new_par('Normal')
    spacing(p, 0, 0)
    p._p.get_or_add_pPr().append(sp)


def figure(name, cap, max_h=MAX_H, max_w=MAX_W, landscape=False):
    if landscape:
        if not LAND[0]:
            section_break(True)
        max_w, max_h = 9.6, 5.9
        figure(name, cap, max_h, max_w)
        LAND[0] = True
        return
    path = f'{PNG}/{name}.png'
    w, h = Image.open(path).size
    width = max_w
    if width * h / w > max_h:
        width = max_h * w / h
    p = new_par('Normal')
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    spacing(p, 6, 0)
    p.add_run().add_picture(path, width=Inches(width))
    caption('Figure', cap)


def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear'); shd.set(qn('w:color'), 'auto'); shd.set(qn('w:fill'), fill)
    tcPr.append(shd)


def table(headers, rows, widths, cap=None, size=8.5):
    if cap:
        caption('Table', cap)
    total = sum(widths)
    t = doc.add_table(rows=1 + len(rows), cols=len(headers))
    sp = body.find(qn('w:sectPr'))
    sp.addprevious(t._tbl)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    tblPr = t._tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for side, sz in (('top', 8), ('left', 8), ('bottom', 8), ('right', 8), ('insideH', 4), ('insideV', 4)):
        b = OxmlElement(f'w:{side}')
        b.set(qn('w:val'), 'single'); b.set(qn('w:sz'), str(sz)); b.set(qn('w:space'), '0'); b.set(qn('w:color'), '8EA9C8')
        borders.append(b)
    tblPr.append(borders)
    tw = OxmlElement('w:tblW'); tw.set(qn('w:w'), str(total)); tw.set(qn('w:type'), 'dxa'); tblPr.append(tw)
    layout = OxmlElement('w:tblLayout'); layout.set(qn('w:type'), 'fixed'); tblPr.append(layout)
    order = ['tblStyle', 'tblpPr', 'tblOverlap', 'bidiVisual', 'tblStyleRowBandSize', 'tblStyleColBandSize', 'tblW', 'jc',
             'tblCellSpacing', 'tblInd', 'tblBorders', 'shd', 'tblLayout', 'tblCellMar', 'tblLook', 'tblCaption', 'tblDescription']
    kids = list(tblPr)
    seen = {}
    for k in kids:
        tblPr.remove(k)
        seen[k.tag.split('}')[1]] = k   # last one wins (drops duplicate tblW)
    for name in order:
        if name in seen:
            tblPr.append(seen[name])
    grid = t._tbl.tblGrid
    for gc, w in zip(grid.findall(qn('w:gridCol')), widths):
        gc.set(qn('w:w'), str(w))
    for ri, row in enumerate([headers] + rows):
        tr = t.rows[ri]
        if ri == 0:
            trPr = tr._tr.get_or_add_trPr()
            th = OxmlElement('w:tblHeader'); th.set(qn('w:val'), 'true'); trPr.append(th)
        cant = OxmlElement('w:cantSplit'); tr._tr.get_or_add_trPr().append(cant)
        for ci, val in enumerate(row):
            c = tr.cells[ci]
            c.width = Inches(widths[ci] / 1440)
            tcW = c._tc.get_or_add_tcPr().find(qn('w:tcW'))
            if tcW is None:
                tcW = OxmlElement('w:tcW'); c._tc.get_or_add_tcPr().append(tcW)
            tcW.set(qn('w:w'), str(widths[ci])); tcW.set(qn('w:type'), 'dxa')
            if ri == 0:
                shade(c, '023E7C')
            elif ri % 2 == 0:
                shade(c, 'F3F7FC')
            lines = str(val).split('\n')
            p = c.paragraphs[0]
            for li, line in enumerate(lines):
                if li:
                    p = c.add_paragraph()
                if ri == 0:
                    r = p.add_run(line); r.bold = True; r.font.size = Pt(size); r.font.color.rgb = RGBColor(255, 255, 255)
                else:
                    add_runs(p, line, size=size)
                spacing(p, 1, 1)
    spacer = new_par('Normal'); spacing(spacer, 0, 4)
    return t


def page_break():
    p = new_par('Normal')
    p.add_run().add_break(WD_BREAK.PAGE)


# ---------- render content ----------
for idx, item in enumerate(CONTENT):
    kind = item[0]
    is_land = kind == 'fig' and len(item) > 3 and item[3].get('landscape')
    if LAND[0] and not is_land:
        section_break(False)
        LAND[0] = False
    if kind == 'h1':
        heading(1, item[1])
    elif kind == 'h2':
        heading(2, item[1])
    elif kind == 'h3':
        heading(3, item[1])
    elif kind == 'p':
        para(item[1])
    elif kind == 'b':
        bullet(item[1], item[2] if len(item) > 2 else 0)
    elif kind == 'fig':
        figure(item[1], item[2], **(item[3] if len(item) > 3 else {}))
    elif kind == 'tab':
        table(item[1], item[2], item[3], item[4] if len(item) > 4 else None, **(item[5] if len(item) > 5 else {}))
    elif kind == 'pb':
        page_break()

# ---------- table of contents (cached result; Word refreshes it on open) ----------
toc_paras = [p for p in doc.paragraphs if p.style.name.lower().startswith('toc')]
first, last = toc_paras[0]._p, toc_paras[-1]._p
# collect headings with outline numbers
entries, n1, n2, n3 = [], 0, 0, 0
for item in CONTENT:
    if item[0] == 'h1':
        n1 += 1; n2 = n3 = 0; entries.append((1, f'{n1}.', item[1]))
    elif item[0] == 'h2':
        n2 += 1; n3 = 0; entries.append((2, f'{n1}.{n2}', item[1]))
    elif item[0] == 'h3':
        n3 += 1; entries.append((3, f'{n1}.{n2}.{n3}', item[1]))
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
new = []
for i, (lvl, num, title) in enumerate(entries):
    page = str(TOC_PAGES.get(f'{num} {title}', ''))
    p = OxmlElement('w:p')
    pPr = OxmlElement('w:pPr'); ps = OxmlElement('w:pStyle'); ps.set(qn('w:val'), f'TOC{lvl}'); pPr.append(ps)
    tabs = OxmlElement('w:tabs')
    tb = OxmlElement('w:tab'); tb.set(qn('w:val'), 'right'); tb.set(qn('w:leader'), 'dot'); tb.set(qn('w:pos'), '9016'); tabs.append(tb)
    pPr.append(tabs)
    p.append(pPr)

    def run(text=None, fld=None, instr=None, tab=False):
        r = OxmlElement('w:r')
        if fld:
            f = OxmlElement('w:fldChar'); f.set(qn('w:fldCharType'), fld); r.append(f)
        elif instr:
            it = OxmlElement('w:instrText'); it.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve'); it.text = instr; r.append(it)
        elif tab:
            r.append(OxmlElement('w:tab'))
        else:
            t = OxmlElement('w:t'); t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve'); t.text = text; r.append(t)
        p.append(r)
    if i == 0:
        run(fld='begin'); run(instr=' TOC \\o "1-3" \\h \\z \\u '); run(fld='separate')
    if lvl == 3:
        run(num + '  ' + title)
    else:
        run(num); run(tab=True); run(title)
    run(tab=True); run(page)
    if i == len(entries) - 1:
        run(fld='end')
    new.append(p)
for p in toc_paras:
    if p._p is first:
        for np_ in new:
            p._p.addprevious(np_)
    body.remove(p._p)

# ask Word to refresh fields (TOC page numbers) when opened
settings = doc.settings.element
uf = OxmlElement('w:updateFields'); uf.set(qn('w:val'), 'true')
after = None
for tag in ('hdrShapeDefaults', 'footnotePr', 'endnotePr', 'compat', 'docVars', 'rsids'):
    after = settings.find(qn('w:' + tag))
    if after is not None:
        break
if after is not None:
    after.addprevious(uf)
else:
    settings.append(uf)

doc.core_properties.title = 'Project Report for ' + COVER['name']
doc.core_properties.author = 'Team 07'
doc.save(OUT)
print('figures', fig_no[0], 'tables', tab_no[0], 'toc entries', len(entries))
