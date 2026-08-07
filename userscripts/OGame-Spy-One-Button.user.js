// ==UserScript==
// @name         OGame Spy One-Button
// @namespace    https://github.com/XellDincht/ogame-stats
// @version      0.2.0
// @description  Großer Ein-Knopf-Workflow für AGR-Spionageberichte mit 30-Minuten-Filter und sicherer Bericht-Zuordnung.
// @match        https://*.ogame.gameforge.com/game/index.php*
// @grant        unsafeWindow
// @updateURL    https://raw.githubusercontent.com/XellDincht/ogame-stats/main/userscripts/OGame-Spy-One-Button.user.js
// @downloadURL  https://raw.githubusercontent.com/XellDincht/ogame-stats/main/userscripts/OGame-Spy-One-Button.user.js
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const w = unsafeWindow;

    const CFG = {
        rowSelector: 'tr.row[id^="m_"]',
        eyeSelector: '.spyTableIcon.icon_eye',
        deleteSelector: '.spyTableIcon.icon_delete',
        ageCellSelector: 'td.agoLeft.tooltipRight',

        minAgeSeconds: 30 * 60,

        scanIntervalMs: 500,
        deleteTimeoutMs: 6000,
        ajaxPatchRetryMs: 500,
        spyResponseTimeoutMs: 7000,
    };

    const State = {
        mode: 'scan', // scan | waiting | delete | error
        currentRowId: null,
        currentCoords: null,
        currentTarget: null,

        ajaxPatched: false,
        pendingSpyRequest: false,

        deleteWatcher: null,
        lastErrorTimer: null,
    };

    // ------------------------------------------------------------
    // Bericht / Alter
    // ------------------------------------------------------------

    function parseAgeToSeconds(text) {
        if (!text) return null;

        const value = String(text).trim().toLowerCase();
        let total = 0;
        let found = false;

        // Unterstützt z.B.:
        // 15m 48s
        // 1h 03m
        // 2d 4h
        // 1w 2d
        const patterns = [
            { regex: /(\d+)\s*w/g, factor: 7 * 24 * 3600 },
            { regex: /(\d+)\s*d/g, factor: 24 * 3600 },
            { regex: /(\d+)\s*h/g, factor: 3600 },
            { regex: /(\d+)\s*m/g, factor: 60 },
            { regex: /(\d+)\s*s/g, factor: 1 },
        ];

        for (const p of patterns) {
            for (const match of value.matchAll(p.regex)) {
                total += Number(match[1]) * p.factor;
                found = true;
            }
        }

        return found ? total : null;
    }

    function getRowAgeSeconds(row) {
        const ageCell = row?.querySelector(CFG.ageCellSelector);
        return parseAgeToSeconds(ageCell?.textContent || '');
    }

    function formatAge(seconds) {
        if (seconds == null) return '?';

        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (d > 0) return `${d}d ${h}h`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m ${s}s`;
    }

    function allSpyRows() {
        return [...document.querySelectorAll(CFG.rowSelector)]
            .filter(row =>
                row.querySelector(CFG.eyeSelector) &&
                row.querySelector(CFG.deleteSelector)
            );
    }

    function getCandidateInfo() {
        const rows = allSpyRows();

        let skippedYoung = 0;
        let skippedUnknown = 0;

        for (const row of rows) {
            const ageSeconds = getRowAgeSeconds(row);

            // Unbekannte Zeit sicherheitshalber nicht verwenden.
            if (ageSeconds == null) {
                skippedUnknown++;
                continue;
            }

            if (ageSeconds < CFG.minAgeSeconds) {
                skippedYoung++;
                continue;
            }

            return {
                row,
                ageSeconds,
                skippedYoung,
                skippedUnknown,
                totalRows: rows.length,
            };
        }

        return {
            row: null,
            ageSeconds: null,
            skippedYoung,
            skippedUnknown,
            totalRows: rows.length,
        };
    }

    function rowInfo(row) {
        if (!row) return null;

        const cells = row.querySelectorAll('td');
        const coords = cells[0]?.innerText?.trim() || '?';
        const player =
            row.querySelector('.spyPlayerName')?.innerText?.trim() ||
            cells[2]?.innerText?.trim() ||
            '?';

        return {
            id: row.id,
            coords,
            player: player.replace(/\s*\(\d+\)\s*$/, '').trim(),
            ageSeconds: getRowAgeSeconds(row),
        };
    }

    // ------------------------------------------------------------
    // UI
    // ------------------------------------------------------------

    function makeUi() {
        if (document.getElementById('ogame-spy-onebutton')) return;

        const box = document.createElement('div');
        box.id = 'ogame-spy-onebutton';
        box.innerHTML = `
            <div class="oso-title">SPIONAGE</div>
            <div class="oso-target">Kein Bericht</div>
            <button class="oso-button" type="button" disabled>
                <span class="oso-icon">🛰</span>
                <span class="oso-label">SPIONIEREN</span>
            </button>
            <div class="oso-status">Warte auf Spionageberichte …</div>
            <div class="oso-skip"></div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #ogame-spy-onebutton {
                position: fixed;
                right: 24px;
                top: 50%;
                transform: translateY(-50%);
                width: 255px;
                padding: 14px;
                box-sizing: border-box;
                z-index: 999999;
                border: 1px solid #415a73;
                border-radius: 10px;
                background: rgba(8, 18, 30, .96);
                box-shadow: 0 10px 35px rgba(0,0,0,.55);
                font-family: Arial, sans-serif;
                color: #d9e6f2;
                display: none;
            }

            #ogame-spy-onebutton .oso-title {
                font-size: 12px;
                letter-spacing: 1.8px;
                opacity: .72;
                margin-bottom: 7px;
                text-align: center;
            }

            #ogame-spy-onebutton .oso-target {
                min-height: 50px;
                margin-bottom: 10px;
                text-align: center;
                line-height: 17px;
                font-size: 13px;
                color: #a9c8e8;
            }

            #ogame-spy-onebutton .oso-age {
                display: inline-block;
                margin-top: 4px;
                font-size: 12px;
                opacity: .85;
            }

            #ogame-spy-onebutton .oso-button {
                width: 100%;
                height: 94px;
                border: 1px solid #5d89ad;
                border-radius: 9px;
                cursor: pointer;
                color: #fff;
                background: linear-gradient(#1d567d, #123955);
                box-shadow: inset 0 1px rgba(255,255,255,.12), 0 3px 10px rgba(0,0,0,.35);
                transition: transform .06s ease, filter .15s ease, background .15s ease;
            }

            #ogame-spy-onebutton .oso-button:hover:not(:disabled) {
                filter: brightness(1.15);
            }

            #ogame-spy-onebutton .oso-button:active:not(:disabled) {
                transform: translateY(1px);
            }

            #ogame-spy-onebutton .oso-button:disabled {
                cursor: default;
                opacity: .6;
            }

            #ogame-spy-onebutton .oso-icon {
                display: block;
                font-size: 30px;
                line-height: 34px;
                margin-bottom: 5px;
            }

            #ogame-spy-onebutton .oso-label {
                display: block;
                font-size: 17px;
                font-weight: 700;
                letter-spacing: .5px;
            }

            #ogame-spy-onebutton .oso-status {
                min-height: 28px;
                margin-top: 9px;
                font-size: 11px;
                line-height: 14px;
                text-align: center;
                opacity: .78;
            }

            #ogame-spy-onebutton .oso-skip {
                margin-top: 4px;
                font-size: 10px;
                line-height: 13px;
                text-align: center;
                opacity: .55;
            }

            #ogame-spy-onebutton[data-mode="delete"] .oso-button {
                border-color: #bd665c;
                background: linear-gradient(#7f302b, #531d1a);
            }

            #ogame-spy-onebutton[data-mode="waiting"] .oso-button {
                background: linear-gradient(#555, #333);
            }

            #ogame-spy-onebutton[data-mode="error"] .oso-button {
                border-color: #c29a4b;
                background: linear-gradient(#705d2b, #493d1c);
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(box);

        box.querySelector('.oso-button').addEventListener('click', handleMainClick);
    }

    function ui() {
        const box = document.getElementById('ogame-spy-onebutton');
        return {
            box,
            button: box?.querySelector('.oso-button'),
            icon: box?.querySelector('.oso-icon'),
            label: box?.querySelector('.oso-label'),
            target: box?.querySelector('.oso-target'),
            status: box?.querySelector('.oso-status'),
            skip: box?.querySelector('.oso-skip'),
        };
    }

    function setMode(mode, statusText = '') {
        State.mode = mode;
        const x = ui();
        if (!x.box) return;

        x.box.dataset.mode = mode;

        if (mode === 'scan') {
            x.icon.textContent = '🛰';
            x.label.textContent = 'SPIONIEREN';
            x.status.textContent = statusText || 'Ersten Bericht ab 30 Minuten nachspionieren';
        } else if (mode === 'waiting') {
            x.icon.textContent = '⏳';
            x.label.textContent = 'WARTE AUF VERSAND';
            x.button.disabled = true;
            x.status.textContent = statusText || 'Sonden werden entsandt …';
        } else if (mode === 'delete') {
            x.icon.textContent = '🗑';
            x.label.textContent = 'BERICHT LÖSCHEN';
            x.button.disabled = false;
            x.status.textContent = statusText || 'Spionagesonden erfolgreich entsandt';
        } else if (mode === 'error') {
            x.icon.textContent = '⚠';
            x.label.textContent = 'ERNEUT VERSUCHEN';
            x.button.disabled = false;
            x.status.textContent = statusText || 'Aktion fehlgeschlagen';
        }
    }

    function refreshTarget() {
        makeUi();

        const x = ui();
        const rows = allSpyRows();

        // Box nur zeigen, wenn AGR-Spionageberichte vorhanden sind.
        x.box.style.display = rows.length ? 'block' : 'none';

        if (!rows.length) {
            State.currentRowId = null;
            State.currentCoords = null;
            State.currentTarget = null;
            return;
        }

        // Sobald ein Bericht "gelockt" wurde, bleibt die Anzeige auf genau diesem.
        // Ein anderer Bericht kann in dieser Zeit problemlos die 30-Minuten-Grenze überschreiten.
        if (State.mode === 'waiting' || State.mode === 'delete') {
            return;
        }

        const candidate = getCandidateInfo();

        if (!candidate.row) {
            State.currentRowId = null;
            State.currentCoords = null;
            State.currentTarget = null;

            x.target.innerHTML = `<strong>Kein Bericht ≥ 30 Min.</strong>`;
            x.button.disabled = true;
            x.status.textContent = 'Jüngere Berichte bleiben unangetastet';
            x.skip.textContent = buildSkipText(candidate);
            return;
        }

        const info = rowInfo(candidate.row);
        State.currentRowId = info.id;
        State.currentCoords = info.coords;
        State.currentTarget = info;

        x.target.innerHTML = `
            <strong>${escapeHtml(info.coords)}</strong><br>
            ${escapeHtml(info.player)}<br>
            <span class="oso-age">Alter: ${escapeHtml(formatAge(info.ageSeconds))}</span>
        `;

        x.skip.textContent = buildSkipText(candidate);

        if (State.mode === 'scan') {
            x.button.disabled = false;
            x.status.textContent = 'Bereit zum Nachspionieren';
        }
    }

    function buildSkipText(candidate) {
        const parts = [];

        if (candidate.skippedYoung > 0) {
            parts.push(`${candidate.skippedYoung} Bericht${candidate.skippedYoung === 1 ? '' : 'e'} < 30 Min. übersprungen`);
        }

        if (candidate.skippedUnknown > 0) {
            parts.push(`${candidate.skippedUnknown} Bericht${candidate.skippedUnknown === 1 ? '' : 'e'} ohne erkennbare Zeit übersprungen`);
        }

        return parts.join(' · ');
    }

    function escapeHtml(s) {
        return String(s)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    // ------------------------------------------------------------
    // Hauptaktion
    // ------------------------------------------------------------

    function handleMainClick() {
        if (State.mode === 'scan' || State.mode === 'error') {
            startSpy();
        } else if (State.mode === 'delete') {
            deleteCurrentReport();
        }
    }

    function startSpy() {
        // Kandidat genau im Klickmoment neu bestimmen.
        // Dadurch gilt >= 30:00 exakt zum Zeitpunkt der Aktion.
        const candidate = getCandidateInfo();

        if (!candidate.row) {
            setMode('scan', 'Kein Bericht mit mindestens 30 Minuten Alter');
            refreshTarget();
            return;
        }

        const row = candidate.row;
        const eye = row.querySelector(CFG.eyeSelector);

        if (!eye) {
            setMode('error', 'AGR-Spionageaktion nicht gefunden');
            return;
        }

        const info = rowInfo(row);

        // LOCK:
        // Ab diesem Punkt sind ID + Koordinaten fest an diesen Vorgang gebunden.
        // Selbst wenn andere Berichte danach >= 30 Minuten werden, ändert sich nichts.
        State.currentRowId = info.id;
        State.currentCoords = info.coords;
        State.currentTarget = info;

        const x = ui();
        x.target.innerHTML = `
            <strong>${escapeHtml(info.coords)}</strong><br>
            ${escapeHtml(info.player)}<br>
            <span class="oso-age">Alter beim Scan: ${escapeHtml(formatAge(info.ageSeconds))}</span>
        `;
        x.skip.textContent = 'Bericht für diesen Vorgang gesperrt';

        State.pendingSpyRequest = true;
        setMode('waiting');

        // AGRs vorhandene Spionageaktion verwenden.
        eye.click();

        window.setTimeout(() => {
            if (State.mode === 'waiting' && State.pendingSpyRequest) {
                State.pendingSpyRequest = false;
                setMode('error', 'Keine Versandantwort erkannt');
            }
        }, CFG.spyResponseTimeoutMs);
    }

    function handleSpyAjaxResponse(payload) {
        if (!State.pendingSpyRequest) return;

        State.pendingSpyRequest = false;

        const response = payload?.response;

        if (!response) {
            setMode('error', 'Unbekannte Antwort vom Flottenversand');
            return;
        }

        if (response.success === true) {
            const coords = response.coordinates
                ? `${response.coordinates.galaxy}:${response.coordinates.system}:${response.coordinates.position}`
                : null;

            // Zusätzliche Sicherheitsprüfung:
            // Wenn OGame Koordinaten zurückliefert, müssen sie zum gelockten Bericht passen.
            if (coords && State.currentCoords && coords !== State.currentCoords) {
                setMode(
                    'error',
                    `Sicherheitsstopp: Versandziel ${coords} ≠ Bericht ${State.currentCoords}`
                );
                return;
            }

            setMode(
                'delete',
                `Versand erfolgreich${coords ? ` (${coords})` : ''}`
            );
            return;
        }

        setMode(
            'error',
            response.message || 'Spionagesonden konnten nicht entsandt werden'
        );

        clearTimeout(State.lastErrorTimer);
        State.lastErrorTimer = setTimeout(() => {
            if (State.mode === 'error') {
                clearCurrentLock();
                setMode('scan');
                refreshTarget();
            }
        }, 2500);
    }

    // ------------------------------------------------------------
    // AJAX-Antwort des AGR/OGame-miniFleet-Aufrufs überwachen
    // ------------------------------------------------------------

    function patchAjax() {
        if (State.ajaxPatched) return true;
        if (!w.$ || typeof w.$.ajax !== 'function') return false;

        const originalAjax = w.$.ajax;

        w.$.ajax = function (...args) {
            let url = null;
            let options = null;

            if (typeof args[0] === 'string') {
                url = args[0];
                options = args[1] || {};
            } else {
                options = args[0] || {};
                url = options.url || null;
            }

            if (
                State.pendingSpyRequest &&
                url &&
                w.miniFleetLink &&
                String(url) === String(w.miniFleetLink)
            ) {
                const originalSuccess = options.success;

                const wrappedOptions = {
                    ...options,
                    success: function (data, textStatus, jqXHR) {
                        try {
                            handleSpyAjaxResponse(data);
                        } catch (err) {
                            console.error('[Spy One-Button] Response-Auswertung fehlgeschlagen', err);
                            State.pendingSpyRequest = false;
                            setMode('error', 'Antwort konnte nicht ausgewertet werden');
                        }

                        if (typeof originalSuccess === 'function') {
                            return originalSuccess.call(this, data, textStatus, jqXHR);
                        }
                    }
                };

                if (typeof args[0] === 'string') {
                    return originalAjax.call(this, args[0], wrappedOptions);
                }

                return originalAjax.call(this, wrappedOptions);
            }

            return originalAjax.apply(this, args);
        };

        State.ajaxPatched = true;
        console.log('[Spy One-Button] jQuery.ajax erfolgreich überwacht.');
        return true;
    }

    // ------------------------------------------------------------
    // Löschen mit ID + Koordinaten-Sicherheitsprüfung
    // ------------------------------------------------------------

    function deleteCurrentReport() {
        if (!State.currentRowId || !State.currentCoords) {
            clearCurrentLock();
            setMode('scan', 'Kein gesperrter Bericht vorhanden');
            refreshTarget();
            return;
        }

        const row = document.getElementById(State.currentRowId);

        if (!row) {
            clearCurrentLock();
            setMode('scan', 'Bericht bereits entfernt');
            refreshTarget();
            return;
        }

        const currentInfo = rowInfo(row);

        // Doppelte Absicherung:
        // 1. dieselbe eindeutige Row-ID
        // 2. dieselben Koordinaten wie beim Spionieren
        if (!currentInfo || currentInfo.id !== State.currentRowId) {
            setMode('error', 'Sicherheitsstopp: Bericht-ID stimmt nicht mehr');
            return;
        }

        if (currentInfo.coords !== State.currentCoords) {
            setMode(
                'error',
                `Sicherheitsstopp: Bericht zeigt jetzt ${currentInfo.coords} statt ${State.currentCoords}`
            );
            return;
        }

        const del = row.querySelector(CFG.deleteSelector);

        if (!del) {
            setMode('error', 'Löschen-Aktion nicht gefunden');
            return;
        }

        const oldRowId = State.currentRowId;

        const x = ui();
        x.button.disabled = true;
        x.icon.textContent = '⏳';
        x.label.textContent = 'WIRD GELÖSCHT';
        x.status.textContent = `Lösche sicher ${State.currentCoords} …`;
        x.skip.textContent = 'ID + Koordinaten geprüft';

        del.click();

        waitUntilRowGone(oldRowId);
    }

    function waitUntilRowGone(rowId) {
        if (State.deleteWatcher) {
            State.deleteWatcher.disconnect();
            State.deleteWatcher = null;
        }

        let done = false;

        const finish = () => {
            if (done) return;
            done = true;

            if (State.deleteWatcher) {
                State.deleteWatcher.disconnect();
                State.deleteWatcher = null;
            }

            clearCurrentLock();
            setMode('scan', 'Nächster geeigneter Bericht bereit');
            refreshTarget();
        };

        if (!document.getElementById(rowId)) {
            finish();
            return;
        }

        State.deleteWatcher = new MutationObserver(() => {
            if (!document.getElementById(rowId)) {
                finish();
            }
        });

        State.deleteWatcher.observe(document.body, {
            childList: true,
            subtree: true,
        });

        setTimeout(() => {
            if (done) return;

            if (!document.getElementById(rowId)) {
                finish();
            } else {
                State.deleteWatcher?.disconnect();
                State.deleteWatcher = null;
                setMode('delete', 'Bericht wurde noch nicht entfernt – erneut löschen');
            }
        }, CFG.deleteTimeoutMs);
    }

    function clearCurrentLock() {
        State.currentRowId = null;
        State.currentCoords = null;
        State.currentTarget = null;
        State.pendingSpyRequest = false;
    }

    // ------------------------------------------------------------
    // Start
    // ------------------------------------------------------------

    function init() {
        makeUi();

        const ajaxTimer = setInterval(() => {
            if (patchAjax()) {
                clearInterval(ajaxTimer);
            }
        }, CFG.ajaxPatchRetryMs);

        setInterval(refreshTarget, CFG.scanIntervalMs);
        refreshTarget();

        console.log('[Spy One-Button] v0.2.0 geladen. Mindestalter: 30 Minuten.');
    }

    init();
})();
