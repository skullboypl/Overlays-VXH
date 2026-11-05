"""One-off refactor: every optional element of an overlay gets its own "Pokaż ..." toggle."""
import re

SRC = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/overlays/'


def edit(name, pairs):
    p = SRC + name
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (name, a[:90])
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)


def toggle(group, key, label, extra=''):
    return f"{{ group: '{group}', key: '{key}', label: '{label}', type: 'toggle', default: true{extra} }},\n  "


# ---------------- registry ----------------
reg = SRC + 'registry.ts'
s = open(reg, encoding='utf-8').read()

# Scenes (sceneFields uses two-space indent)
s = s.replace("  { group: 'Teksty', key: 'title', i18n: true, label: 'Tytuł', type: 'text', default: d.title, maxLength: 40 },",
              "  " + toggle('Teksty', 'showTitle', 'Pokaż tytuł') + "{ group: 'Teksty', key: 'title', i18n: true, label: 'Tytuł', type: 'text', default: d.title, maxLength: 40, when: { key: 'showTitle', is: [true] } },", 1)
s = s.replace("  { group: 'Teksty', key: 'subtitle', i18n: true, label: 'Podtytuł', type: 'text', default: d.subtitle, maxLength: 90 },",
              "  " + toggle('Teksty', 'showSubtitle', 'Pokaż podtytuł') + "{ group: 'Teksty', key: 'subtitle', i18n: true, label: 'Podtytuł', type: 'text', default: d.subtitle, maxLength: 90, when: { key: 'showSubtitle', is: [true] } },", 1)
s = s.replace("  { group: 'Teksty', key: 'kicker', label: 'Znaczek nad tytułem', type: 'text', default: 'skullboypl', maxLength: 40, hint: 'Nick albo nazwa kanału. Puste ukrywa.' },",
              "  " + toggle('Teksty', 'showKicker', 'Pokaż znaczek nad tytułem') + "{ group: 'Teksty', key: 'kicker', label: 'Znaczek nad tytułem', type: 'text', default: 'skullboypl', maxLength: 40, hint: 'Nick albo nazwa kanału', when: { key: 'showKicker', is: [true] } },", 1)
s = s.replace("...(ending ? [{ group: 'Teksty', key: 'next', i18n: true, label: 'Następny stream',",
              "...(ending ? [{ group: 'Teksty', key: 'showNext', label: 'Pokaż następny stream', type: 'toggle', default: true } as Field] : []),\n  ...(ending ? [{ group: 'Teksty', when: { key: 'showNext', is: [true] }, key: 'next', i18n: true, label: 'Następny stream',", 1)
s = s.replace("  { group: 'Odliczanie', key: 'timerLabel', i18n: true, label: 'Napis nad licznikiem',",
              "  { group: 'Odliczanie', key: 'showTimerLabel', label: 'Pokaż napis nad licznikiem', type: 'toggle', default: true, when: { key: 'timer', is: ['countdown', 'clock'] } },\n  { group: 'Odliczanie', key: 'timerLabel', i18n: true, label: 'Napis nad licznikiem',", 1)
s = re.sub(r"(key: 'timerLabel', i18n: true, label: 'Napis nad licznikiem', type: 'text', default: d\.timerLabel, maxLength: 30, )when: \{ key: 'timer', is: \['countdown', 'clock'\] \}",
           r"\1when: [{ key: 'timer', is: ['countdown', 'clock'] }, { key: 'showTimerLabel', is: [true] }]", s, count=1)
s = s.replace("  { group: 'Sociale', key: 'socials', label: 'Twoje kanały',",
              "  " + toggle('Sociale', 'showSocials', 'Pokaż sociale') + "{ group: 'Sociale', when: { key: 'showSocials', is: [true] }, key: 'socials', label: 'Twoje kanały',", 1)
s = s.replace("hint: 'Pokażą się na dole ekranu z ikonami. Usuń wszystkie, żeby ukryć pasek.' },", "hint: 'Pokażą się na dole ekranu z ikonami' },", 1)
s = s.replace("  { group: 'Czat', key: 'chatTitle', i18n: true, label: 'Nagłówek', type: 'text', default: 'CZAT', maxLength: 30, when: { key: 'chat', is: [true] }, hint: 'Puste ukrywa nagłówek' },",
              "  { group: 'Czat', key: 'showChatTitle', label: 'Pokaż nagłówek czatu', type: 'toggle', default: true, when: { key: 'chat', is: [true] } },\n"
              "  { group: 'Czat', key: 'chatTitle', i18n: true, label: 'Nagłówek', type: 'text', default: 'CZAT', maxLength: 30, when: [{ key: 'chat', is: [true] }, { key: 'showChatTitle', is: [true] }] },", 1)

