(() => {
  const form = document.querySelector("#loginForm");
  const status = document.querySelector("#loginStatus");
  const button = document.querySelector("#loginButton");
  const next = new URLSearchParams(location.search).get("next") || "index.html";
  const safeNext = /^(?!https?:|\/\/)[a-zA-Z0-9._?=#&%/-]+$/.test(next) ? next : "index.html";

  async function redirectExistingSession() {
    const { data } = await window.ogameSupabase.auth.getSession();
    if (data.session) location.replace(safeNext);
  }

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    status.textContent = "";
    button.disabled = true;
    button.textContent = "Anmeldung läuft …";
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    const { error } = await window.ogameSupabase.auth.signInWithPassword({ email, password });
    if (error) {
      status.textContent = error.message === "Invalid login credentials"
        ? "E-Mail oder Passwort ist falsch."
        : `Anmeldung fehlgeschlagen: ${error.message}`;
      button.disabled = false;
      button.textContent = "Anmelden";
      return;
    }
    location.replace(safeNext);
  });

  redirectExistingSession();
})();
