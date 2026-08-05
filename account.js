const frame = document.querySelector("#accountOverviewFrame");

function applyOverviewHeight(height) {
  const viewportMinimum = Math.max(620, window.innerHeight - 58);
  const measured = Math.ceil(Number(height) || 0);
  const value = Math.max(viewportMinimum, measured);

  if (frame && value) {
    frame.style.height = `${value}px`;
  }
}

window.addEventListener("message", event => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type !== "ogame-dashboard-height") return;
  applyOverviewHeight(event.data.height);
});

window.addEventListener("resize", () => {
  const current = parseFloat(frame?.style.height || "0");
  applyOverviewHeight(current);
});
