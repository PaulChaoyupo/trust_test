const SUPABASE_URL = 'https://wnbvamrjoydduriwaetd.supabase.co';
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYnZhbXJqb3lkZHVyaXdhZXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODQ4MjEsImV4cCI6MjA2MTc2MDgyMX0.AT_f5N-Kctcbkns47PyYurHxP9Z2ktRtbGgpyaMe4Oc';
let radarChart;

document.addEventListener("DOMContentLoaded", () => {
  fetchData();
});

function fetchData() {
  fetch(`${SUPABASE_URL}/rest/v1/results?select=*`, {
    headers: { 'apikey': SUPABASE_API_KEY, 'Authorization': `Bearer ${SUPABASE_API_KEY}` }
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

  const filtered = data.filter(d => d.date.substring(0, 10) === selectedDate);
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
    "團隊展現": { key: "team", idxs: [0,1,2,3,4] },
    "執行能力": { key: "execution", idxs: [5,6,7,8,9] },
    "創意展現": { key: "creativity", idxs: [10,11,12,13,14] },
    "工作風格": { key: "workstyle", idxs: [15,16,17,18,19] },
    "自我認知": { key: "awareness", idxs: [20,21,22,23,24] },
    "一致性": { key: "consistency", idxs: [25,26,27,28,29,30] }
  };

  const MAX_SCORE = 6;
  const weightedScores = {};
  const percentMap = {};

  Object.entries(dimMap).forEach(([dim, { idxs }]) => {
    const scores = idxs.map(i => user.scores[i]);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const std = Math.sqrt(scores.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / scores.length);
    weightedScores[dim] = avg;
    percentMap[dimMap[dim].key] = Math.round((avg / MAX_SCORE) * 100);
  });
const sortedDims = Object.entries(weightedScores).filter(([k]) => k !== '一致性').sort((a,b)=>b[1]-a[1]);
const [highDim, midDim, lowDim] = [sortedDims[0][0], sortedDims[1][0], sortedDims[sortedDims.length-1][0]].map(dim => dimMap[dim].key);
const selfAvg = dimMap['自我認知'].idxs.slice(0,3).map(i => user.scores[i]).reduce((a,b)=>a+b,0)/3;
const otherAvg = dimMap['自我認知'].idxs.slice(3).map(i => user.scores[i]).reduce((a,b)=>a+b,0)/2;
const awarenessGap = Math.abs(selfAvg - otherAvg);
const consistencyAvg = dimMap['一致性'].idxs.map(i => user.scores[i]).reduce((a,b)=>a+b,0)/6;
const consistencyStd = Math.sqrt(dimMap['一致性'].idxs.map(i => Math.pow(user.scores[i] - consistencyAvg, 2)).reduce((a,b)=>a+b,0)/6);

let suspicious = false;
let suspiciousLevel = '';

if (consistencyAvg > 4.5 || consistencyStd < 0.5) {
    suspicious = true;
    suspiciousLevel = '高風險';
} else if (consistencyAvg > 4.0) {
    suspicious = true;
    suspiciousLevel = '中等風險';
}


// 新增對應表
const awarenessLevelMap = {
    '高自覺': 'high',
    '中等自覺': 'medium',
    '低自覺': 'low'
};

let awarenessLevel = '';
if (awarenessGap < 0.3 && selfAvg >= 3.5) {
    awarenessLevel = '高自覺';
} else if (awarenessGap < 0.8 && selfAvg >= 2.5) {
    awarenessLevel = '中等自覺';
} else {
    awarenessLevel = '低自覺';
}

// 進度條資料
window.chartPercentages = percentMap;

  // ➕ 繪製雷達圖
const radarLabels = ['人際互動', '積極程度', '創意思考', '工作展現', '自我察覺'];
const radarKeys = ['team', 'execution', 'creativity', 'workstyle', 'awareness'];
const radarData = radarKeys.map(key => percentMap[key]);

drawRadarChart(radarLabels, radarData);

// 載入高分/次高分/低分構面
loadDimensionSection(highDim, 'high', 'highContent');
loadDimensionSection(midDim, 'second', 'midContent');
loadDimensionSection(lowDim, 'low', 'lowContent');

// 修正版 loadHTML
loadHTML('awarenessBlock', `self_awareness_${awarenessLevelMap[awarenessLevel]}_${highDim}_${midDim}.html`);


  if (suspicious) {
    document.getElementById('awarenessBlock').innerHTML += `<div style="color:red; font-weight:bold;">⚠️ 注意：填答一致性${suspiciousLevel}，請小心解讀結果</div>`;
}
}

function drawRadarChart(labels, percentData) {
  if (radarChart) radarChart.destroy();
  radarChart = new Chart(document.getElementById("radarChart"), {
    type: 'radar',
    data: {
      labels,
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
      maintainAspectRatio: false
    }
  });
}

async function loadDimensionSection(dim, section, blockId) {
  const path = `${dim}.html`;
  const percent = window.chartPercentages[dim] || 0;
  try {
    const res = await fetch(path);
    const html = await res.text();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const sectionContent = tempDiv.querySelector(`#${dim}-${section}`);
    document.getElementById(blockId).innerHTML = sectionContent 
      ? `<h3>${dim}-${section} <span>${percent}%</span></h3><div>${sectionContent.innerHTML}</div>`
      : `❌ ${dim}-${section} 未找到`;
  } catch {
    document.getElementById(blockId).innerHTML = `❌ 無法載入 ${path}`;
  }
}

function loadHTML(id, path) {
  fetch(path)
    .then(r => r.ok ? r.text() : Promise.reject())
    .then(t => document.getElementById(id).innerHTML = `<div>${t}</div>`)
    .catch(() => document.getElementById(id).innerHTML = `❌ 無法載入 ${path}`);
}
