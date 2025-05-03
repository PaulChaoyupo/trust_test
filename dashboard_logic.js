
const SUPABASE_URL = 'https://wnbvamrjoydduriwaetd.supabase.co';
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYnZhbXJqb3lkZHVyaXdhZXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODQ4MjEsImV4cCI6MjA2MTc2MDgyMX0.AT_f5N-Kctcbkns47PyYurHxP9Z2ktRtbGgpyaMe4Oc';
let radarChart;

document.addEventListener("DOMContentLoaded", () => {
  fetchData();
});

function fetchData() {
  fetch(`${SUPABASE_URL}/rest/v1/results?select=*`, {
    headers: {
      'apikey': SUPABASE_API_KEY,
      'Authorization': `Bearer ${SUPABASE_API_KEY}`
    }
  })
  .then(res => res.json())
  .then(data => initSelectors(data))
  .catch(err => console.error("❌ 資料讀取失敗", err));
}

function initSelectors(data) {
  const dateInput = document.getElementById("dateSelector");
  const userSelector = document.getElementById("userSelector");

  userSelector.filteredUsers = [];

  dateInput.addEventListener('change', () => updateUserSelector(data, dateInput.value));

  userSelector.addEventListener('change', () => {
    const selectedIndex = userSelector.value;
    const selectedUser = userSelector.filteredUsers[selectedIndex];
    if (selectedUser) showUserData(selectedUser);
  });
}

function updateUserSelector(data, selectedDate) {
  const userSelector = document.getElementById("userSelector");
  userSelector.innerHTML = "<option value=''>請選擇</option>";
  userSelector.disabled = false;

  const filtered = data.filter(d => d.date.substring(0,10) === selectedDate);
  userSelector.filteredUsers = filtered;

  filtered.forEach((d, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.text = d.name;
    userSelector.appendChild(opt);
  });
}

function showUserData(user) {
  if (!user) return;

  try {
    user.scores = typeof user.scores === 'string' ? JSON.parse(user.scores) : user.scores;
  } catch {
    console.error("❌ scores JSON 解析失敗", user.scores);
    return;
  }

  const dimMap = {
    "團隊展現": [0,1,32],
    "自我認知": [2,6,8,9,10,11,26,27,28,29,30,32,34],
    "執行能力": [4,5,19,20,21],
    "創意展現": [12,13,14,17,18],
    "工作風格": [3,7,15,16,31,33]
  };

  const dimKeyMap = {
    "團隊展現": "team",
    "自我認知": "awareness",
    "執行能力": "execution",
    "創意展現": "creativity",
    "工作風格": "workstyle"
  };

  const avg = Object.fromEntries(Object.entries(dimMap).map(([k, idx]) =>
    [k, idx.reduce((sum, i) => sum + user.scores[i], 0) / idx.length]
  ));

  drawRadarChart(avg);

  const awarenessAvg = avg["自我認知"];
  const teamAvg = avg["團隊展現"];
  const execAvg = avg["執行能力"];
  const creativityAvg = avg["創意展現"];
  const workstyleAvg = avg["工作風格"];

  const ratios = {
    "團隊/執行": teamAvg / execAvg,
    "創意/執行": creativityAvg / execAvg,
    "自我認知/執行": awarenessAvg / execAvg,
    "團隊/自我認知": teamAvg / awarenessAvg,
    "執行/創意": execAvg / creativityAvg
  };

  function classifyRatio(r) {
    if (r >= 1.5) return "強勢";
    if (r >= 1.2) return "中等主導";
    return "平衡";
  }

  let ratioSummary = Object.entries(ratios)
    .map(([k, v]) => `${k}: ${v.toFixed(2)} (${classifyRatio(v)})`)
    .join(" ｜ ");

  let sortedDims = Object.entries(avg).sort((a, b) => b[1] - a[1]);
  let topDims = sortedDims.slice(0, 2).map(([k]) => k).join(" & ");

  let highDims = Object.entries(avg).filter(([_, v]) => v >= 2.6).map(([k]) => k);
  let lowDims = Object.entries(avg).filter(([_, v]) => v < 2.1).map(([k]) => k);

  let interactionDesc = '多面向均衡型';
  if (highDims.includes('團隊展現') && lowDims.includes('自我認知'))
    interactionDesc = '善於協作，但需加強自我反思';
  if (highDims.includes('創意展現') && lowDims.includes('執行能力'))
    interactionDesc = '創意豐富，但執行力稍弱';
  if (highDims.includes('執行能力') && lowDims.includes('工作風格'))
    interactionDesc = '結果導向，但彈性較低';

  const awarenessLevel = awarenessAvg < 2.1 ? '低自覺'
    : awarenessAvg >= 2.6 ? '高自覺'
    : '中等自覺';

  const summaryHTML = `
<p class="mb-2 text-gray-700 whitespace-pre-line">
【比值分析】
${ratioSummary}

【主次構面組合】
${topDims}

【交互組合分析】
${interactionDesc}

【自覺層級】
${awarenessLevel}
</p>`;

  const radarBlock = document.getElementById('radarBlock').querySelector('div');
  radarBlock.innerHTML = summaryHTML + radarBlock.innerHTML;

  const topKey = dimKeyMap[sortedDims[0][0]];
  const advKey = getAdvKey(avg, dimKeyMap);
  loadHTML('personaBlock', `persona_${topKey}.html`);
  loadHTML('advBlock', `strength_${advKey}_high.html`);
  loadLowScores(avg, dimKeyMap);
  loadAwareness(user);
}

