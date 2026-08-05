const frame = document.querySelector("#accountOverviewFrame");

function applyOverviewHeight(height) {
  const value = Math.max(560, Math.ceil(Number(height) || 0));
  if (frame && value) frame.style.height = `${value}px`;
}

window.addEventListener("message", event => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type !== "ogame-dashboard-height") return;
  applyOverviewHeight(event.data.height);
});
