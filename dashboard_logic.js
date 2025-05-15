// dashboard_logic.js

const moduleMap = {
  workstyle: [16, 17, 18],
  team: [1, 2, 3],
  execution: [6, 7, 8],
  creativity: [11, 12, 13],
  awareness: [21, 22, 23]
};

const moduleOrder = ["workstyle", "team", "execution", "creativity", "awareness"];
const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

// 載入敘述模組
async function loadModuleDescription(module, level, targetId) {
  try {
    const res = await fetch(`${module}.html`);
    const html = await res.text();
    const block = new DOMParser().parseFromString(html, "text/html").querySelector(`#${module}-${level}`);
    document.getElementById(targetId).innerHTML = block?.innerHTML || "❗ 尚未提供敘述內容";
  } catch {
    document.getElementById(targetId).innerHTML = "❗ 無法載入敘述檔案";
  }
}

async function loadAwarenessCombo(level, high, low) {
  try {
    const filename = `self_awareness_${level}_${high}_${low}.html`;
    const res = await fetch(filename);
    const html = await res.text();
    document.getElementById("awarenessContent").innerHTML = html;
  } catch {
    document.getElementById("awarenessContent").innerHTML = "❗ 無法載入自覺組合敘述檔案";
  }
}

async function loadUserData(selectedName) {
  const headers = {
    apikey: "your-api-key", // ✅ 替換為你的實際 key
    Authorization: "Bearer your-api-key"
  };

  const selectedDate = document.getElementById("dateSelector").value;
  if (!selectedDate || !selectedName) return;

  const url = `https://wnbvamrjoydduriwaetd.supabase.co/rest/v1/results?name=eq.${selectedName}&date=eq.${selectedDate}`;
  const res = await fetch(url, { headers });
  const data = await res.json();
  if (!data.length) return;

  const scores = data[0].scores;
  const result = Object.entries(moduleMap).map(([key, idxs]) => ({
    key, value: avg(idxs.map(i => scores[i]))
  }));

  result.sort((a, b) => b.value - a.value || moduleOrder.indexOf(a.key) - moduleOrder.indexOf(b.key));
  const [high, second] = [result[0].key, result[1].key];
  const low = result[result.length - 1].key;

  const awarenessAvg = avg(moduleMap.awareness.map(i => scores[i]));
  const level = awarenessAvg >= 4.5 ? "high" : awarenessAvg >= 3.5 ? "mid" : "low";

  const ctx = document.getElementById("radarChart").getContext("2d");
  if (window.radarChartInstance) window.radarChartInstance.destroy();
  window.radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: moduleOrder,
      datasets: [{
        label: selectedName,
        data: result.map(r => r.value),
        backgroundColor: "rgba(69,123,157,0.2)",
        borderColor: "#457b9d"
      }]
    },
    options: { scales: { r: { min: 1, max: 6 } } }
  });

  await loadModuleDescription(high, "high", "highContent");
  await loadModuleDescription(second, "second", "midContent");
  await loadModuleDescription(low, "low", "lowContent");
  await loadAwarenessCombo(level, high, low);
}

// 下拉姓名選單邏輯（依據日期）
document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("dateSelector");
  const userSelect = document.getElementById("userSelector");

  if (!dateInput || !userSelect) return;

  dateInput.addEventListener("change", async () => {
    const selectedDate = dateInput.value;
    userSelect.innerHTML = `<option>載入中...</option>`;
    userSelect.disabled = true;

    const role = localStorage.getItem("role");
    const dept = localStorage.getItem("department");

    const headers = {
      apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYnZhbXJqb3lkZHVyaXdhZXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODQ4MjEsImV4cCI6MjA2MTc2MDgyMX0.AT_f5N-Kctcbkns47PyYurHxP9Z2ktRtbGgpyaMe4Oc", // ✅ 替換為你的實際 key
      Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYnZhbXJqb3lkZHVyaXdhZXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODQ4MjEsImV4cCI6MjA2MTc2MDgyMX0.AT_f5N-Kctcbkns47PyYurHxP9Z2ktRtbGgpyaMe4Oc"
    };

    const url = `https://wnbvamrjoydduriwaetd.supabase.co/rest/v1/results?select=name,department,date&date=eq.${selectedDate}`;
    const res = await fetch(url, { headers });
    const data = await res.json();

    let filtered = data;
    if (role === "manager") filtered = data.filter(d => d.department === dept);

    const names = [...new Set(filtered.map(d => d.name))].sort();
    userSelect.innerHTML = `<option disabled selected>請選擇姓名</option>`;
    names.forEach(n => {
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      userSelect.appendChild(opt);
    });
    userSelect.disabled = false;
  });

  userSelect.addEventListener("change", () => {
    const selected = userSelect.value;
    if (selected) loadUserData(selected);
  });
});
