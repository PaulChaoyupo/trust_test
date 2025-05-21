
// 修正後的 dashboard_logic.js

const moduleMap = {
  workstyle: [16, 17, 18],
  team: [1, 2, 3],
  execution: [6, 7, 8],
  creativity: [11, 12, 13],
  awareness: [21, 22, 23]
};

const radarLabels = ["工作展現", "團隊互動", "執行能力", "創意思維", "自我覺察"];
const radarKeys = ["workstyle", "team", "execution", "creativity", "awareness"];

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function loadHTML(file, targetId) {
  try {
    const res = await fetch(file);
    const html = await res.text();
    document.getElementById(targetId).innerHTML = html;
  } catch (e) {
    document.getElementById(targetId).innerHTML = "❗ 無法載入敘述內容";
  }
}

function drawRadarChart(scores) {
  const percentMap = {
    workstyle: (avg(scores.slice(16, 19)) - 1) / 5 * 100,
    team: (avg(scores.slice(1, 4)) - 1) / 5 * 100,
    execution: (avg(scores.slice(6, 9)) - 1) / 5 * 100,
    creativity: (avg(scores.slice(11, 14)) - 1) / 5 * 100,
    awareness: (avg(scores.slice(21, 24)) - 1) / 5 * 100
  };

  const ctx = document.getElementById("radarChart").getContext("2d");
  if (window.radarChartInstance) window.radarChartInstance.destroy();
  window.radarChartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels: radarLabels,
      datasets: [{
        label: "構面分佈",
        data: radarKeys.map(k => percentMap[k]),
        backgroundColor: "rgba(69, 123, 157, 0.2)",
        borderColor: "#457b9d"
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: { stepSize: 20 }
        }
      }
    }
  });
}

async function loadUserData(userName) {
  const headers = {
    apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYnZhbXJqb3lkZHVyaXdhZXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODQ4MjEsImV4cCI6MjA2MTc2MDgyMX0.AT_f5N-Kctcbkns47PyYurHxP9Z2ktRtbGgpyaMe4Oc",
    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYnZhbXJqb3lkZHVyaXdhZXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODQ4MjEsImV4cCI6MjA2MTc2MDgyMX0.AT_f5N-Kctcbkns47PyYurHxP9Z2ktRtbGgpyaMe4Oc"
  };

  const res = await fetch(`https://wnbvamrjoydduriwaetd.supabase.co/rest/v1/results?name=eq.${userName}`, { headers });
  const data = await res.json();
  if (!data.length) return;

  const scores = data[0].scores;
  drawRadarChart(scores);

  const dims = {
    workstyle: avg(scores.slice(16, 19)),
    team: avg(scores.slice(1, 4)),
    execution: avg(scores.slice(6, 9)),
    creativity: avg(scores.slice(11, 14)),
    awareness: avg(scores.slice(21, 24))
  };

  const sorted = Object.entries(dims).sort((a, b) => b[1] - a[1]);
  const high = sorted[0][0];
  const mid = sorted[1][0];
  const low = sorted[4][0];

  const aware = dims.awareness;
  const level = aware >= 4.5 ? "high" : aware >= 3.5 ? "medium" : "low";

  await loadHTML(`${high}.html`, "highContent");
  await loadHTML(`${mid}.html`, "midContent");
  await loadHTML(`${low}.html`, "lowContent");
  await loadHTML(`self_awareness_${level}_${high}_${low}.html`, "awarenessContent");
}
