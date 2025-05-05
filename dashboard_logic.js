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

  const avg = Object.fromEntries(Object.entries(dimMap).map(([k, idx]) =>
    [k, idx.reduce((sum, i) => sum + user.scores[i], 0) / idx.length]
  ));

  const sortedDims = Object.entries(avg).sort((a, b) => b[1] - a[1]);
  const lowest = sortedDims[0][0];
  const mid = sortedDims[2][0];
  const highest = sortedDims[4][0];

  const awarenessAvg = avg["自我認知"];
  const awarenessLevel = 
    awarenessAvg < 1.8 ? 'low' :
    awarenessAvg < 2.6 ? 'medium' : 'high';

  console.log(`最高: ${highest}, 次高: ${mid}, 最低: ${lowest}, 自覺: ${awarenessLevel}`);

  drawRadarChart(avg);

  loadHTML('highBlock', `persona_${dimKeyMap[highest]}_high_hr.html`);
  loadHTML('midBlock', `persona_${dimKeyMap[mid]}_medium_hr.html`);
  loadHTML('lowBlock', `persona_${dimKeyMap[lowest]}_low_hr.html`);
  loadHTML('awarenessBlock', `self_awareness_${awarenessLevel}_${dimKeyMap[highest]}_${dimKeyMap[mid]}.html`);
}

function drawRadarChart(avg) {
  if (radarChart) radarChart.destroy();
  const percentData = Object.values(avg).map(v => Math.round((v - 1) / 2 * 100));
  radarChart = new Chart(document.getElementById("radarChart"), {
    type: 'radar',
    data: {
      labels: Object.keys(avg),
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

function loadHTML(id, path) {
  fetch(path)
    .then(r => r.ok ? r.text() : Promise.reject())
    .then(t => document.getElementById(id).innerHTML = t)
    .catch(() => document.getElementById(id).innerHTML = `❌ 無法載入 ${path}`);
}