# Name tag
s = s.replace("      { group: 'Teksty', key: 'text', label: 'Nick / tytuł', type: 'text', default: 'skullboypl', maxLength: 40 },",
              "      { group: 'Teksty', key: 'showTag', label: 'Pokaż pasek z napisem', type: 'toggle', default: true },\n"
              "      { group: 'Teksty', key: 'text', label: 'Nick / tytuł', type: 'text', default: 'skullboypl', maxLength: 40, when: { key: 'showTag', is: [true] } },\n"
              "      { group: 'Teksty', key: 'showSub', label: 'Pokaż podpis', type: 'toggle', default: true, when: { key: 'showTag', is: [true] } },", 1)
s = s.replace("      { group: 'Teksty', key: 'sub', label: 'Podpis pod spodem', type: 'text',",
              "      { group: 'Teksty', when: [{ key: 'showTag', is: [true] }, { key: 'showSub', is: [true] }], key: 'sub', label: 'Podpis pod spodem', type: 'text',", 1)

# Holiday label
s = s.replace("      { group: 'Okazja', key: 'label', label: 'Napis', type: 'text', default: 'auto', maxLength: 40, hint: '\"auto\" wstawia napis pasujący do okazji, puste pole ukrywa napis' },",
              "      { group: 'Okazja', key: 'showLabel', label: 'Pokaż napis', type: 'toggle', default: true },\n"
              "      { group: 'Okazja', key: 'label', label: 'Napis', type: 'text', default: 'auto', maxLength: 40, hint: '\"auto\" wstawia napis pasujący do okazji', when: { key: 'showLabel', is: [true] } },", 1)
s = s.replace("{ group: 'Okazja', key: 'labelSize', label: 'Wielkość napisu', type: 'range', min: 10, max: 56, step: 1, default: 15, unit: 'px' },",
              "{ group: 'Okazja', key: 'labelSize', label: 'Wielkość napisu', type: 'range', min: 10, max: 56, step: 1, default: 15, unit: 'px', when: { key: 'showLabel', is: [true] } },", 1)
s = s.replace("{ group: 'Okazja', key: 'labelPos', label: 'Pozycja napisu', type: 'select', default: 'bottom', options: [",
              "{ group: 'Okazja', key: 'labelPos', label: 'Pozycja napisu', type: 'select', default: 'bottom', when: { key: 'showLabel', is: [true] }, options: [", 1)

# Ticker label + separator
s = s.replace("      { group: 'Teksty', key: 'label', i18n: true, label: 'Etykieta z lewej', type: 'text', default: 'INFO', maxLength: 16, hint: 'Puste ukrywa etykietę' },",
              "      { group: 'Teksty', key: 'showLabel', label: 'Pokaż etykietę z lewej', type: 'toggle', default: true },\n"
              "      { group: 'Teksty', key: 'label', i18n: true, label: 'Etykieta z lewej', type: 'text', default: 'INFO', maxLength: 16, when: { key: 'showLabel', is: [true] } },\n"
              "      { group: 'Teksty', key: 'showSeparator', label: 'Pokaż separator', type: 'toggle', default: true },", 1)
s = s.replace("      { group: 'Teksty', key: 'separator', label: 'Separator', type: 'text', default: '◆', maxLength: 3 },",
              "      { group: 'Teksty', key: 'separator', label: 'Separator', type: 'text', default: '◆', maxLength: 3, when: { key: 'showSeparator', is: [true] } },", 1)

# Socials rotator icon
s = s.replace("      { key: 'brandColors', label: 'Kolory serwisów', type: 'toggle', default: true,",
              "      { key: 'showIcon', label: 'Pokaż ikonę serwisu', type: 'toggle', default: true },\n      { key: 'brandColors', label: 'Kolory serwisów', type: 'toggle', default: true,", 1)

