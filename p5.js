let tableInit;
let tableLive;
let nodes = [];
let bgImg;

const baseSize = 48;

// ★デバッグ用
let liveStatus = "not loaded yet";
let liveRows = 0;
let lastUpdate = 0;
let lastError = "";

function preload() {
  tableInit = loadTable(
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQpGomcF3XrFrGJhAN2r-sPvxN8BQfBw1YYzLyOp3L1k4ts3W3rM6sVamzssK1PUcjFEEulB4_om-l0/pub?output=csv",
    "csv",
    "header"
  );

  bgImg = loadImage(
    "background.jpg",
    () => console.log("background OK"),
    () => console.warn("background NG")
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER);
  textSize(13);

  initNodes();

  updateLiveData();                 // ★最初に1回
  setInterval(updateLiveData, 10000);
}

function draw() {
  if (bgImg) image(bgImg, 0, 0, width, height);
  else background(230);

  drawEdges();
  drawNodes();
  drawDebug(); // ★状態表示
}

function initNodes() {
  for (let r = 0; r < tableInit.getRowCount(); r++) {
    const row = tableInit.getRow(r);
    const pos = getSafePosition();

    nodes.push({
      nickname: row.getString("nickname"),
      color: row.getString("color") || "#000000",
      x: pos.x,
      y: pos.y,
      size: baseSize,
      outdoor: parseInt(row.getString("outdoor")) || 0,
      active: parseInt(row.getString("active")) || 0,
      bright: parseInt(row.getString("bright")) || 0,
      impatient: parseInt(row.getString("impatient")) || 0,
      takarakuji: parseInt(row.getString("takarakuji")) || 0,
      ikerunara: parseInt(row.getString("ikerunara")) || 0,
      taisetu: parseInt(row.getString("taisetu")) || 0,
      sainou: parseInt(row.getString("sainou")) || 0,
      peak: parseInt(row.getString("peak")) || 0,
      mbti: row.getString("mbti")
    });
  }
}

function updateLiveData() {
  const url =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQN_jinUqKYEJlLV0krxp0Y0mf-gmjDiGANl4Em6OrbZWjzxEOyi4qysVJ9hthGIGekvLYmVYfG_h1e/pub?output=csv"
    + "&t=" + Date.now();

  loadTable(
    url,
    "csv",
    "header",
    (table) => {
      tableLive = table;
      liveRows = tableLive.getRowCount();
      lastUpdate = Date.now();
      lastError = "";
      liveStatus = "loaded";

      // ★列名確認：ここが超重要
      console.log("LIVE columns:", tableLive.columns);

      for (let r = 0; r < tableLive.getRowCount(); r++) {
        const row = tableLive.getRow(r);

        // ★「ニックネーム」列名が微妙に違う可能性があるので候補で拾う
        const nickname =
          (row.getString("ニックネーム") ||
           row.getString("ニックネーム ") ||   // 末尾スペース対策
           row.getString("Nickname") ||
           row.getString("nickname") ||
           "").trim();

        if (!nickname) continue;
        if (nodes.some(n => n.nickname === nickname)) continue;

        const pos = getSafePosition();

        nodes.push({
          nickname,
          color: "#444444",
          x: pos.x,
          y: pos.y,
          size: baseSize,
          outdoor: parseInt(row.getString("アウトドア度")) || 0,
          active: parseInt(row.getString("積極的度")) || 0,
          bright: parseInt(row.getString("性格の明るさ")) || 0,
          impatient: parseInt(row.getString("せっかち度")) || 0,
          takarakuji: convertAnswer("takarakuji", row.getString("宝くじが当たったら？")),
          ikerunara: convertAnswer("ikerunara", row.getString("行けるなら？")),
          taisetu: convertAnswer("taisetu", row.getString("いちばん大切なのは？")),
          sainou: convertAnswer("sainou", row.getString("一つだけ選べるなら？")),
          peak: convertAnswer("peak", row.getString("今のところの人生のピークは")),
          mbti: row.getString("MBTI")
        });
      }
    },
    (err) => {
      liveStatus = "failed";
      lastError = String(err);
      console.error("LIVE load failed:", err);
    }
  );
}

function convertAnswer(key, val) {
  const map = {
    takarakuji: { "貯金": 1, "散財": 2, "投資": 3 },
    ikerunara: { "過去": 1, "未来": 2, "いかない": 3 },
    taisetu: { "富": 1, "名声": 2, "力": 3 },
    sainou: { "優れた知能": 1, "優れた運動神経": 2, "優れたアートセンス": 3 },
    peak: { "～小学生": 1, "中～高校生": 2, "今！": 3 }
  };
  return map[key]?.[val] ?? parseInt(val) ?? 0;
}

function getSafePosition() {
  let x, y, safe, count = 0;
  do {
    safe = true;
    x = random(80, width - 80);
    y = random(80, height - 80);
    for (let n of nodes) {
      if (dist(x, y, n.x, n.y) < (n.size + baseSize) / 2 + 5) {
        safe = false;
        break;
      }
    }
    count++;
    if (count > 500) safe = true;
  } while (!safe);
  return { x, y };
}

function drawNodes() {
  for (let n of nodes) {
    fill(255, 230);
    noStroke();
    ellipse(n.x, n.y, n.size + 10);

    fill(n.color);
    ellipse(n.x, n.y, n.size);

    fill(0);
    text(n.nickname, n.x, n.y - n.size / 2 - 10);
  }
}

function drawEdges() {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const A = nodes[i];
      const B = nodes[j];

      const traits = ["outdoor", "active", "bright", "impatient"];
      const t = traits.filter(k => A[k] === B[k]).length;
      if (t >= 3) {
        stroke("#0033cc");
        strokeWeight(t === 4 ? 3 : 1);
        line(A.x, A.y, B.x, B.y);
      }

      const abilities = ["takarakuji", "ikerunara", "taisetu", "sainou", "peak"];
      const a = abilities.filter(k => A[k] === B[k]).length;
      if (a >= 4) {
        stroke("#800080");
        strokeWeight(a === 5 ? 3 : 1);
        line(A.x, A.y, B.x, B.y);
      }

      if (A.mbti && A.mbti === B.mbti) {
        stroke("#88ff88");
        strokeWeight(2);
        line(A.x, A.y, B.x, B.y);
      }
    }
  }
}

function drawDebug() {
  // 左上に状態表示
  push();
  noStroke();
  fill(255, 220);
  rect(10, 10, 360, 80, 8);

  fill(0);
  textAlign(LEFT, TOP);
  textSize(12);

  const sec = lastUpdate ? Math.floor((Date.now() - lastUpdate) / 1000) : "-";
  text(`LIVE status: ${liveStatus}`, 20, 20);
  text(`LIVE rows: ${liveRows}`, 20, 38);
  text(`last update: ${sec}s ago`, 20, 56);
  if (lastError) text(`error: ${lastError}`, 20, 74);

  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function touchStarted() { return false; }