function drawRadarChart(avg) {
  if (radarChart) radarChart.destroy();

  // 轉換成百分比
  const percentData = Object.values(avg).map(v => Math.round((v - 1) / 2 * 100));

  radarChart = new Chart(document.getElementById("radarChart"), {
    type: 'radar',
    data: {
      labels: Object.keys(avg), // 中文標籤
      datasets: [{
        label: '構面分數 (%)',
        data: percentData,
        backgroundColor: 'rgba(33,111,163,0.2)',
        borderColor: '#2170a3',
        pointBackgroundColor: '#2170a3'
      }]
    },
    options: {
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20, callback: v => `${v}%`, backdropColor: 'transparent', font: { size: 14 } },
          pointLabels: { font: { size: 16 } }
        }
      },
      plugins: { legend: { display: false } },
      responsive: true,
      maintainAspectRatio: false // 可縮小 canvas 容器控制大小
    }
  });

  // 建議調整 canvas CSS，例如：
  // <canvas id=\"radarChart\" style=\"width:100%;height:300px;\"></canvas>
}

function loadHTML(id, path) {
  fetch(path)
    .then(r => r.ok ? r.text() : Promise.reject())
    .then(t => document.getElementById(id).innerHTML = t)
    .catch(() => document.getElementById(id).innerHTML = `❌ 無法載入 ${path}`);
}

function loadLowScores(avg, dimKeyMap) {
  const riskDiv = document.getElementById("riskBlock");
  riskDiv.innerHTML = '';

  const importanceOrder = ["自我認知", "團隊展現", "執行能力", "創意展現", "工作風格"];
  const entries = Object.entries(avg).sort((a, b) => a[1] - b[1]);
  
  // 先抓最低分的前4個，避免同分漏掉
  const lowCandidates = entries.slice(0, 4).map(([k]) => k);

  // 再依重要性排序，挑前2個
  const sortedByImportance = importanceOrder.filter(k => lowCandidates.includes(k)).slice(0, 2);

  console.log("⚠️ 最終選定的低分構面（依重要性）:", sortedByImportance);

  sortedByImportance.forEach(k => {
    const div = document.createElement("div");
    riskDiv.appendChild(div);
    const riskKey = `./risk_${dimKeyMap[k]}_low.html`;

    console.log(`⚠️ 嘗試載入: ${riskKey}`);

    fetch(riskKey)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(h => {
        div.innerHTML = h;
        console.log(`✅ 成功載入: ${riskKey}`);
      })
      .catch(err => {
        div.innerHTML = `❌ 無法載入 ${riskKey} (${err.message})`;
        console.error(`❌ 無法載入 ${riskKey}`, err);
      });
  });
}

function loadAwareness(user) {
  const awarenessAvg = [2,6,8,9,10,11,26,27,28,29,30,32,34].reduce((sum,i) => sum + user.scores[i],0) / 13;
  const level = awarenessAvg < 2.1 ? 'low' : awarenessAvg >= 2.6 ? 'high' : 'balanced';
  loadHTML('awarenessBlock', `awareness_${level}.html`);
}

function getTopKey(avg) {
  return Object.entries(avg).sort((a,b) => b[1]-a[1])[0][0];
}

function getAdvKey(avg, dimKeyMap) {
  const high = Object.entries(avg).filter(([_,v]) => v >= 2.6).map(([k]) => dimKeyMap[k]);
  return high.length ? high.slice(0,3).sort().join('_') : dimKeyMap[getTopKey(avg)];
}
