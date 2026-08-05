const frame = document.querySelector("#accountOverviewFrame");

function applyOverviewHeight(height) {
  const measured = Math.ceil(Number(height) || 0);
  if (!frame || measured < 300) return;
  frame.style.height = `${measured}px`;
}

window.addEventListener("message", event => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type !== "ogame-dashboard-height") return;
  applyOverviewHeight(event.data.height);
});

frame?.addEventListener("load", () => {
  // Falls der erste postMessage vor dem Listener kam.
  window.setTimeout(() => {
    frame.contentWindow?.postMessage(
      { type: "ogame-dashboard-request-height" },
      window.location.origin
    );
  }, 100);
});
