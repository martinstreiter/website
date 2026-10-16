# Website martinstreiter.de

Statische Website, gehostet über GitHub Pages aus dem Repo
`martinstreiter/website` (Branch `main`, Root-Verzeichnis). Die Domain steht in `CNAME`.

## Aufbau

- `index.html` – Startseite (Name, Titel, Links)
- `impressum.html` – Impressum
- `snake.html` + `js/snake.js` – Minispiel „Holzblasinstrumentensnake“ (Canvas, Wischen/Pfeiltasten;
  Instrumente Querflöte, Oboe, Klarinette, Fagott mit je eigenem Futter),
  verlinkt unter den Konzertterminen
- `css/styles.css` – gemeinsames Stylesheet für alle Seiten
- `images/` – Bilder

Kein Build-Schritt, kein Framework: reines HTML/CSS. Neue Seiten als eigene
`.html`-Datei im Root anlegen und `css/styles.css` einbinden. Sprache der Seite: Deutsch.

## Workflow: beschreiben → veröffentlichen

1. Martin beschreibt im Chat, was sich ändern soll.
2. Claude ändert die Dateien und zeigt die Seite zur Kontrolle in der Vorschau
   (Datei direkt im Browser-Pane öffnen).
3. Erst nach Martins OK: `git add`, `git commit` mit aussagekräftiger Nachricht,
   `git push origin main`.
4. GitHub Pages veröffentlicht automatisch; nach ca. 1–2 Minuten ist die Änderung
   unter https://martinstreiter.de sichtbar.

## Regeln

- `CNAME` nicht ändern oder löschen, sonst geht die Domain verloren.
- Impressum muss von jeder Seite aus erreichbar bleiben.
- Nie ohne ausdrückliches OK pushen.
