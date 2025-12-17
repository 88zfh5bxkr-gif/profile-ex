let tableInit;   // 事前用スプレッドシート
let tableLive;   // リアルタイム用スプレッドシート
let nodes = [];
const baseSize = 48;

// -------------------------------------------
// preload: 初期用スプレッドシート読み込み
// -------------------------------------------
function preload() {
  tableInit = loadTable(
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQpGomcF3XrFrGJhAN2r-sPvxN8BQfBw1YYzLyOp3L1k4ts3W3rM6sVamzssK1PUcjFEEulB4_om-l0/pub?output=csv",
    "csv", "header"
  );
  bgImg = loadImage("background.jpg", 
    () => console.log("background OK"), 
    () => console.warn("background NG")
  );
}

// -------------------------------------------
// setup: canvas準備
// -------------------------------------------
function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER);
  textSize(13);

  initNodes();                   // 事前ノード配置
  setInterval(updateLiveData, 10000); // 10秒ごとにフォームデータ取得
}

// -------------------------------------------
// draw: 描画ループ
// -------------------------------------------
function draw() {
  if (bgImg) {
    image(bgImg, 0, 0, width, height);  // 背景画像を描画
  } else {
    background(230);                     // 画像が読み込まれていない場合は単色
  }

  drawEdges();
  drawNodes();
}

// -------------------------------------------
// 初期ノード配置（事前データ）
// -------------------------------------------
function initNodes() {
  for (let r = 0; r < tableInit.getRowCount(); r++) {
    const row = tableInit.getRow(r);

    let x, y, safe, count = 0;
    do {
      safe = true;
      x = random(80, width - 80);
      y = random(80, height - 80);

      for (let n of nodes) {
        if (dist(x, y, n.x, n.y) < (n.size + baseSize)/2 + 5) {
          safe = false;
          break;
        }
      }
      count++;
      if (count > 500) safe = true;
    } while (!safe);

    nodes.push({
      nickname: row.getString("nickname"),
      color: row.getString("color") || "#000000",
      iconImg: null,
      x: x,
      y: y,
      size: baseSize,
      outdoor: parseInt(row.getString("outdoor")),
      active: parseInt(row.getString("active")),
      bright: parseInt(row.getString("bright")),
      impatient: parseInt(row.getString("impatient")),
      takarakuji: parseInt(row.getString("takarakuji")),
      ikerunara: parseInt(row.getString("ikerunara")),
      taisetu: parseInt(row.getString("taisetu")),
      sainou: parseInt(row.getString("sainou")),
      peak: parseInt(row.getString("peak")),
      mbti: row.getString("mbti")
    });
  }
}

// -------------------------------------------
// リアルタイム用データ更新（フォーム回答）
// -------------------------------------------
function updateLiveData() {
  tableLive = loadTable(
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQN_jinUqKYEJlLV0krxp0Y0mf-gmjDiGANl4Em6OrbZWjzxEOyi4qysVJ9hthGIGekvLYmVYfG_h1e/pub?output=csv",
    "csv", "header",
    () => {
      for (let r = 0; r < tableLive.getRowCount(); r++) {
        const row = tableLive.getRow(r);
        const nickname = row.getString("ニックネーム"); // フォーム列名に合わせる

        if (!nodes.some(n => n.nickname === nickname)) {
          // 新しいノードの位置を決定
          let x, y, safe, count = 0;
          do {
            safe = true;
            x = random(80, width - 80);
            y = random(80, height - 80);
            for (let n of nodes) {
              if (dist(x, y, n.x, n.y) < (n.size + baseSize)/2 + 5) {
                safe = false;
                break;
              }
            }
            count++;
            if (count > 500) safe = true;
          } while (!safe);

          // フォームの回答を数字に変換
          function convertAnswer(key, val) {
            const map = {
              "takarakuji": {"貯金":1, "散財":2, "投資":3},
              "ikerunara": {"過去":1, "未来":2, "いかない":3},
              "taisetu": {"富":1, "名声":2, "力":3},
              "sainou": {"優れた知能":1, "優れた運動神経":2, "優れたアートセンス":3},
              "peak": {"～小学生":1, "中～高校生":2, "今！":3}
            };
            return map[key] && map[key][val] ? map[key][val] : parseInt(val) || 0;
          }

          nodes.push({
            nickname: nickname,
            color: "#444444",
            iconImg: null,
            x: x,
            y: y,
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
      }
    }
  );
}

// -------------------------------------------
// ノード描画（丸＋名前）
// -------------------------------------------
function drawNodes() {
  for (let n of nodes) {
    fill(255, 230);
    noStroke();
    ellipse(n.x, n.y, n.size + 10);

    fill(n.color);
    ellipse(n.x, n.y, n.size);

    fill(0);
    text(n.nickname, n.x, n.y - n.size/2 - 10);
  }
}

// -------------------------------------------
// 条件付きエッジ描画
// -------------------------------------------
function drawEdges() {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i+1; j < nodes.length; j++) {
      const A = nodes[i];
      const B = nodes[j];

      const traits = ["outdoor","active","bright","impatient"];
      let matchTraits = traits.filter(k => A[k] === B[k]).length;
      if (matchTraits === 4) { stroke("#0033cc"); strokeWeight(3); line(A.x,A.y,B.x,B.y); }
      else if (matchTraits === 3) { stroke("#0033cc"); strokeWeight(1); line(A.x,A.y,B.x,B.y); }

      const abilities = ["takarakuji","ikerunara","taisetu","sainou","peak"];
      let matchAbilities = abilities.filter(k => A[k] === B[k]).length;
      if (matchAbilities === 5) { stroke("#800080"); strokeWeight(3); line(A.x,A.y,B.x,B.y); }
      else if (matchAbilities === 4) { stroke("#800080"); strokeWeight(1); line(A.x,A.y,B.x,B.y); }

      if (A.mbti && A.mbti === B.mbti) { stroke("#88ff88"); strokeWeight(2); line(A.x,A.y,B.x,B.y); }
    }
  }
}

// -------------------------------------------
// リサイズ対応
// -------------------------------------------
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
