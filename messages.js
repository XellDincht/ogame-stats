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
    return auth?.profile?.display_name || auth?.profile?.ogame_name || auth?.user?.email || "Unbekannt";
  }

  function resetForm() {
    editing = null;
    selectedFile = null;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    $("#messageForm").reset();
    $("#imagePreview").hidden = true;
    $("#editorHeading").textContent = "Neue Nachricht";
    $("#saveMessage").textContent = "Nachricht speichern";
    $("#cancelEdit").hidden = true;
    status("");
  }

  async function signedImageUrl(path) {
    if (!path) return null;
    const { data, error } = await window.ogameSupabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) { console.warn("Bild-URL fehlgeschlagen:", error.message); return null; }
    return data.signedUrl;
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
      list.innerHTML = '<p class="message-empty muted">Noch keine Nachrichten gespeichert.</p>';
      return;
    }
    const withUrls = await Promise.all(data.map(async item => ({ ...item, imageUrl: await signedImageUrl(item.image_path) })));
    list.innerHTML = withUrls.map(item => {
      const own = item.author_id === auth.user.id;
      const admin = auth.profile?.role === "admin";
      const canChange = own || admin;
      return `<article class="panel message-card" data-id="${esc(item.id)}">
        <div class="message-card-head"><div><h3>${esc(item.title || "Ohne Titel")}</h3><p class="message-meta">${esc(item.author_name || "Unbekannt")} · ${new Date(item.created_at).toLocaleString("de-DE")}${item.updated_at ? " · bearbeitet" : ""}</p></div>
        ${canChange ? `<div class="message-actions"><button type="button" data-edit>Bearbeiten</button><button type="button" data-delete>Löschen</button></div>` : ""}</div>
        <p class="message-content">${esc(item.content)}</p>
        ${item.imageUrl ? `<img class="message-thumbnail" src="${esc(item.imageUrl)}" alt="Nachrichten-Screenshot" data-image>` : ""}
      </article>`;
    }).join("");
    list.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => beginEdit(withUrls.find(x => x.id === button.closest("[data-id]").dataset.id))));
    list.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => deleteMessage(withUrls.find(x => x.id === button.closest("[data-id]").dataset.id))));
    list.querySelectorAll("[data-image]").forEach(img => img.addEventListener("click", () => openImage(img.src)));
  }

  function beginEdit(item) {
    editing = item;
    $("#messageTitle").value = item.title || "";
    $("#messageContent").value = item.content || "";
    $("#editorHeading").textContent = "Nachricht bearbeiten";
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
    const title = $("#messageTitle").value.trim() || null;
    const content = $("#messageContent").value.trim();
    if (!content) return status("Bitte einen Nachrichtentext eingeben.", true);
    const button = $("#saveMessage");
    button.disabled = true;
    status("Wird gespeichert …");
    try {
      const id = editing?.id || crypto.randomUUID();
      const imagePath = await uploadImage(id);
      const payload = { title, content, image_path: imagePath, updated_at: editing ? new Date().toISOString() : null };
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
    if (!confirm(`Nachricht „${item.title || "Ohne Titel"}“ wirklich löschen?`)) return;
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
