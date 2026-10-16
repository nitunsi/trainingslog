# trainingslog

(Das Repo heißt `trainingslog`; die App heißt für Nils überall **„Training“** — Kopfzeile, Ladebildschirm, Browser-Titel, Handy-Startbildschirm.)

Trainings-App (`app.html`, Plan in `const DAYS`), Daten in Supabase (`training_sessions`, Projekt `dnziimlhlvpmizrqkxte`).

## Geplante Progressionen

Nils trainiert die aktuelle Übung weiter und entscheidet selbst, wann er wechselt. Neue Stufen erst in `DAYS` eintragen, wenn er es sagt.

Aktueller Stand (16.10.2026, Start des neuen Zyklus): die Pakete A–C sind umgestellt, jeweils als neue Übung mit eigener Historie (kein `RENAMES`):

| bisher | jetzt |
|---|---|
| Headstand an der Wand (Wandkontakt lösen) | Headstand 10 cm von der Wand (Wandkontakt lösen) |
| Negative Archer Pull-up (5–15) | Negative Archer Pull-up (3–4s Ablassen) (5–10) |
| Tuck Planche Press-up | Tuck Planche Press-up (1s Pause oben, jede Wdh) |
| Crow to Tuck Headstand Press (1s Pause in der Krähe) | … (2s Pause in der Krähe) |
| One-Legged Advanced Tuck Front Lever Raise | … (1s Pause oben, jede Wdh) |
| Hip to Bar (5–15) | Hip to Bar (1s Pause oben) (5–10) |
| Hollow Body Walk Out + Halten (2s am Ende) | … (4s am Ende), Ziel „sammeln, Ziel 10 Wdh“ |
| Wall Push Out + Balance (Facing Wall / Back 2 Wall) | … (2s Balance halten) |
| Handstand Hold (Entry Back to Wall) | … (Zehen 3s lösen) |
| Elephant Stance, One Leg Front Lever | gleicher Name, Ziel 30 s statt 20 s |

Bleibt der Name einer Übung gleich und wird nur das Ziel angehoben, das „Steigern“-Kennzeichen der Vorgänger-Einheit aber damit erledigt ist, steht die Übung in `STEIGERN_ERLEDIGT` (`app.html`, Datum = letzte Session, deren Kennzeichen ignoriert wird).

**Geplante nächste Stufe, noch nicht umgestellt:** Navel Up Explosive Pull-Up (Nils bleibt vorerst dabei, 9/9 bei Ziel 5–15; Stange nur im Türrahmen, kein Muscle-up möglich). Reihenfolge der Ideen: „Navel Up Explosive Pull-Up (3s runter)“ (2 Sätze, 5–10, bis Muskelversagen, explosiv hoch, langsam ab), später gewichtet (2–4 kg Rucksack ab 10 sauberen Wdh), Falschgriff-Hangs/-Pull-ups (Handgelenke beachten), Brust zur Stange mit 1 s Pause (nur falls Platz). Erst eintragen, wenn Nils es sagt. Sein „Steigern“-Kennzeichen (15.10.) ist über `STEIGERN_ERLEDIGT` ausgeblendet.

**Nicht ändern** (Nils): One Arm Push-up bleibt; Sätze und Tagesverteilung bleiben. Im Reise-Training (`travel`) wurden nur Hollow Body (4s am Ende) und Headstand 10 cm angepasst. Weitere Progressionen erst eintragen, wenn Nils es sagt.

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