# FACEIT stats parts
API = "{ key: 'source', is: ['api'] }"
s = s.replace("      { group: 'Wygląd statów', key: 'stats', label: 'Staty',",
              f"      {{ group: 'Wygląd statów', key: 'showLevel', label: 'Pokaż level', type: 'toggle', default: true, when: [{API}, {{ key: 'look', is: ['card', 'pill', 'bar', 'neon', 'hud'] }}] }},\n"
              f"      {{ group: 'Wygląd statów', key: 'showNick', label: 'Pokaż nick', type: 'toggle', default: true, when: [{API}, {{ key: 'look', is: ['card', 'hud'] }}] }},\n"
              f"      {{ group: 'Wygląd statów', key: 'showElo', label: 'Pokaż ELO', type: 'toggle', default: true, when: {API} }},\n"
              "      { group: 'Wygląd statów', key: 'stats', label: 'Staty',", 1)
open(reg, 'w', encoding='utf-8').write(s)

# ---------------- renderers ----------------
on = lambda k: f"params.{k} !== false"
edit('SceneScreen.tsx', [
    ("          {params.kicker && (", f"          {{{on('showKicker')} && params.kicker && ("),
    ("          <Title key={`${params.title}-${params.titleAnim}`}", f"          {{{on('showTitle')} && <Title key={{`${{params.title}}-${{params.titleAnim}}`}}"),
    ("anim={params.titleAnim as string} />", "anim={params.titleAnim as string} />}"),
    ("          {params.subtitle && <p className=\"sc-sub\">", f"          {{{on('showSubtitle')} && params.subtitle && <p className=\"sc-sub\">"),
    ("                  {params.timerLabel && <span>", f"                  {{{on('showTimerLabel')} && params.timerLabel && <span>"),
    ("          {kind === 'ending' && params.next && <p", f"          {{kind === 'ending' && {on('showNext')} && params.next && <p"),
    ("        {socials.length > 0 && (", f"        {{{on('showSocials')} && socials.length > 0 && ("),
    ("          {params.chatTitle && <div className=\"sc-chat-head\">", f"          {{{on('showChatTitle')} && params.chatTitle && <div className=\"sc-chat-head\">"),
])
edit('frames.tsx', [
    ("      {(params.text || params.sub) && (", f"      {{{on('showTag')} && (params.text || params.sub) && ("),
    ("            {params.sub && <small>", f"            {{{on('showSub')} && params.sub && <small>"),
])
p = SRC + 'HolidayFrame.tsx'
s = open(p, encoding='utf-8').read()
old = "(params.label as string) === 'auto' ? translate(isLang(params._lang) ? params._lang : 'pl', theme.label) : (params.label as string)"
assert s.count(old) == 2
s = s.replace(old, "params.showLabel === false ? '' : " + old)
open(p, 'w', encoding='utf-8').write(s)
edit('widgets.tsx', [
    ("      {params.label && <div className=\"wd-tick-label\">", f"      {{{on('showLabel')} && params.label && <div className=\"wd-tick-label\">"),
    ("      <i>{params.separator as string}</i>", f"      {{{on('showSeparator')} && <i>{{params.separator as string}}</i>}}"),
    ("        <span className=\"wd-soc-icon\">", f"        {{{on('showIcon')} && <span className=\"wd-soc-icon\">"),
    ("<BrandIcon brand={item.brand} size=\"1.3em\" /></span>", "<BrandIcon brand={item.brand} size=\"1.3em\" /></span>}"),
])
edit('FaceitStats.tsx', [
    ("      {look !== 'minimal' && <LevelBadge level={s.level} />}", f"      {{look !== 'minimal' && {on('showLevel')} && <LevelBadge level={{s.level}} />}}"),
    ("        {(look === 'card' || look === 'hud') && <div className=\"fs-nick\">", f"        {{(look === 'card' || look === 'hud') && {on('showNick')} && <div className=\"fs-nick\">"),
    ("        <div className=\"fs-elo\">", f"        {{{on('showElo')} && <div className=\"fs-elo\">"),
    ("          {diff !== null && diff !== 0 && <em className={diff > 0 ? 'up' : 'down'}>{diff > 0 ? `+${diff}` : diff}</em>}\n        </div>",
     "          {diff !== null && diff !== 0 && <em className={diff > 0 ? 'up' : 'down'}>{diff > 0 ? `+${diff}` : diff}</em>}\n        </div>}"),
])
print('ok')
