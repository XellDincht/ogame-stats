from pathlib import Path
import base64
import shutil
import subprocess
import sys

def dec(s):
    return base64.b64decode(s).decode("utf-8")

APP=Path("docs/app.js")
INDEX=Path("docs/index.html")
MSG=Path("docs/messages.css")
SHELL=Path("docs/site-shell.css")

for p in (APP,INDEX,MSG,SHELL):
    if not p.exists():
        raise SystemExit(f"Datei nicht gefunden: {p}")

backups=[]
for p in (APP,INDEX,MSG,SHELL):
    b=p.with_suffix(p.suffix+".homepage-fix2.bak")
    shutil.copy2(p,b)
    backups.append((p,b))

def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise RuntimeError(f"{label}: erwartet 1 Treffer, gefunden {count}")
    return text.replace(old,new,1)

def replace_between(text,start_marker,end_marker,replacement,label):
    start=text.find(start_marker)
    if start<0:
        raise RuntimeError(f"{label}: Startmarker nicht gefunden")
    end=text.find(end_marker,start+len(start_marker))
    if end<0:
        raise RuntimeError(f"{label}: Endmarker nicht gefunden")
    return text[:start]+replacement.rstrip()+"\n"+text[end:]

try:
    # ------------------------------------------------------------
    # app.js
    # ------------------------------------------------------------
    app=APP.read_text(encoding="utf-8")

    app=replace_between(
        app,
        "function cards(){",
        "function byid(id){",
        dec("ZnVuY3Rpb24gY2FyZHMoKXsKICBjb25zdCBhbGxpYW5jZT1ELmFsbGlhbmNlPy5sYXRlc3R8fHt9OwogIGNvbnN0IHBsYXllcnM9YWN0aXZlUGxheWVycygpOwoKICBjb25zdCBhbGxpYW5jZVRvdGFscz17CiAgICB0b3RhbF9wb2ludHM6YWxsaWFuY2UudG90YWxfcG9pbnRzfHxwbGF5ZXJzLnJlZHVjZSgoc3VtLHApPT5zdW0rKGxhc3QocCkudG90YWxfcG9pbnRzfHwwKSwwKXx8MSwKICAgIGVjb25vbXlfcG9pbnRzOmFsbGlhbmNlLmVjb25vbXlfcG9pbnRzfHxwbGF5ZXJzLnJlZHVjZSgoc3VtLHApPT5zdW0rKGxhc3QocCkuZWNvbm9teV9wb2ludHN8fDApLDApfHwxLAogICAgcmVzZWFyY2hfcG9pbnRzOmFsbGlhbmNlLnJlc2VhcmNoX3BvaW50c3x8cGxheWVycy5yZWR1Y2UoKHN1bSxwKT0+c3VtKyhsYXN0KHApLnJlc2VhcmNoX3BvaW50c3x8MCksMCl8fDEsCiAgICBtaWxpdGFyeV9wb2ludHM6YWxsaWFuY2UubWlsaXRhcnlfcG9pbnRzfHxwbGF5ZXJzLnJlZHVjZSgoc3VtLHApPT5zdW0rKGxhc3QocCkubWlsaXRhcnlfcG9pbnRzfHwwKSwwKXx8MQogIH07CgogIGNvbnN0IHNoYXJlT2ZBbGxpYW5jZT0odmFsdWUsZmllbGQpPT4KICAgIE1hdGgubWF4KDAsKE51bWJlcih2YWx1ZSl8fDApLyhhbGxpYW5jZVRvdGFsc1tmaWVsZF18fDEpKjEwMCk7CgogIGNvbnN0IHNoYXJlTGFiZWw9dmFsdWU9PgogICAgdmFsdWUudG9Mb2NhbGVTdHJpbmcoImRlLURFIix7bWF4aW11bUZyYWN0aW9uRGlnaXRzOjF9KTsKCiAgJCgiI3BsYXllckNhcmRzIikuaW5uZXJIVE1MPXZpc2libGUoKS5tYXAoKHAsaW5kZXgpPT57CiAgICBjb25zdCBzPWxhc3QocCk7CiAgICBjb25zdCB0b3RhbD1zLnRvdGFsX3BvaW50c3x8MDsKICAgIGNvbnN0IHNoYXJlPXNoYXJlT2ZBbGxpYW5jZSh0b3RhbCwidG90YWxfcG9pbnRzIik7CiAgICBjb25zdCByYW5rPXMudG90YWxfcmFuayE9bnVsbD9gIyR7Zm10KHMudG90YWxfcmFuayl9YDoi4oCTIjsKCiAgICBjb25zdCBtZXRyaWNzPVsKICAgICAgWyLDlmtvbm9taWUiLCJlY29ub215X3BvaW50cyJdLAogICAgICBbIkZvcnNjaHVuZyIsInJlc2VhcmNoX3BvaW50cyJdLAogICAgICBbIk1pbGl0w6RyIiwibWlsaXRhcnlfcG9pbnRzIl0KICAgIF07CgogICAgcmV0dXJuIGA8YXJ0aWNsZSBjbGFzcz0icGxheWVyLWNhcmQgcGxheWVyLWNhcmQtdjIiIHN0eWxlPSItLXBsYXllci1hY2NlbnQ6JHtDW2luZGV4JUMubGVuZ3RoXX0iPgogICAgICA8ZGl2IGNsYXNzPSJwbGF5ZXItY2FyZC1oZWFkIj4KICAgICAgICA8ZGl2PgogICAgICAgICAgPHNwYW4gY2xhc3M9InBsYXllci1jYXJkLWRhdGUiPiR7cy5kYXRlfHwi4oCTIn08L3NwYW4+CiAgICAgICAgICA8aDM+PGEgaHJlZj0icGxheWVyLmh0bWw/aWQ9JHtwLmlkfSI+JHtwLm5hbWV9PC9hPjwvaDM+CiAgICAgICAgPC9kaXY+CiAgICAgICAgPHNwYW4gY2xhc3M9InBsYXllci1yYW5rIj4ke3Jhbmt9PC9zcGFuPgogICAgICA8L2Rpdj4KCiAgICAgIDxkaXYgY2xhc3M9InBsYXllci10b3RhbCI+CiAgICAgICAgPHNwYW4+R2VzYW10cHVua3RlPC9zcGFuPgogICAgICAgIDxzdHJvbmc+JHtmbXQodG90YWwpfTwvc3Ryb25nPgogICAgICAgICR7Y2hhbmdlSHRtbChwLCJ0b3RhbF9wb2ludHMiKX0KICAgICAgPC9kaXY+CgogICAgICA8ZGl2IGNsYXNzPSJwbGF5ZXItc2hhcmUiPgogICAgICAgIDxkaXYgY2xhc3M9InBsYXllci1zaGFyZS1jb3B5Ij4KICAgICAgICAgIDxzcGFuPkFudGVpbCBhbiBBbGxpYW56PC9zcGFuPgogICAgICAgICAgPHN0cm9uZz4ke3NoYXJlTGFiZWwoc2hhcmUpfSU8L3N0cm9uZz4KICAgICAgICA8L2Rpdj4KICAgICAgICA8ZGl2IGNsYXNzPSJwbGF5ZXItc2hhcmUtdHJhY2siPgogICAgICAgICAgPHNwYW4gc3R5bGU9IndpZHRoOiR7TWF0aC5taW4oMTAwLHNoYXJlKX0lIj48L3NwYW4+CiAgICAgICAgPC9kaXY+CiAgICAgIDwvZGl2PgoKICAgICAgPGRpdiBjbGFzcz0icGxheWVyLW1ldHJpYy1ncmlkIj4KICAgICAgICAke21ldHJpY3MubWFwKChbbGFiZWwsZmllbGRdKT0+ewogICAgICAgICAgY29uc3QgbWV0cmljU2hhcmU9c2hhcmVPZkFsbGlhbmNlKHNbZmllbGRdLGZpZWxkKTsKICAgICAgICAgIHJldHVybiBgCiAgICAgICAgICA8ZGl2IGNsYXNzPSJwbGF5ZXItbWV0cmljIj4KICAgICAgICAgICAgPHNwYW4+JHtsYWJlbH08L3NwYW4+CiAgICAgICAgICAgIDxzdHJvbmc+JHtmbXQoc1tmaWVsZF0pfTwvc3Ryb25nPgogICAgICAgICAgICAke2NoYW5nZUh0bWwocCxmaWVsZCl9CiAgICAgICAgICAgIDxkaXYgY2xhc3M9InBsYXllci1tZXRyaWMtc2hhcmUiPgogICAgICAgICAgICAgIDxzcGFuPkFudGVpbDwvc3Bhbj4KICAgICAgICAgICAgICA8c3Ryb25nPiR7c2hhcmVMYWJlbChtZXRyaWNTaGFyZSl9JTwvc3Ryb25nPgogICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgIDwvZGl2PmA7CiAgICAgICAgfSkuam9pbigiIil9CiAgICAgIDwvZGl2PgoKICAgICAgPGRpdiBjbGFzcz0icGxheWVyLWNhcmQtZm9vdCI+CiAgICAgICAgPHNwYW4+PHNtYWxsPlNjaGlmZmU8L3NtYWxsPjxzdHJvbmc+JHtmbXQocy5zaGlwcyl9PC9zdHJvbmc+PC9zcGFuPgogICAgICAgIDxzcGFuPjxzbWFsbD5FaHJlbnB1bmt0ZTwvc21hbGw+PHN0cm9uZz4ke2ZtdChzLmhvbm9yX3BvaW50cyl9PC9zdHJvbmc+PC9zcGFuPgogICAgICAgIDxhIGhyZWY9InBsYXllci5odG1sP2lkPSR7cC5pZH0iPkhpc3RvcmllIOKGlzwvYT4KICAgICAgPC9kaXY+CiAgICA8L2FydGljbGU+YDsKICB9KS5qb2luKCIiKTsKfQo="),
        "cards()"
    )

    app=replace_once(
        app,
        '    $("#subtitle").textContent=`Server ${D.meta.server} · letzter Snapshot ${D.meta.latest_date||"–"}`;',
        '    $("#subtitle").textContent=`Letzter Snapshot ${D.meta.latest_date||"–"}`;',
        "Subtitle"
    )

    APP.write_text(app,encoding="utf-8")

    # ------------------------------------------------------------
    # index.html
    # ------------------------------------------------------------
    index=INDEX.read_text(encoding="utf-8")
    index=replace_once(
        index,
        '<p class="eyebrow">Astrid · s282-de</p>',
        '<p class="eyebrow">Allianz-Dashboard</p>',
        "Hero-Servername"
    )
    INDEX.write_text(index,encoding="utf-8")

    # ------------------------------------------------------------
    # site-shell.css
    # Nur anhängen, falls noch nicht vorhanden.
    # ------------------------------------------------------------
    shell=SHELL.read_text(encoding="utf-8")
    if ".player-metric-share{" not in shell:
        shell += "\n"+dec("Ci5wbGF5ZXItbWV0cmljLXNoYXJlewogIGRpc3BsYXk6ZmxleDsKICBhbGlnbi1pdGVtczpjZW50ZXI7CiAganVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47CiAgZ2FwOjhweDsKICBtYXJnaW4tdG9wOjhweDsKICBwYWRkaW5nLXRvcDo3cHg7CiAgYm9yZGVyLXRvcDoxcHggc29saWQgcmdiYSgxMjYsMTgxLDIzMiwuMDcpOwogIGNvbG9yOiM3MTg5OWY7CiAgZm9udC1zaXplOi42NnJlbTsKfQoKLnBsYXllci1tZXRyaWMtc2hhcmUgPiBzcGFuewogIGNvbG9yOiM3MTg5OWYgIWltcG9ydGFudDsKICBmb250LXNpemU6LjY2cmVtICFpbXBvcnRhbnQ7Cn0KCi5wbGF5ZXItbWV0cmljLXNoYXJlID4gc3Ryb25newogIG1hcmdpbjowICFpbXBvcnRhbnQ7CiAgY29sb3I6I2JmZDdlYTsKICBmb250LXNpemU6LjcycmVtICFpbXBvcnRhbnQ7CiAgbGluZS1oZWlnaHQ6MTsKfQo=")+"\n"
    SHELL.write_text(shell,encoding="utf-8")

    # ------------------------------------------------------------
    # messages.css
    # Ebenfalls als gezieltes Override anhängen.
    # Dadurch keine Abhängigkeit vom exakten bestehenden Modal-Block.
    # ------------------------------------------------------------
    msg=MSG.read_text(encoding="utf-8")
    if "body.has-site-shell > .image-modal{" not in msg:
        msg += "\n"+dec("Ci8qIE1vbmR2ZXJzdWNoLUJpbGQgbXVzcyB0cm90eiBnbG9iYWxlbSBib2R5Lmhhcy1zaXRlLXNoZWxsID4gKiBmaXhlZCBibGVpYmVuLiAqLwpib2R5Lmhhcy1zaXRlLXNoZWxsID4gLmltYWdlLW1vZGFsewogIHBvc2l0aW9uOmZpeGVkICFpbXBvcnRhbnQ7CiAgaW5zZXQ6MCAhaW1wb3J0YW50OwogIHotaW5kZXg6MjAwMCAhaW1wb3J0YW50Owp9Cg==")+"\n"
    MSG.write_text(msg,encoding="utf-8")

    # ------------------------------------------------------------
    # Checks
    # ------------------------------------------------------------
    node=shutil.which("node")
    if node:
        result=subprocess.run(
            [node,"--check",str(APP)],
            capture_output=True,
            text=True
        )
        if result.returncode!=0:
            raise RuntimeError("app.js Syntaxfehler:\n"+result.stderr)

    app_check=APP.read_text(encoding="utf-8")
    index_check=INDEX.read_text(encoding="utf-8")
    msg_check=MSG.read_text(encoding="utf-8")
    shell_check=SHELL.read_text(encoding="utf-8")

    required=[
        ("app.js",'class="player-metric-share"',app_check),
        ("app.js",'economy_points:alliance.economy_points',app_check),
        ("app.js",'research_points:alliance.research_points',app_check),
        ("app.js",'military_points:alliance.military_points',app_check),
        ("app.js",'$("#subtitle").textContent=`Letzter Snapshot ',app_check),
        ("index.html",'<p class="eyebrow">Allianz-Dashboard</p>',index_check),
        ("messages.css",'body.has-site-shell > .image-modal{',msg_check),
        ("site-shell.css",'.player-metric-share{',shell_check)
    ]

    missing=[
        f"{file}: {needle}"
        for file,needle,content in required
        if needle not in content
    ]
    if missing:
        raise RuntimeError("Sicherheitsprüfung fehlgeschlagen:\n- "+"\n- ".join(missing))

    print("OK: Homepage-Update FIX2 erfolgreich.")
    print("")
    print("- Mondversuch-Bildmodal: fixed + z-index Override")
    print("- Anteil an Allianz zusätzlich für Ökonomie")
    print("- Anteil an Allianz zusätzlich für Forschung")
    print("- Anteil an Allianz zusätzlich für Militär")
    print("- Servername aus Hero entfernt")
    print("- Servername aus Subtitle entfernt")
    print("- Astrid s282-de bleibt im globalen Header")
    if node:
        print("- app.js Syntaxprüfung: OK")
    print("")
    print("Backups:")
    for _,b in backups:
        print(" ",b)

except Exception as exc:
    for p,b in backups:
        if b.exists():
            shutil.copy2(b,p)
    print("Patch abgebrochen, Originaldateien wiederhergestellt.")
    print("Grund:",exc)
    sys.exit(1)
