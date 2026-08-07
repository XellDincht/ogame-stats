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
    if (document.querySelector(".site-shell")) {
      renderGlobalFooter();
      return;
    }
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
          <button type="button" class="site-logout" data-auth-logout title="Abmelden" aria-label="Abmelden">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 5H6.8A2.8 2.8 0 0 0 4 7.8v8.4A2.8 2.8 0 0 0 6.8 19H10"></path>
              <path d="M14 8l4 4-4 4"></path>
              <path d="M9 12h9"></path>
            </svg>
            <span class="site-logout-label">Abmelden</span>
          </button>
        </div>
      </div>`;
    document.body.prepend(nav);
    document.body.classList.add("has-site-shell");
    renderGlobalFooter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render, { once: true });
  } else {
    render();
  }

  function footerStatusText(legacyFooter) {
    if (!legacyFooter) return "Pro Incorporated · Astrid s282-de";
    const clone = legacyFooter.cloneNode(true);
    clone.querySelectorAll(".created-by-badge,.footer-divider,img").forEach(node => node.remove());
    const text = clone.textContent.replace(/\s+/g, " ").trim();
    return text || "Pro Incorporated · Astrid s282-de";
  }

  function renderGlobalFooter() {
    if (document.querySelector(".site-global-footer")) return;

    const legacyFooter = document.querySelector("footer#footer");
    if (legacyFooter) legacyFooter.classList.add("site-legacy-footer");

    const footer = document.createElement("footer");
    footer.className = "site-global-footer";
    footer.innerHTML = `
      <div class="site-global-footer-inner">
        <div class="site-global-footer-content">
          <span class="site-global-footer-status">${footerStatusText(legacyFooter)}</span>
          <span class="site-global-footer-divider" aria-hidden="true"></span>
          <span class="site-global-footer-created">
            <span>Created by</span>
            <img src="assets/created-by-xd13.png" alt="XD13">
          </span>
        </div>
      </div>`;

    document.body.append(footer);

    if (legacyFooter) {
      const status = footer.querySelector(".site-global-footer-status");
      const syncStatus = () => {
        status.textContent = footerStatusText(legacyFooter);
      };
      const observer = new MutationObserver(syncStatus);
      observer.observe(legacyFooter, {
        childList: true,
        subtree: true,
        characterData: true
      });
      syncStatus();
    }
  }

// === horizontal wheel scrolling for wide data tables ===
function bindSmartWheelScroll(){
  const selectors = [".table-wrap", ".member-table-wrap", ".history-table-wrap"];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (el.dataset.smartWheelBound === "1") return;
      el.dataset.smartWheelBound = "1";
      el.addEventListener("wheel", (event) => {
        const canScrollX = el.scrollWidth > el.clientWidth + 8;
        if (!canScrollX || event.ctrlKey) return;
        const mostlyVertical = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
        if (!mostlyVertical) return;
        el.scrollLeft += event.deltaY;
        event.preventDefault();
      }, { passive: false });
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindSmartWheelScroll, { once: true });
} else {
  bindSmartWheelScroll();
}

})();
