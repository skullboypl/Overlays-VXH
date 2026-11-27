"""VXH Overlays Tool install card on the panel page: translations for patches-39.json."""
import json

LANGS = ['en', 'de', 'cs', 'es', 'fr', 'pt', 'ru', 'tr', 'uk']
D = {
    '1. Zainstaluj (jedna komenda)': ['1. Install (one command)', '1. Installieren (ein Befehl)', '1. Nainstaluj (jeden příkaz)', '1. Instala (un comando)', '1. Installe (une commande)', '1. Instale (um comando)', '1. Установи (одна команда)', '1. Kur (tek komut)', '1. Встанови (одна команда)'],
    '2. Połącz z panelem': ['2. Connect to the panel', '2. Mit dem Panel verbinden', '2. Připoj k panelu', '2. Conecta con el panel', '2. Connecte au panneau', '2. Conecte ao painel', '2. Подключи к панели', '2. Panele bağla', '2. Підключи до панелі'],
    'Kod źródłowy (GitHub)': ['Source code (GitHub)', 'Quellcode (GitHub)', 'Zdrojový kód (GitHub)', 'Código fuente (GitHub)', 'Code source (GitHub)', 'Código-fonte (GitHub)', 'Исходный код (GitHub)', 'Kaynak kod (GitHub)', 'Вихідний код (GitHub)'],
    'Plik jest podpisany certyfikatem EV SkullMedia, a aplikacja sama się aktualizuje.': [
        'The file is signed with SkullMedia’s EV certificate, and the app updates itself.',
        'Die Datei ist mit dem EV-Zertifikat von SkullMedia signiert, und die App aktualisiert sich selbst.',
        'Soubor je podepsaný EV certifikátem SkullMedia a aplikace se aktualizuje sama.',
        'El archivo está firmado con el certificado EV de SkullMedia y la app se actualiza sola.',
        'Le fichier est signé avec le certificat EV de SkullMedia, et l’app se met à jour toute seule.',
        'O arquivo é assinado com o certificado EV da SkullMedia, e o app se atualiza sozinho.',
        'Файл подписан EV-сертификатом SkullMedia, а приложение обновляется само.',
        'Dosya SkullMedia’nın EV sertifikasıyla imzalı ve uygulama kendini günceller.',
        'Файл підписаний EV-сертифікатом SkullMedia, а застосунок оновлюється сам.'],
    'Pobierz .exe': ['Download .exe', '.exe herunterladen', 'Stáhnout .exe', 'Descargar .exe', 'Télécharger le .exe', 'Baixar .exe', 'Скачать .exe', '.exe indir', 'Завантажити .exe'],
    'Wklej w PowerShell (Win + X → Terminal) i naciśnij Enter. Bez praw administratora; ta sama komenda aktualizuje starszą wersję.': [
        'Paste it into PowerShell (Win + X → Terminal) and press Enter. No admin rights; the same command updates an older version.',
        'In PowerShell einfügen (Win + X → Terminal) und Enter drücken. Ohne Administratorrechte; derselbe Befehl aktualisiert eine ältere Version.',
        'Vlož do PowerShellu (Win + X → Terminál) a stiskni Enter. Bez práv správce; stejný příkaz aktualizuje starší verzi.',
        'Pégalo en PowerShell (Win + X → Terminal) y pulsa Enter. Sin permisos de administrador; el mismo comando actualiza una versión anterior.',
        'Colle-la dans PowerShell (Win + X → Terminal) et appuie sur Entrée. Sans droits administrateur ; la même commande met à jour une ancienne version.',
        'Cole no PowerShell (Win + X → Terminal) e aperte Enter. Sem permissão de administrador; o mesmo comando atualiza uma versão antiga.',
        'Вставь в PowerShell (Win + X → Терминал) и нажми Enter. Без прав администратора; та же команда обновляет старую версию.',
        'PowerShell’e yapıştır (Win + X → Terminal) ve Enter’a bas. Yönetici yetkisi gerekmez; aynı komut eski sürümü günceller.',
        'Встав у PowerShell (Win + X → Термінал) і натисни Enter. Без прав адміністратора; та сама команда оновлює стару версію.'],
    'Wszystkie wersje': ['All versions', 'Alle Versionen', 'Všechny verze', 'Todas las versiones', 'Toutes les versions', 'Todas as versões', 'Все версии', 'Tüm sürümler', 'Усі версії'],
}
out = {lang: {} for lang in LANGS}
for k, v in D.items():
    assert len(v) == 9, k
    for lang, t in zip(LANGS, v):
        out[lang][k] = t
with open(r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/i18n/patches-39.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print('ok', len(D))
