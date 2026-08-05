(() => {
  const config = window.OGAME_SUPABASE;
  if (!config || !window.supabase?.createClient) {
    console.error("Supabase konnte nicht initialisiert werden.");
    document.documentElement.classList.add("auth-error");
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.ogameSupabase = client;

  const currentFile = () => location.pathname.split("/").pop() || "index.html";
  const isLoginPage = () => currentFile() === "login.html";
  const loginUrl = () => `login.html?next=${encodeURIComponent(currentFile() + location.search + location.hash)}`;

  async function getProfile(userId) {
    const { data, error } = await client
      .from("profiles")
      .select("id, display_name, role, ogame_name")
      .eq("id", userId)
      .maybeSingle();
    if (error) console.warn("Profil konnte nicht geladen werden:", error.message);
    return data || null;
  }

  async function requireSession() {
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) {
      if (!isLoginPage()) location.replace(loginUrl());
      return null;
    }
    const profile = await getProfile(data.session.user.id);
    window.ogameAuth = { session: data.session, user: data.session.user, profile };
    document.documentElement.classList.add("auth-ready");
    document.dispatchEvent(new CustomEvent("ogame-auth-ready", { detail: window.ogameAuth }));
    return window.ogameAuth;
  }

  async function logout() {
    await client.auth.signOut();
    location.replace("login.html");
  }

  function bindLogoutButtons() {
    document.querySelectorAll("[data-auth-logout]").forEach(button => {
      if (button.dataset.authBound) return;
      button.dataset.authBound = "1";
      button.addEventListener("click", logout);
    });
  }

  window.ogameAuthApi = { requireSession, logout, getProfile, client };

  document.addEventListener("DOMContentLoaded", async () => {
    if (isLoginPage()) return;
    bindLogoutButtons();
    await requireSession();
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" && !isLoginPage()) location.replace("login.html");
    if (event === "TOKEN_REFRESHED" && session) window.ogameAuth = { ...(window.ogameAuth || {}), session, user: session.user };
  });
})();
