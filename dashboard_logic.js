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

  const filtered = data.filter(d => d.date.substring(0, 10) === selectedDate);
  userSelector.filteredUsers = filtered;

  filtered.forEach((d, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.text = d.name;
    userSelector.appendChild(opt);
  });
}

async function showUserData(user) {
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

  const allCounts = Object.values(dimMap).map(idx => idx.length);
  const avgCount = allCounts.reduce((sum, c) => sum + c, 0) / allCounts.length;

  const weightedAvg = {};
  const percentData = [];

  for (const [k, idx] of Object.entries(dimMap)) {
    const rawAvg = idx.reduce((sum, i) => sum + user.scores[i], 0) / idx.length;
    const weighted = rawAvg * (avgCount / idx.length);
    const maxWeighted = 5 * (avgCount / idx.length);
    const percent = Math.min(Math.round((weighted / maxWeighted) * 100), 100);
    weightedAvg[k] = weighted;
    percentData.push(percent);
  }

  const sortedDims = Object.entries(weightedAvg).sort((a, b) => b[1] - a[1]);
  const highDim = dimKeyMap[sortedDims[0][0]];
  const midDim = dimKeyMap[sortedDims[1][0]];
  const lowDim = dimKeyMap[sortedDims[4][0]];

  const awarenessAvg = weightedAvg["自我認知"];
  const awarenessLevel =
    awarenessAvg < 1.8 ? 'low' :
    awarenessAvg < 2.6 ? 'medium' : 'high';

  window.chartPercentages = {
    team: percentData[0],
    awareness: percentData[1],
    execution: percentData[2],
    creativity: percentData[3],
    workstyle: percentData[4]
  };

  drawRadarChart(Object.keys(weightedAvg), percentData);

  await loadDimensionSection(highDim, 'high', 'highBlock');
  await loadDimensionSection(midDim, 'second', 'midBlock');
  await loadDimensionSection(lowDim, 'low', 'lowBlock');
  loadHTML('awarenessBlock', `self_awareness_${awarenessLevel}_${highDim}_${midDim}.html`);
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

function getProgressColor(percent) {
  if (percent <= 40) return '#e74c3c'; // 紅
  if (percent <= 70) return '#f1c40f'; // 黃
  return '#2ecc71';                   // 綠
}

async function loadDimensionSection(dim, section, blockId) {
  const path = `${dim}.html`;
  const percent = window.chartPercentages ? window.chartPercentages[dim] || 0 : 0;
  try {
    const res = await fetch(path);
    const html = await res.text();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const sectionContent = tempDiv.querySelector(`#${dim}-${section}`);
    document.getElementById(blockId).innerHTML = sectionContent 
      ? `
        <h3>${dim}-${section} <span class="tooltip" data-tooltip="詳細解釋：${dim}-${section}">${percent}%</span></h3>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percent}%; background: ${getProgressColor(percent)};"></div>
        </div>
        <div>${sectionContent.innerHTML}</div>
      `
      : `❌ ${dim}-${section} 未找到`;
  } catch {
    document.getElementById(blockId).innerHTML = `❌ 無法載入 ${path}`;
  }
}

function loadHTML(id, path) {
  fetch(path)
    .then(r => r.ok ? r.text() : Promise.reject())
    .then(t => document.getElementById(id).innerHTML = `<div class="awareness-box">${t}</div>`)
    .catch(() => document.getElementById(id).innerHTML = `❌ 無法載入 ${path}`);
}
