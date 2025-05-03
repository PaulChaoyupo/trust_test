import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wnbvamrjoydduriwaetd.supabase.co';
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYnZhbXJqb3lkZHVyaXdhZXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODQ4MjEsImV4cCI6MjA2MTc2MDgyMX0.AT_f5N-Kctcbkns47PyYurHxP9Z2ktRtbGgpyaMe4Oc';
const supabase = createClient(supabaseUrl, supabaseKey);

let radarChart;

document.addEventListener("DOMContentLoaded", async () => {
  const userId = getUserIdFromURL();
  const user = await fetchUserData(userId);
  if (user) {
    showUserData(user);
  } else {
    Swal.fire('找不到測驗資料', '', 'error');
  }
});

async function fetchUserData(userId) {
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('❌ Supabase 錯誤', error);
    return null;
  }

  return data;
}

function getUserIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id'); // 例如 dashboard.html?id=123
}

function showUserData(user) {
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
  const topKey = dimKeyMap[getTopKey(avg)];
  const advKey = getAdvKey(avg, dimKeyMap);
  loadHTML('personaBlock', `./persona_${topKey}.html`);
  loadHTML('advBlock', `./strength_${advKey}_high.html`);
  loadLowScores(avg, dimKeyMap);
  loadAwareness(user);
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
    .then(r => r.ok ? r.text() : Promise.reject(`HTTP ${r.status}`))
    .then(t => document.getElementById(id).innerHTML = t)
    .catch(err => {
      document.getElementById(id).innerHTML = `❌ 無法載入 ${path} (${err})`;
      console.error(`❌ 無法載入 ${path}`, err);
    });
}

function loadLowScores(avg, dimKeyMap) {
  const riskDiv = document.getElementById("riskBlock");
  riskDiv.innerHTML = '';

  const importanceOrder = ["自我認知", "團隊展現", "執行能力", "創意展現", "工作風格"];
  const entries = Object.entries(avg).sort((a, b) => a[1] - b[1]);
  const
