(() => {
  const BUCKET = "message_images";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let auth = null;
  let editing = null;
  let selectedFile = null;
  let objectUrl = null;
  let playerAliasMap = new Map();

  function status(text, error = false) {
    const node = $("#messageStatus");
    node.textContent = text;
    node.classList.toggle("negative", error);
  }

  function displayName() {
    return auth?.profile?.ogame_name || auth?.profile?.display_name || auth?.user?.email || "Unbekannt";
  }

  function normalizePlayerName(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }


  function playerKey(value) {
    return normalizePlayerName(value).toLocaleLowerCase("de-DE");
  }

  function resolvePlayerName(value) {
    const normalized = normalizePlayerName(value);
    return playerAliasMap.get(playerKey(normalized)) || normalized;
  }

  async function loadPlayers() {
    const { data, error } = await window.ogameSupabase
      .from("players")
      .select("display_name, aliases");

    if (error) {
      console.warn("Spieler-Aliase konnten nicht geladen werden:", error.message);
      playerAliasMap = new Map();
      return;
    }

    const nextMap = new Map();
    for (const player of data || []) {
      const display = normalizePlayerName(player.display_name);
      if (!display) continue;

      // Auch der Anzeigename selbst gilt automatisch als Alias.
      const aliases = [display, ...(Array.isArray(player.aliases) ? player.aliases : [])];
      for (const alias of aliases) {
        const key = playerKey(alias);
        if (key) nextMap.set(key, display);
      }
    }
    playerAliasMap = nextMap;
  }

  function parseMoonAttempt(rawText) {
    const raw = String(rawText || "").replace(/\r/g, "").trim();
    const lines = raw.split("\n").map(line => line.trim()).filter(Boolean);

    const titleMatch = raw.match(/Mondversuch\s*#\s*(\d+)/i);
    const dateMatch = raw.match(/(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2}:\d{2})/);
    const routeMatch = raw.match(/Von\s+([0-9]+[.:][0-9]+[.:][0-9]+)(?:\s+M)?\s*\(([^)]+)\)\s*-+>\s*auf\s+([0-9]+[.:][0-9]+[.:][0-9]+)(?:\s+M)?\s*\(([^)]+)\)/i);
    const senderMatch = raw.match(/Rundmail\s+von\s*\n\s*([^\n]+)/i) || raw.match(/Von:\s*\n\s*([^\n]+)/i);

    let info = raw;
    if (titleMatch) {
      const titleIndex = raw.search(/Mondversuch\s*#\s*\d+/i);
      if (titleIndex >= 0) info = raw.slice(titleIndex);
    }
    if (routeMatch) {
      const routeText = routeMatch[0];
      const routeIndex = info.indexOf(routeText);
      if (routeIndex >= 0) info = info.slice(routeIndex + routeText.length);
    }
    info = info.replace(/^\s*[.\-–—:]+\s*/, "").trim();

    const sender = normalizePlayerName(routeMatch?.[2] || senderMatch?.[1]);
    const receiver = normalizePlayerName(routeMatch?.[4]);
    const participants = [...new Set([sender, receiver].filter(Boolean))];

    return {
      isMoonAttempt: Boolean(titleMatch),
      title: titleMatch ? `Mondversuch #${titleMatch[1]}` : "Mondversuch",
      number: titleMatch?.[1] || null,
      date: dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : null,
      sourceCoords: routeMatch?.[1]?.replace(/\./g, ":") || null,
      targetCoords: routeMatch?.[3]?.replace(/\./g, ":") || null,
      sender,
      receiver,
      participants,
      info: info || lines.at(-1) || raw,
      raw
    };
  }

  function setSelectedImage(file, sourceLabel = "Screenshot") {
    if (!file) return false;
    if (!file.type?.startsWith("image/")) {
      status("Aus der Zwischenablage wurde keine Bilddatei erkannt.", true);
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      status("Das Bild darf höchstens 5 MB groß sein.", true);
      return false;
    }
    selectedFile = file;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    $("#imagePreview").src = objectUrl;
    $("#imagePreview").hidden = false;
    status(`${sourceLabel} erkannt und zum Upload vorgemerkt.`);
    return true;
  }

  function clipboardImageFile(event) {
    const data = event.clipboardData;
    if (!data) return null;

    // Variante 1: Clipboard-Items (Chrome/Edge, Snipping Tool, Bildbearbeitung)
    for (const item of [...(data.items || [])]) {
      if (item.kind !== "file") continue;
      const blob = item.getAsFile();
      if (!blob) continue;
      const type = blob.type || item.type || "image/png";
      if (!type.startsWith("image/")) continue;
      const extension = type === "image/webp" ? "webp" : type === "image/jpeg" ? "jpg" : "png";
      return new File([blob], `screenshot-${Date.now()}.${extension}`, {
        type,
        lastModified: Date.now()
      });
    }

    // Variante 2: Clipboard-Files (wird von manchen Windows-Quellen verwendet)
    for (const file of [...(data.files || [])]) {
      const type = file.type || "image/png";
      if (!type.startsWith("image/")) continue;
      const extension = type === "image/webp" ? "webp" : type === "image/jpeg" ? "jpg" : "png";
      return new File([file], file.name || `screenshot-${Date.now()}.${extension}`, {
        type,
        lastModified: file.lastModified || Date.now()
      });
    }

    return null;
  }

  function handleClipboardImage(event) {
    const file = clipboardImageFile(event);
    if (!file) {
      console.debug("[Mondarchiv] Kein Bild im Paste-Event erkannt", {
        itemTypes: [...(event.clipboardData?.items || [])].map(item => ({ kind: item.kind, type: item.type })),
        files: [...(event.clipboardData?.files || [])].map(file => ({ name: file.name, type: file.type, size: file.size }))
      });
      return;
    }

    setSelectedImage(file, "Screenshot aus der Zwischenablage");
    // Vorhandener Text darf parallel weiterhin normal eingefügt werden.
  }

  function resetForm() {
    editing = null;
    selectedFile = null;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    $("#messageForm").reset();
    $("#imagePreview").hidden = true;
    $("#editorHeading").textContent = "Mondversuch archivieren";
    $("#saveMessage").textContent = "Mondversuch speichern";
    $("#cancelEdit").hidden = true;
    status("");
  }

  async function signedImageUrl(path) {
    if (!path) return null;
    const { data, error } = await window.ogameSupabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) { console.warn("Bild-URL fehlgeschlagen:", error.message); return null; }
    return data.signedUrl;
  }

  async function loadProfileNames(authorIds) {
    const uniqueIds = [...new Set(authorIds.filter(Boolean))];
    if (!uniqueIds.length) return new Map();
    const { data, error } = await window.ogameSupabase
      .from("profiles")
      .select("id, display_name, ogame_name")
      .in("id", uniqueIds);
    if (error) {
      console.warn("Profilnamen konnten nicht geladen werden:", error.message);
      return new Map();
    }
    return new Map((data || []).map(profile => [profile.id, profile.ogame_name || profile.display_name]));
  }

  function renderMessageCard(item, profileNames) {
    const parsed = parseMoonAttempt(item.content);
    const own = item.author_id === auth.user.id;
    const admin = auth.profile?.role === "admin";
    const canChange = own || admin;
    const archiveAuthor = profileNames.get(item.author_id) || item.author_name || "Unbekannt";
    const dateLabel = parsed.date || new Date(item.created_at).toLocaleString("de-DE");
    const route = parsed.sourceCoords && parsed.targetCoords
      ? `<div class="moon-route"><span>${esc(parsed.sourceCoords)}</span><b aria-hidden="true">→</b><span>${esc(parsed.targetCoords)}</span></div>`
      : "";
    const resolvedParticipants = [...new Set(parsed.participants.map(resolvePlayerName).filter(Boolean))];
    const participantBadges = resolvedParticipants.length
      ? `<div class="moon-badges">${resolvedParticipants.map(name => `<span class="moon-badge">${esc(name)}</span>`).join("")}</div>`
      : "";

    return `<article class="panel message-card moon-card" data-id="${esc(item.id)}">
      <div class="moon-card-top">
        <div>
          <div class="moon-kicker">Mondversuch-Archiv</div>
          <h3>${esc(parsed.title || item.title || "Mondversuch")}</h3>
        </div>
        ${canChange ? `<div class="message-actions"><button type="button" data-edit>Bearbeiten</button><button type="button" data-delete>Löschen</button></div>` : ""}
      </div>
      <div class="moon-summary">
        <div class="moon-summary-item"><span>Zeitpunkt</span><strong>${esc(dateLabel)}</strong></div>
        ${route ? `<div class="moon-summary-item"><span>Route</span>${route}</div>` : ""}
        ${participantBadges ? `<div class="moon-summary-item"><span>Beteiligte</span>${participantBadges}</div>` : ""}
      </div>
      <div class="moon-info"><span>Info</span><p>${esc(parsed.info)}</p></div>
      ${item.imageUrl ? `<button class="message-screenshot-button" type="button" data-image data-image-url="${esc(item.imageUrl)}" aria-label="Screenshot öffnen" title="Screenshot öffnen"><span aria-hidden="true">▣</span><span>Screenshot</span></button>` : ""}
      <div class="message-meta">Archiviert von <strong>${esc(archiveAuthor)}</strong> · ${new Date(item.created_at).toLocaleString("de-DE")}${item.updated_at ? " · bearbeitet" : ""}</div>
    </article>`;
  }

  async function loadMessages() {
    const list = $("#messageList");
    const { data, error } = await window.ogameSupabase
      .from("alliance_messages")
      .select("id, created_at, title, content, author_id, author_name, image_path, updated_at")
      .order("created_at", { ascending: false });
    if (error) {
      list.innerHTML = `<p class="negative">Nachrichten konnten nicht geladen werden: ${esc(error.message)}</p>`;
      return;
    }
    if (!data?.length) {
      list.innerHTML = '<p class="message-empty muted">Noch keine Mondversuche gespeichert.</p>';
      return;
    }
    const profileNames = await loadProfileNames(data.map(item => item.author_id));
    const withUrls = await Promise.all(data.map(async item => ({ ...item, imageUrl: await signedImageUrl(item.image_path) })));
    list.innerHTML = withUrls.map(item => renderMessageCard(item, profileNames)).join("");
    list.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => beginEdit(withUrls.find(x => x.id === button.closest("[data-id]").dataset.id))));
    list.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => deleteMessage(withUrls.find(x => x.id === button.closest("[data-id]").dataset.id))));
    list.querySelectorAll("[data-image]").forEach(button => button.addEventListener("click", () => openImage(button.dataset.imageUrl)));
  }

  function beginEdit(item) {
    editing = item;
    $("#messageContent").value = item.content || "";
    $("#editorHeading").textContent = "Mondversuch bearbeiten";
    $("#saveMessage").textContent = "Änderungen speichern";
    $("#cancelEdit").hidden = false;
    if (item.imageUrl) { $("#imagePreview").src = item.imageUrl; $("#imagePreview").hidden = false; }
    scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadImage(messageId) {
    if (!selectedFile) return editing?.image_path || null;
    const ext = (selectedFile.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${auth.user.id}/${messageId}/${Date.now()}.${ext}`;
    const { error } = await window.ogameSupabase.storage.from(BUCKET).upload(path, selectedFile, { upsert: false, contentType: selectedFile.type });
    if (error) throw error;
    if (editing?.image_path) await window.ogameSupabase.storage.from(BUCKET).remove([editing.image_path]);
    return path;
  }

  async function saveMessage(event) {
    event.preventDefault();
    const content = $("#messageContent").value.trim();
    if (!content) return status("Bitte die kopierte OGame-Rundmail einfügen.", true);
    const parsed = parseMoonAttempt(content);
    if (!parsed.isMoonAttempt) return status("Es konnte keine Angabe wie „Mondversuch #10“ erkannt werden.", true);
    const button = $("#saveMessage");
    button.disabled = true;
    status("Wird gespeichert …");
    try {
      const id = editing?.id || crypto.randomUUID();
      const imagePath = await uploadImage(id);
      const payload = { title: parsed.title, content, image_path: imagePath, updated_at: editing ? new Date().toISOString() : null };
      let result;
      if (editing) {
        result = await window.ogameSupabase.from("alliance_messages").update(payload).eq("id", id);
      } else {
        result = await window.ogameSupabase.from("alliance_messages").insert({
          id, ...payload, author_id: auth.user.id, author_name: displayName(), created_at: new Date().toISOString()
        });
      }
      if (result.error) throw result.error;
      resetForm();
      await loadMessages();
    } catch (error) {
      status(`Speichern fehlgeschlagen: ${error.message}`, true);
    } finally { button.disabled = false; }
  }

  async function deleteMessage(item) {
    if (!confirm(`„${item.title || "Mondversuch"}“ wirklich löschen?`)) return;
    const { error } = await window.ogameSupabase.from("alliance_messages").delete().eq("id", item.id);
    if (error) return alert(`Löschen fehlgeschlagen: ${error.message}`);
    if (item.image_path) await window.ogameSupabase.storage.from(BUCKET).remove([item.image_path]);
    await loadMessages();
  }

  function openImage(src) { $("#modalImage").src = src; $("#imageModal").hidden = false; }
  function closeImage() { $("#imageModal").hidden = true; $("#modalImage").src = ""; }

  document.addEventListener("ogame-auth-ready", async event => {
    auth = event.detail;
    $("#authUserName").textContent = displayName();
    await loadPlayers();
    await loadMessages();
  }, { once: true });
  $("#messageForm")?.addEventListener("submit", saveMessage);
  $("#cancelEdit")?.addEventListener("click", resetForm);
  $("#messageImage")?.addEventListener("change", event => {
    const file = event.target.files?.[0] || null;
    if (!setSelectedImage(file, "Screenshot")) event.target.value = "";
  });
  $("#messageContent")?.addEventListener("paste", handleClipboardImage);
  // Zusätzlich global lauschen: Manche Browser liefern Screenshots nicht direkt am Textfeld.
  document.addEventListener("paste", event => {
    if (event.target === $("#messageContent")) return;
    handleClipboardImage(event);
  });
  $("#closeImageModal")?.addEventListener("click", closeImage);
  $("#imageModal")?.addEventListener("click", event => { if (event.target === event.currentTarget) closeImage(); });
})();
