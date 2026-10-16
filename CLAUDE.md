# trainingslog

(Das Repo heißt `trainingslog`; die App heißt für Nils überall **„Training“** — Kopfzeile, Ladebildschirm, Browser-Titel, Handy-Startbildschirm.)

Trainings-App (`app.html`, Plan in `const DAYS`), Daten in Supabase (`training_sessions`, Projekt `dnziimlhlvpmizrqkxte`).

## Geplante Progressionen

Noch **nicht** umgestellt — Nils trainiert die aktuelle Übung weiter und entscheidet selbst, wann er wechselt. Erst in `DAYS` eintragen, wenn er es sagt.

| aktuelle Übung | nächste Stufe (neue Übung, eigene Historie, kein `RENAMES`) | Stand |
|---|---|---|
| Tuck Planche Press-up | Tuck Planche Press-up (1s Pause oben, jede Wdh) — 3 Sätze, sammeln, Ziel 10 Wdh | Paket B, nach 1 Woche des neuen Zyklus |
| Crow to Tuck Headstand Press (1s Pause in der Krähe) | … (2s Pause in der Krähe) — 2 Sätze, sammeln, Ziel 10 Wdh | Paket B |
| One-Legged Advanced Tuck Front Lever Raise | … (1s Pause oben, jede Wdh) — Sätze/Ziel wie bisher | Paket C, Woche 3–4 |
| Hip to Bar | Hip to Bar (1s Pause oben) — 2 Sätze, 5–10, bis Muskelversagen | Paket C |
| Hollow Body Walk Out + Halten (2s am Ende) | … (4s am Ende) — 3 Sätze, sammeln, Ziel 10 Wdh | Paket C |
| Wall Push Out + Balance (Facing Wall / Back 2 Wall) | … (2s Balance halten) — 3 Sätze, sammeln, Ziel 5–10 Versuche | Paket C |
| Handstand Hold (Entry Back to Wall) | … (Zehen 3s lösen) — 3 Sätze, bis Ermüdung, Anzahl Versuche | Paket C |

Paket A ist umgestellt (16.10.2026): Headstand 10 cm von der Wand (Einarm, Planche, Handstand), Negative Archer Pull-up (3–4s Ablassen) (Einarm, Planche, HSPU), Ziel 30 s bei Elephant Stance und One Leg Front Lever. **Nicht ändern** (Nils): One Arm Push-up bleibt, Sätze und Tagesverteilung bleiben. Pakete B und C erst auf Nils' Ansage eintragen.

## Kennzeichen „Nächstes Mal steigern“

Nils setzt sie im Abschluss einer Einheit (nie automatisch neu; ein bestehendes Kennzeichen läuft weiter, solange das Ergebnis mindestens so gut ist wie damals). Sie stehen in `training_sessions.data._steigern` als `{ "<Übungsname>": { on, note, auto, vals } }`. Es gilt das Kennzeichen der **letzten** Einheit, in der die Übung vorkommt; wurde die Übung durch eine neue Variante ersetzt, ist es erledigt.

Vor einer Plan-Anpassung zuerst lesen (nur lesen), z. B.:

```sql
WITH s AS (
  SELECT session_date, e.key AS uebung, data->'_steigern'->e.key AS flag
  FROM training_sessions, jsonb_each(data) e
  WHERE person = 'nils' AND day_key <> '__meta__' AND e.key NOT LIKE '\_%'
    AND jsonb_typeof(e.value) = 'array'
    AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(e.value) x WHERE x <> '')
), letzte AS (
  SELECT DISTINCT ON (uebung) uebung, session_date, flag FROM s ORDER BY uebung, session_date DESC
)
SELECT uebung, session_date, flag->>'note' AS notiz
FROM letzte WHERE (flag->>'on')::boolean ORDER BY session_date DESC;
```

Die Tabelle „Geplante Progressionen“ oben bleibt für Vorhaben, die Nils ausdrücklich später umstellen will.

## App installieren (PWA)

`manifest.webmanifest` + `icons/` (Quelle `icons/icon.svg`: Handstand-Figur auf Teal). Die PNGs (512, 192, Apple 180) sind aus der SVG gerendert; bei Änderung am Symbol neu rendern. Start direkt auf `app.html`, Anzeigename „Training“ (Manifest-Name und Kurzname). Service Worker siehe nächster Abschnitt.

## Namen der Trainingstage

Angezeigt werden Titel, Kürzel und Untertitel aus `DAYS`; die **internen Schlüssel** (und damit alle gespeicherten Daten) heißen weiter `l2a` usw. — nie umbenennen.

| Schlüssel | Titel | Kürzel (Tabs, Plan) | Untertitel |
|---|---|---|---|
| `l2a` | Einarm | Einarm | Einarm-Liegestütz, Archer, Einarm-Rudern |
| `l2b` | Planche | Planche | Tuck Planche, Front-Lever-Raise, Beine |
| `l2c` | Handstand-Druck | HSPU | Handstand-Liegestütz, Front Lever, Nordic |
| `skill` | Skill | Skill | Elbow Lever, Handstand-Technik, Muscle-up |
| `hs2` | Handstand | HS | Balance, Freistand, Einstiege |
| `deload` | Deload | Deload | Mobility & Erholung (Review-Woche) |
| `travel` | Reise-Training | Reise | ohne Wand und Stange |

Frühere Bezeichnungen (L2A, L2B, L2C, Skill Day L2, HS2) kommen in Notizen und älteren Gesprächen vor und meinen dieselben Tage.


## Offline und Ladezeit

- **Service Worker `sw.js`**: App-Hülle, Schriften, Icons und Bibliothek liegen im Cache (`training-shell-v1`); `app.html` wird network-first geladen (3 s, sonst Cache) — Änderungen an `app.html` brauchen **keinen** Versions-Bump. Neue Dateien in `PRECACHE` eintragen; ändert sich eine Datei in `fonts/`, `vendor/` oder `icons/`, dem Dateinamen eine neue Version geben (sie werden cache-first und `immutable` ausgeliefert, siehe `vercel.json`) und `training-shell-v1` in `sw.js` hochzählen.
- **Schriften und supabase-js liegen im Repo** (`fonts/`, `vendor/supabase-<version>.js`), nichts mehr von Google/CDN.
- **Lese-Cache** (IndexedDB `training_cache`): `cachedFetch` um den Supabase-Client; GETs werden gespeichert und bei Funkloch daraus beantwortet, dann zeigt die Startseite „Offline“. Schreibzugriffe gehen nie durch den Cache.
- **Eingaben gehen nicht verloren**: heutige Eingaben werden sofort in `localStorage` (`training_pending_v1`, Schlüssel `tag|datum`) gesichert und nach Bestätigung durch Supabase entfernt. Ohne Netz bleibt der Status „⏳“ (`queued`); gesendet wird bei `online`, beim Zurückkehren in die App, alle 20 s und beim Start (`flushPending`, über dieselbe `saveChain`). Beim Start ohne Netz wird die ungesendete Einheit wiederhergestellt. Der Zeiger rückt beim Nachsenden nur für wirklich neue Einheiten weiter.
