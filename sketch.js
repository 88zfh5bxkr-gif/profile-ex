let tableInit;   // 事前用スプレッドシート
let tableLive;   // リアルタイム用スプレッドシート
let nodes = [];
let bgImg;

const baseSize = 48;

// デバッグ表示
let liveStatus = "not loaded yet";
let liveRows = 0;
let lastUpdate = 0;
let lastError = "";

/* =========================================
   便利関数：undefinedでも落ちないgetString
========================================= */
function safeGet(row, colName) {
  // p5.TableRow.getString は undefined を返すことがあるので防御
  let v;
  try {
    v = row.getString(colName);
  } catch (e) {
    return "";
  }
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

/* =========================================
   preload
========================================= */
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

/* =========================================
   setup
========================================= */
function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER);
  textSize(13);

  initNodes();

  updateLiveData();                  // ★最初に1回実行
  setInterval(updateLiveData, 10000); // ★10秒ごと
}

/* =========================================
   draw
========================================= */
function draw() {
  if (bgImg) {
    image(bgImg, 0, 0, width, height);
  } else {
    background(230);
  }

  drawEdges();
  drawNodes();
  drawDebug();
}

/* =========================================
   初期ノード（事前データ）
========================================= */
function initNodes() {
  for (let r = 0; r < tableInit.getRowCount(); r++) {
    const row = tableInit.getRow(r);

    const pos = getSafePosition();

    nodes.push({
      nickname: safeGet(row, "nickname"),
      color: safeGet(row, "color") || "#000000",
      x: pos.x,
      y: pos.y,
      size: baseSize,
      outdoor: parseInt(safeGet(row, "outdoor")) || 0,
      active: parseInt(safeGet(row, "active")) || 0,
      bright: parseInt(safeGet(row, "bright")) || 0,
      impatient: parseInt(safeGet(row, "impatient")) || 0,
      takarakuji: parseInt(safeGet(row, "takarakuji")) || 0,
      ikerunara: parseInt(safeGet(row, "ikerunara")) || 0,
      taisetu: parseInt(safeGet(row, "taisetu")) || 0,
      sainou: parseInt(safeGet(row, "sainou")) || 0,
      peak: parseInt(safeGet(row, "peak")) || 0,
      mbti: safeGet(row, "mbti")
    });
  }
}

/* =========================================
   リアルタイム用データ更新（フォーム回答）
========================================= */
function updateLiveData() {
  const url =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQN_jinUqKYEJlLV0krxp0Y0mf-gmjDiGANl4Em6OrbZWjzxEOyi4qysVJ9hthGIGekvLYmVYfG_h1e/pub?output=csv"
    + "&t=" + Date.now(); // ★キャッシュ対策

  loadTable(
    url,
    "csv",
    "header",
    (table) => {
      tableLive = table;

      liveStatus = "loaded";
      liveRows = tableLive.getRowCount();
      lastUpdate = Date.now();
      lastError = "";

      console.log("LIVE columns:", tableLive.columns);
      console.log("LIVE rows:", liveRows);

      for (let r = 0; r < tableLive.getRowCount(); r++) {
        const row = tableLive.getRow(r);

        // ★列名がズレても拾える候補（念のため）
        const nickname =
          (safeGet(row, "ニックネーム") ||
           safeGet(row, "ニックネーム ") ||
           safeGet(row, "Nickname") ||
           safeGet(row, "nickname")).trim();

        if (!nickname) continue;

        // 同名は追加しない（仕様）
        if (nodes.some(n => n.nickname === nickname)) continue;

        const pos = getSafePosition();

        nodes.push({
          nickname: nickname,
          color: "#444444",
          x: pos.x,
          y: pos.y,
          size: baseSize,
          outdoor: parseInt(safeGet(row, "アウトドア度")) || 0,
          active: parseInt(safeGet(row, "積極的度")) || 0,
          bright: parseInt(safeGet(row, "性格の明るさ")) || 0,
          impatient: parseInt(safeGet(row, "せっかち度")) || 0,
          takarakuji: convertAnswer("takarakuji", safeGet(row, "宝くじが当たったら？")),
          ikerunara: convertAnswer("ikerunara", safeGet(row, "行けるなら？")),
          taisetu: convertAnswer("taisetu", safeGet(row, "いちばん大切なのは？")),
          sainou: convertAnswer("sainou", safeGet(row, "一つだけ選べるなら？")),
          peak: convertAnswer("peak", safeGet(row, "今のところの人生のピークは")),
          mbti: safeGet(row, "MBTI")
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

/* =========================================
   回答を数字に変換（未回答は0）
========================================= */
function convertAnswer(key, val) {
  const map = {
    takarakuji: { "貯金": 1, "散財": 2, "投資": 3 },
    ikerunara: { "過去": 1, "未来": 2, "いかない": 3 },
    taisetu: { "富": 1, "名声": 2, "力": 3 },
    sainou: { "優れた知能": 1, "優れた運動神経": 2, "優れたアートセンス": 3 },
    peak: { "～小学生": 1, "中～高校生": 2, "今！": 3 }
  };
  if (!val) return 0;
  if (map[key] && map[key][val] !== undefined) return map[key][val];
  return parseInt(val) || 0;
}

/* =========================================
   ノードが被らない位置
========================================= */
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

/* =========================================
   描画：ノード
========================================= */
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

/* =========================================
   描画：エッジ
========================================= */
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

/* =========================================
   デバッグ表示（左上）
========================================= */
function drawDebug() {
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

/* =========================================
   リサイズ
========================================= */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

/* =========================================
   iPad誤操作防止
========================================= */
function touchStarted() {
  return false;
}
