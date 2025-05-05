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

  const allCounts = Object.values(dimMap).map(arr => arr.length);
  const avgCount = allCounts.reduce((sum, c) => sum + c, 0) / allCounts.length;

  const weightedScores = {};
  let maxScore = 0;

  for (const [dim, idxs] of Object.entries(dimMap)) {
    const rawAvg = idxs.reduce((sum, i) => sum + user.scores[i], 0) / idxs.length;
    const weighted = rawAvg * (avgCount / idxs.length);
    weightedScores[dim] = weighted;
    if (weighted > maxScore) maxScore = weighted;
  }

  const percentData = Object.values(weightedScores).map(w => Math.round((w / maxScore) * 100));
  const percentMap = {};
  Object.keys(dimMap).forEach((dim, i) => percentMap[dimKeyMap[dim]] = percentData[i]);

  drawRadarChart(Object.keys(weightedScores), percentData);

  const sortedDims = Object.entries(weightedScores).sort((a, b) => b[1] - a[1]);
  const highDim = dimKeyMap[sortedDims[0][0]];
  const midDim = dimKeyMap[sortedDims[1][0]];
  const lowDim = dimKeyMap[sortedDims[4][0]];

  const awarenessAvg = weightedScores["自我認知"];
  const awarenessLevel =
    awarenessAvg < 1.8 ? 'low' :
    awarenessAvg < 2.6 ? 'medium' : 'high';

  window.chartPercentages = percentMap;
  document.getElementById('radarChart').chartData = percentMap;

  loadDimensionSection(highDim, 'high', 'highBlock');
  loadDimensionSection(midDim, 'second', 'midBlock');
  loadDimensionSection(lowDim, 'low', 'lowBlock');
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
