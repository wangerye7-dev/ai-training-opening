const form = document.querySelector("#opening-form");
const optionList = document.querySelector("#option-list");
const toolList = document.querySelector("#tool-list");
const sentence = document.querySelector("#sentence");
const charCount = document.querySelector("#char-count");
const message = document.querySelector("#form-message");
const successCard = document.querySelector("#success-card");

function clientId() {
  let value = localStorage.getItem("ai-opening-client-id");
  if (!value) {
    value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("ai-opening-client-id", value);
  }
  return value;
}

async function init() {
  const response = await fetch("./api/config", { cache: "no-store" });
  const config = await response.json();
  optionList.innerHTML = config.options.map((option) => `
    <label class="premium-option" style="--option-color:${option.color}">
      <input type="radio" name="choice" value="${option.id}" />
      <span class="option-index">${option.index}</span>
      <span class="option-copy"><strong>${option.label}</strong><small>${option.caption}</small></span>
      <span class="option-check">✓</span>
    </label>`).join("");
  toolList.innerHTML = config.aiTools.map((tool) => `
    <label class="tool-chip">
      <input type="checkbox" name="tools" value="${tool.id}" />
      <span>${tool.label}</span>
    </label>`).join("");
}

sentence.addEventListener("input", () => { charCount.textContent = String(sentence.value.length); });

toolList.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;
  const checkboxes = [...toolList.querySelectorAll("input[type='checkbox']")];
  if (target.value === "none" && target.checked) {
    checkboxes.filter((item) => item !== target).forEach((item) => { item.checked = false; });
  } else if (target.checked) {
    const none = checkboxes.find((item) => item.value === "none");
    if (none) none.checked = false;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  const formData = new FormData(form);
  const choice = formData.get("choice");
  const tools = formData.getAll("tools");
  if (!choice) {
    message.textContent = "请先选择一个最想突破的场景";
    optionList.classList.add("attention");
    setTimeout(() => optionList.classList.remove("attention"), 600);
    return;
  }

  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  button.querySelector("span").textContent = "正在汇入现场……";

  try {
    const response = await fetch("./api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientId(), choice, tools, sentence: sentence.value })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || "提交失败");
    form.classList.add("hidden");
    successCard.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    message.textContent = error.message || "提交失败，请稍后重试";
    button.disabled = false;
    button.querySelector("span").textContent = "提交我的期待";
  }
});

init().catch(() => { message.textContent = "页面加载失败，请刷新后重试"; });
