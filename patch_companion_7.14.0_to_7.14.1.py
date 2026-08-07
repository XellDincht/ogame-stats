from pathlib import Path
import sys

path = Path(sys.argv[1] if len(sys.argv) > 1 else "userscripts/OGame-Stats-Companion.user.js")
if not path.exists():
    raise SystemExit(f"Datei nicht gefunden: {path}")

text = path.read_text(encoding="utf-8")
if "// @version      7.14.0" not in text:
    raise SystemExit("Abbruch: Erwartete Ausgangsversion 7.14.0 nicht gefunden.")

backup = path.with_suffix(path.suffix + ".7.14.0.bak")
backup.write_text(text, encoding="utf-8")
text = text.replace("// @version      7.14.0", "// @version      7.14.1", 1)
text = text.replace("Collector 7.14.0", "Collector 7.14.1")

start = text.find("  async function combatUpdateReports() {")
end = text.find("  function combatAggregate() {", start)
if start < 0 or end < 0:
    raise SystemExit("Abbruch: combatUpdateReports-Block nicht gefunden.")

new_update = """  async function combatUpdateReports() {
    const button = document.querySelector("#oas-combat-update");
    const state = document.querySelector("#oas-combat-state");

    if (button) button.disabled = true;
    if (state) state.textContent = "Kampfberichte werden vorbereitet …";

    try {
      const previous = combatLoad();
      let dailyReports = combatPruneDailyReports(previous.daily_reports || {});
      let currentReports = previous.current_reports || {};
      const messageNodes = combatCollectLoadedMessageNodes();
      let parsed = 0;
      let fresh = 0;
      let skipped = 0;
      let errors = 0;

      if (messageNodes.length) {
        const parsedCurrentReports = {};
        for (const messageNode of messageNodes) {
          try {
            const report = combatParseMessageNode(messageNode);
            if (!report?.id) { skipped++; continue; }
            if (!previous.current_reports?.[report.id]) fresh++;
            parsedCurrentReports[report.id] = report;
            if (combatIsToday(report)) dailyReports[report.id] = report;
            parsed++;
          } catch (error) {
            errors++;
            console.warn("[OGame Companion] Kampfbericht nicht lesbar", error, messageNode);
          }
        }
        if (parsed > 0) currentReports = parsedCurrentReports;
      }

      combatSave({ current_reports: currentReports, daily_reports: dailyReports });

      let syncText = "nur lokal";
      const session = loadSupabaseSession();

      if (session?.access_token) {
        if (state) state.textContent = "Heutige Kampfberichte werden mit Supabase synchronisiert …";
        try {
          const remoteToday = await combatSupabaseSyncToday(Object.values(dailyReports));
          const mergedToday = { ...dailyReports };
          for (const report of remoteToday) {
            if (report?.id) mergedToday[report.id] = report;
          }
          dailyReports = combatPruneDailyReports(mergedToday);
          combatSave({ current_reports: currentReports, daily_reports: dailyReports });
          syncText = `Supabase: ${Object.keys(dailyReports).length} heute`;
        } catch (syncError) {
          console.warn("[OGame Companion] Kampfberichte-Supabase-Sync fehlgeschlagen", syncError);
          syncText = `Supabase fehlgeschlagen: ${syncError.message}`;
        }
      } else {
        syncText = "Supabase nicht angemeldet";
      }

      combatRender();
      const localCount = Object.keys(dailyReports).length;
      if (state) state.textContent = `${localCount} Kampfberichte heute - ${syncText}`;

      if (parsed > 0) {
        showMessage(
          `${parsed} aktuell sichtbare Kampfberichte übernommen, ${fresh} neu - ${syncText}` +
          `${skipped ? `, ${skipped} andere Nachrichten ignoriert` : ""}` +
          `${errors ? `, ${errors} fehlerhaft` : ""}.`,
          errors ? "info" : "success"
        );
      } else if (localCount > 0) {
        showMessage(`Keine neuen Kampfberichte geladen. Vorhandener Tagesstand wurde synchronisiert - ${syncText}.`, "success");
      } else if (session?.access_token) {
        showMessage(`Keine lokalen oder geladenen Kampfberichte vorhanden - ${syncText}.`, "info");
      } else {
        showMessage("Keine geladenen Kampfberichte gefunden und Supabase ist nicht angemeldet.", "info");
      }
    } catch (error) {
      console.error("[OGame Companion] Kampfberichte konnten nicht synchronisiert werden", error);
      showMessage(`Kampfbericht-Sync fehlgeschlagen: ${error.message}`, "error");
      if (state) state.textContent = "Synchronisierung fehlgeschlagen";
    } finally {
      if (button) button.disabled = false;
    }
  }

"""

text = text[:start] + new_update + text[end:]
path.write_text(text, encoding="utf-8")
print(f"OK: {path}")
print(f"Backup: {backup}")
print("Version: 7.14.1")
print("Fix: bestehende heutige daily_reports werden auch ohne neue Kampfberichte synchronisiert.")