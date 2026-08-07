(() => {
  const pages = [
    { file: "index.html", label: "Allianz", key: "index" },
    { file: "player.html", label: "Spieler-Historie", key: "player" },
    { file: "hall-of-fame.html", label: "Hall of Fame", key: "hall-of-fame" },
    { file: "messages.html", label: "Mondversuche", key: "messages" },
    { file: "account.html", label: "Imperium", key: "account" }
  ];

  function currentKey() {
    const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const found = pages.find(p => p.file === file);
    return found?.key || "index";
  }

  function render() {
    if (document.querySelector(".site-shell")) return;
    const current = currentKey();
    const nav = document.createElement("header");
    nav.className = "site-shell";
    nav.innerHTML = `
      <div class="site-shell-inner">
        <a class="site-brand" href="index.html" aria-label="Zur Allianzseite">
          <img src="ally/Ally_main.png" alt="" class="site-brand-logo">
          <span class="site-brand-copy">
            <strong>Pro Incorporated</strong>
            <small>OGame · Astrid s282-de</small>
          </span>
        </a>
        <nav class="site-nav" aria-label="Hauptnavigation">
          ${pages.map(page => `
            <a class="site-nav-link ${page.key === current ? "active" : ""}"
               href="${page.file}"
               ${page.key === current ? 'aria-current="page"' : ""}>
              ${page.label}
            </a>`).join("")}
        </nav>
        <div class="site-session">
          <span id="authUserName" class="site-user"></span>
          <button type="button" class="site-logout" data-auth-logout title="Abmelden" aria-label="Abmelden">↪</button>
        </div>
      </div>`;
    document.body.prepend(nav);
    document.body.classList.add("has-site-shell");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render, { once: true });
  } else {
    render();
  }
})();
