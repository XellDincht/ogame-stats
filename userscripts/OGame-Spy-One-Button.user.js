// ==UserScript==
// @name         OGame Spy One-Button
// @namespace    ogame-spy-one-button
// @version      0.1.0
// @description  Großer Ein-Knopf-Workflow für AGR-Spionageberichte: Spionieren -> bei Erfolg Löschen -> nächster Bericht.
// @match        https://*.ogame.gameforge.com/game/index.php*
// @grant        unsafeWindow
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/XellDincht/ogame-stats/main/userscripts/OGame-Spy-One-Button.user.js
// @downloadURL  https://raw.githubusercontent.com/XellDincht/ogame-stats/main/userscripts/OGame-Spy-One-Button.user.js
// ==/UserScript==

(function () {
    'use strict';

    const w = unsafeWindow;
    const CFG = {
        rowSelector: 'tr.row[id^="m_"]',
        eyeSelector: '.spyTableIcon.icon_eye',
        deleteSelector: '.spyTableIcon.icon_delete',
        scanIntervalMs: 500,
        deleteTimeoutMs: 6000,
        ajaxPatchRetryMs: 500,
    };

    const State = {
        mode: 'scan', // scan | waiting | delete | error
        currentRowId: null,
        currentTarget: null,
        ajaxPatched: false,
        pendingSpyRequest: false,
        deleteWatcher: null,
        lastErrorTimer: null,
    };

    function firstSpyRow() {
        const eyes = document.querySelectorAll(CFG.eyeSelector);
        for (const eye of eyes) {
            const row = eye.closest(CFG.rowSelector);
            if (row && row.querySelector(CFG.deleteSelector)) return row;
        }
        return null;
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
        };
    }

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
        `;

        const style = document.createElement('style');
        style.textContent = `
            #ogame-spy-onebutton {
                position: fixed;
                right: 24px;
                top: 50%;
                transform: translateY(-50%);
                width: 245px;
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
                min-height: 34px;
                margin-bottom: 10px;
                text-align: center;
                line-height: 17px;
                font-size: 13px;
                color: #a9c8e8;
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
                opacity: .76;
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
            x.button.disabled = !firstSpyRow();
            x.status.textContent = statusText || 'Ersten Bericht nachspionieren';
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
            x.status.textContent = statusText || 'Versand fehlgeschlagen';
        }
    }

    function refreshTarget() {
        makeUi();

        const x = ui();
        const row = firstSpyRow();

        // Die Box nur dort zeigen, wo AGR-Spionageaktionen vorhanden sind.
        x.box.style.display = row ? 'block' : 'none';

        if (!row) {
            State.currentRowId = null;
            State.currentTarget = null;
            return;
        }

        // Während "waiting" oder "delete" bleibt die Anzeige auf dem Bericht,
        // für den tatsächlich spioniert wurde.
        if (State.mode === 'waiting' || State.mode === 'delete') return;

        const info = rowInfo(row);
        State.currentRowId = info.id;
        State.currentTarget = info;

        x.target.innerHTML = `<strong>${escapeHtml(info.coords)}</strong><br>${escapeHtml(info.player)}`;

        if (State.mode === 'scan') {
            x.button.disabled = false;
        }
    }

    function escapeHtml(s) {
        return String(s)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function handleMainClick() {
        if (State.mode === 'scan' || State.mode === 'error') {
            startSpy();
        } else if (State.mode === 'delete') {
            deleteCurrentReport();
        }
    }

    function startSpy() {
        const row = firstSpyRow();
        if (!row) {
            setMode('scan', 'Kein Spionagebericht gefunden');
            return;
        }

        const eye = row.querySelector(CFG.eyeSelector);
        if (!eye) {
            setMode('error', 'AGR-Spionageaktion nicht gefunden');
            return;
        }

        const info = rowInfo(row);
        State.currentRowId = info.id;
        State.currentTarget = info;

        const x = ui();
        x.target.innerHTML = `<strong>${escapeHtml(info.coords)}</strong><br>${escapeHtml(info.player)}`;

        State.pendingSpyRequest = true;
        setMode('waiting');

        // Wichtig: Wir klicken AGRs vorhandene Aktion.
        // AGR selbst ruft sendShipsWithPopup(...) auf.
        eye.click();

        // Falls kein AJAX-Call kommt, nicht ewig hängenbleiben.
        window.setTimeout(() => {
            if (State.mode === 'waiting' && State.pendingSpyRequest) {
                State.pendingSpyRequest = false;
                setMode('error', 'Keine Versandantwort erkannt');
            }
        }, 7000);
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
                ? ` (${response.coordinates.galaxy}:${response.coordinates.system}:${response.coordinates.position})`
                : '';

            setMode('delete', `Versand erfolgreich${coords}`);
            return;
        }

        setMode('error', response.message || 'Spionagesonden konnten nicht entsandt werden');

        clearTimeout(State.lastErrorTimer);
        State.lastErrorTimer = setTimeout(() => {
            if (State.mode === 'error') setMode('scan');
        }, 2500);
    }

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

            // Nur den nächsten von unserem Button ausgelösten miniFleet-Request beobachten.
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

    function deleteCurrentReport() {
        if (!State.currentRowId) {
            setMode('scan');
            refreshTarget();
            return;
        }

        const row = document.getElementById(State.currentRowId);

        // Sicherheit: Es wird exakt der Bericht gelöscht, für den zuvor
        // der erfolgreiche Spionageversand bestätigt wurde.
        if (!row) {
            setMode('scan', 'Bericht bereits entfernt');
            refreshTarget();
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
        x.status.textContent = 'Warte auf AGR …';

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

            State.currentRowId = null;
            State.currentTarget = null;
            setMode('scan', 'Nächster Bericht bereit');
            refreshTarget();
        };

        if (!document.getElementById(rowId)) {
            finish();
            return;
        }

        State.deleteWatcher = new MutationObserver(() => {
            if (!document.getElementById(rowId)) finish();
        });

        State.deleteWatcher.observe(document.body, {
            childList: true,
            subtree: true
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

    function init() {
        makeUi();

        const ajaxTimer = setInterval(() => {
            if (patchAjax()) clearInterval(ajaxTimer);
        }, CFG.ajaxPatchRetryMs);

        setInterval(refreshTarget, CFG.scanIntervalMs);
        refreshTarget();

        console.log('[Spy One-Button] v0.1.0 geladen.');
    }

    init();
})();
