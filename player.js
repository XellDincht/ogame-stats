<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#07111f">
  <title>Mondversuch-Archiv · OGame</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="auth.css">
  <link rel="stylesheet" href="messages.css">
</head>
<body class="auth-protected">
  <header class="hero"><div class="hero-inner"><div><p class="eyebrow">Gemeinsamer Allianzbereich</p><h1>Mondversuch-Archiv</h1><p>OGame-Rundmails einfügen und automatisch übersichtlich archivieren.</p></div></div></header>
  <nav class="toolbar">
    <div class="range-tabs"><a class="nav-link" href="index.html">Allianzstatistik</a><a class="nav-link" href="player.html">Spieler-Historie</a><a class="nav-link" href="hall-of-fame.html">Hall of Fame</a><a class="nav-link" href="account.html">Accountdaten</a></div>
    <div class="auth-user-actions"><span id="authUserName" class="auth-user-name"></span><button class="auth-logout" data-auth-logout type="button">Abmelden</button></div>
  </nav>
  <main>
    <section class="panel">
      <div class="section-head"><div><h2 id="editorHeading">Mondversuch archivieren</h2><p class="muted">Die komplette OGame-Rundmail einfügen. Ein mitkopierter Screenshot wird automatisch erkannt; alternativ kann er mit Strg+V in dieses Feld eingefügt werden.</p></div></div>
      <form id="messageForm" class="message-editor">
        <textarea id="messageContent" required placeholder="Rundmail von&#10;Savio&#10;Von:&#10;Savio&#10;02.08.2026 21:53:32&#10;&#10;Mondversuch #10 Von 1.115.9 M (Savio) --> auf 1.120.4 (Xell). …"></textarea>
        <div class="message-editor-actions">
          <label class="nav-link">Screenshot auswählen<input id="messageImage" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><span id="pasteHint" class="message-paste-hint">Bild auch per Strg+V einfügbar</span>
          <button id="saveMessage" type="submit">Mondversuch speichern</button>
          <button id="cancelEdit" type="button" hidden>Bearbeiten abbrechen</button>
          <span id="messageStatus" class="muted"></span>
        </div>
        <img id="imagePreview" class="message-image-preview" alt="Screenshot-Vorschau" hidden>
      </form>
    </section>
    <section class="panel">
      <div class="section-head"><div><h2>Gespeicherte Mondversuche</h2><p class="muted">Neueste Einträge zuerst</p></div></div>
      <div id="messageList" class="message-list"><p class="muted">Nachrichten werden geladen …</p></div>
    </section>
  </main>
  <div id="imageModal" class="image-modal" hidden><button id="closeImageModal" type="button">Schließen</button><img id="modalImage" alt="Screenshot groß"></div>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="supabase-config.js"></script>
  <script src="auth.js"></script>
  <script src="messages.js"></script>
</body>
</html>
