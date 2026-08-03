(() => {
  const BUCKET = "message_images";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let auth = null;
  let editing = null;
  let selectedFile = null;
  let objectUrl = null;

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
    const participantBadges = parsed.participants.length
      ? `<div class="moon-badges">${parsed.participants.map(name => `<span class="moon-badge">${esc(name)}</span>`).join("")}</div>`
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
      ${item.imageUrl ? `<img class="message-thumbnail" src="${esc(item.imageUrl)}" alt="Screenshot zum Mondversuch" data-image>` : ""}
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
    list.querySelectorAll("[data-image]").forEach(img => img.addEventListener("click", () => openImage(img.src)));
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
    await loadMessages();
  }, { once: true });
  $("#messageForm")?.addEventListener("submit", saveMessage);
  $("#cancelEdit")?.addEventListener("click", resetForm);
  $("#messageImage")?.addEventListener("change", event => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 5 * 1024 * 1024) { event.target.value = ""; return status("Das Bild darf höchstens 5 MB groß sein.", true); }
    selectedFile = file;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (file) { objectUrl = URL.createObjectURL(file); $("#imagePreview").src = objectUrl; $("#imagePreview").hidden = false; }
  });
  $("#closeImageModal")?.addEventListener("click", closeImage);
  $("#imageModal")?.addEventListener("click", event => { if (event.target === event.currentTarget) closeImage(); });
})();
