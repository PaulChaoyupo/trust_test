// dashboard_logic.js

// 模組與題目索引對照
const moduleMap = {
  workstyle: [16, 17, 18],
  team: [1, 2, 3],
  execution: [6, 7, 8],
  creativity: [11, 12, 13],
  awareness: [21, 22, 23]
};

const moduleOrder = ["workstyle", "team", "execution", "creativity", "awareness"];

// 平均值計算
const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

// 載入模組敘述檔案區段
async function loadModuleDescription(module, level, targetId) {
  try {
    const res = await fetch(`${module}.html`);
    const html = await res.text();
    const block = new DOMParser().parseFromString(html, "text/html").querySelector(`#${module}-${level}`);
    if (block) {
      document.getElementById(targetId).innerHTML = block.innerHTML;
    } else {
      document.getElementById(targetId).innerHTML = "❗ 尚未提供敘述內容";
    }
  } catch (err) {
    document.getElementById(targetId).innerHTML = "❗ 無法載入敘述檔案";
  }
}

// 載入自覺敘述組合檔
async function loadAwarenessCombo(level, high, low) {
  const filename = `self_awareness_${level}_${high}_${low}.html`;
  try {
    const res = await fetch(filename);
    const html = await res.text();
    document.getElementById("awarenessContent").innerHTML = html;
  } catch (err) {
    document.getElementById("awarenessContent").innerHTML = "❗ 無法載入自覺組合敘述檔案";
  }
}

// 使用者選擇後觸發主邏輯
async function loadUserData(selectedName) {
  const headers = {
    apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYnZhbXJqb3lkZHVyaXdhZXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODQ4MjEsImV4cCI6MjA2MTc2MDgyMX0.AT_f5N-Kctcbkns47PyYurHxP9Z2ktRtbGgpyaMe4Oc",
    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYnZhbXJqb3lkZHVyaXdhZXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODQ4MjEsImV4cCI6MjA2MTc2MDgyMX0.AT_f5N-Kctcbkns47PyYurHxP9Z2ktRtbGgpyaMe4Oc"
  };

  const res = await fetch(`https://wnbvamrjoydduriwaetd.supabase.co/rest/v1/results?name=eq.${selectedName}`, { headers });
  const data = await res.json();
  if (!data.length) return;
  const scores = data[0].scores;

  // 建立模組分數清單
  const result = Object.entries(moduleMap).map(([mod, idxs]) => {
    return { key: mod, value: avg(idxs.map(i => scores[i])) };
  });

  // 排序，並穩定同分順序
  result.sort((a, b) => b.value - a.value || moduleOrder.indexOf(a.key) - moduleOrder.indexOf(b.key));

  const high = result[0].key;
  const second = result[1].key;
  const low = result[result.length - 1].key;

  // 自覺分數平均
  const awarenessAvg = avg(moduleMap.awareness.map(i => scores[i]));
  const level = awarenessAvg >= 4.5 ? "high" : awarenessAvg >= 3.5 ? "mid" : "low";

  // 顯示圖表（雷達圖僅示意）
  const ctx = document.getElementById("radarChart").getContext("2d");
  if (window.radarChartInstance) window.radarChartInstance.destroy();
  window.radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: moduleOrder,
      datasets: [{ label: selectedName, data: result.map(r => r.value), backgroundColor: "rgba(69,123,157,0.2)", borderColor: "#457b9d" }]
    },
    options: { scales: { r: { min: 1, max: 6 } } }
  });

  // 載入三段說明
  await loadModuleDescription(high, "high", "highContent");
  await loadModuleDescription(second, "second", "midContent");
  await loadModuleDescription(low, "low", "lowContent");

  // 自覺組合敘述
  await loadAwarenessCombo(level, high, low);
} 
