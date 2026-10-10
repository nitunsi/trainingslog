# trainingslog

Trainings-App (`app.html`, Plan in `const DAYS`), Daten in Supabase (`training_sessions`, Projekt `dnziimlhlvpmizrqkxte`).

## Geplante Progressionen

Noch **nicht** umgestellt — Nils trainiert die aktuelle Übung weiter und entscheidet selbst, wann er wechselt. Erst in `DAYS` eintragen, wenn er es sagt.

| aktuelle Übung | nächste Stufe | Stand / Auslöser |
|---|---|---|
| Negative Archer Pull-up (L2A/L2B/L2C) | Negative Archer Pull-up mit 3–4s Ablassen — als eigene neue Übung (kein `RENAMES`-Eintrag) | 04.10.2026: erster Satz 10 Wdh am Stück, aber mit schnellem Ablassen |

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

`manifest.webmanifest` + `icons/` (Quelle `icons/icon.svg`: Handstand-Figur auf Teal). Die PNGs (512, 192, Apple 180) sind aus der SVG gerendert; bei Änderung am Symbol neu rendern. Start direkt auf `app.html`, Anzeigename „Training“. Kein Service Worker (die App braucht ohnehin Supabase).

