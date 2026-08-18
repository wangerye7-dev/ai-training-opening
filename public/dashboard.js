const totalCount = document.querySelector("#total-count");
const barList = document.querySelector("#bar-list");
const sentenceCloud = document.querySelector("#sentence-cloud");
const toolProfileList = document.querySelector("#tool-profile-list");
const qrImage = document.querySelector("#qr-image");
const formUrl = document.querySelector("#form-url");
const leaderCard = document.querySelector("#leader-card strong");
const resetButton = document.querySelector("#reset-button");
const exportButton = document.querySelector("#export-button");
let config;

function renderQr(url) {
  qrImage.innerHTML = "";
  formUrl.textContent = url;
  new QRCode(qrImage, {
    text: url,
    width: 260,
    height: 260,
    colorDark: "#07101f",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });
}

function escapeText(value) {
  const span = document.createElement("span");
  span.textContent = value;
  return span.innerHTML;
}

async function init() {
  const response = await fetch("./api/config", { cache: "no-store" });
  config = await response.json();
  renderQr(config.publicUrl);
  await refreshResults();
  setInterval(refreshResults, 1600);
}

async function refreshResults() {
  const response = await fetch(`./api/results?t=${Date.now()}`, { cache: "no-store" });
  const result = await response.json();
  totalCount.textContent = String(result.total);

  const ranked = [...config.options].sort((a, b) => (result.counts[b.id] || 0) - (result.counts[a.id] || 0));
  leaderCard.textContent = result.total > 0 ? ranked[0].label : "等待参与";

  barList.innerHTML = config.options.map((option) => {
    const count = result.counts[option.id] || 0;
    const percent = result.total === 0 ? 0 : Math.round((count / result.total) * 100);
    return `<div class="premium-bar" style="--bar-color:${option.color}">
      <div class="bar-heading"><span class="bar-number">${option.index}</span><strong>${option.label}</strong><small>${option.caption}</small><b>${count}</b><em>${percent}%</em></div>
      <div class="bar-rail"><i style="width:${percent}%"></i></div>
    </div>`;
  }).join("");

  const rankedTools = [...config.aiTools]
    .map((tool) => ({ ...tool, count: result.toolCounts?.[tool.id] || 0 }))
    .filter((tool) => tool.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
  toolProfileList.innerHTML = rankedTools.length
    ? rankedTools.map((tool, index) => `<span class="tool-rank rank-${index}"><strong>${escapeText(tool.label)}</strong><b>${tool.count}</b></span>`).join("")
    : '<p class="empty-state">等待选择……</p>';

  if (result.sentences.length === 0) {
    sentenceCloud.innerHTML = '<p class="empty-state">等待第一条现场声音……</p>';
  } else {
    sentenceCloud.innerHTML = result.sentences.map((value, index) => `<span class="voice-pill tone-${index % 4}">${escapeText(value)}</span>`).join("");
  }
}

function askAdminKey() {
  return window.prompt("请输入管理密码（部署时设置的 ADMIN_KEY）") || "";
}

resetButton.addEventListener("click", async () => {
  const key = askAdminKey();
  if (!key || !window.confirm("确定清空本场全部结果吗？此操作无法撤销。")) return;
  const response = await fetch("./api/reset", { method: "POST", headers: { "X-Admin-Key": key } });
  const result = await response.json();
  if (!response.ok) return window.alert(result.message || "清空失败");
  await refreshResults();
});

exportButton.addEventListener("click", async () => {
  const key = askAdminKey();
  if (!key) return;
  const response = await fetch("./api/export.csv", { headers: { "X-Admin-Key": key } });
  if (!response.ok) {
    const result = await response.json();
    return window.alert(result.message || "导出失败");
  }
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "AI培训开场互动结果.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});

init().catch((error) => { formUrl.textContent = `加载失败：${error.message}`; });
