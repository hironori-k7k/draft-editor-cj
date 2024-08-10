"use strict";

import tableFormatter from "./tableFormatter.js";

const elem = {
  runBtn: document.getElementById("run"),
  inputArea: document.getElementById("inputArea"),
  copyBtn: document.getElementById("copy"),
  outputArea: document.getElementById("outputArea"),
};

const sections = {
  top: "",
  middle: "",
  bottom: "",
};

elem.runBtn.addEventListener("click", main);

function main() {
  const originalDraft = elem.inputArea.value.trim();

  split3parts(originalDraft);

  editAsStringFirst();

  editAsDOM();

  // 置換した文字列をセットする
  elem.outputArea.value = [sections.top, sections.middle, sections.bottom].join("");
}

function split3parts(html) {
  const rowsString = html.split("\n");
  sections.top = rowsString[0];
  let rowIndex = 1;
  // topを切り分ける
  for (; rowIndex < rowsString.length; rowIndex++) {
    const row = rowsString[rowIndex];
    if (row.match(/^<h2(.+?)相場：(.+?)<\/h2>$/)) {
      // sections.middle = row;
      break;
    }
    sections.top += "\n" + row;
  }
  // middleを切り分ける
  for (; rowIndex < rowsString.length; rowIndex++) {
    const row = rowsString[rowIndex];
    if (row.match(/^<h2(.+?)選び方(.??)<\/h2>$/)) {
      // sections.bottom = row;
      break;
    }
    sections.middle += "\n" + row;
  }
  for (; rowIndex < rowsString.length; rowIndex++) {
    sections.bottom += "\n" + rowsString[rowIndex];
  }
  // console.log(sections.top);
  // console.log(sections.middle);
  // console.log(sections.bottom);
}


// 最初の文字列操作系
function editAsStringFirst() {
  // 各社の見出し下のイメージ画像に適切なスタイルを設定する
  //   blockquoteがないパターン
  sections.middle = sections.middle.replaceAll(/<\/h3>\n+(<img\s.+?>)\n+(（<a .+?）)/g, '</h3>\n<p style="text-align: center;">$1<span style="font-size: 14px;">$2</span></p>');
  //   blockquoteで囲まれているパターン
  sections.middle = sections.middle.replaceAll(/<\/h3>\n<blockquote>(.+?)<\/blockquote>\n+(（<a .+?）)/g, '</h3>\n<p style="text-align: center;">$1<span style="font-size: 14px;">$2</span></p>');
  
  // イメージ画像以外の引用画像をdivで囲む（囲みブルー）
  for (const key in sections) {
    // blockquoteがないパターン
    sections[key] = sections[key].replaceAll(/\n(<img.+?alt="(.+?)".+?>)\n+(（.*?<a\s.+?）.*?)/g, '\n<div class="box3-blue">\n<div class="box-title">$2</div>\n$1$3\n\n</div>');
    // blockquoteで囲まれているパターン
    sections[key] = sections[key].replaceAll(/<blockquote>(.+?alt="(.+?)".+?)<\/blockquote>\n+(（<a .+?）)/g, '<div class="box3-blue">\n<div class="box-title">$2</div>\n$1$3\n\n</div>');
  }
  // 各社の最後にあるリンクを公式リンクのボタンにする（色はred）
  sections.middle = sections.middle.replaceAll(/\n(.+?)公式サイトは<a.+?href="(.+?)".*?>コチラ<\/a>\n<h3/g, '\n<a class="btn btn-red btn-l" href="$2">$1\n公式サイトはコチラ</a>\n<h3');
}


// DOM操作系
function editAsDOM() {
  const keys = ["top", "middle", "bottom"];
  const doms = {};
  for (const key of keys) {
    const sec = document.createElement("section");
    sec.innerHTML = sections[key];
    doms[key] = sec;
    console.log(`\n${key}\n\n`);
    console.log(sec);
  }

  for (const key of keys) {
    const dom = doms[key];

    // table編集系
    const tables = Array.from(dom.querySelectorAll("table"));
    for (const table of tables) {
      const cells = table.querySelectorAll("th, td");
      for (const cell of cells) {
        if (cell.innerHTML.startsWith("・")) {
          cell.innerHTML = cell.innerHTML.replaceAll("\n\n", "\n");
        }
      }
      // 中段比較表以外に、新スタイルを適用する
      if (key !== "middle" || table !== tables.at(-1)) {
        let hasTHead = false;
        const firstCell = table.querySelector("th, td");
        const tx = firstCell?.textContent;
        if (tx && tx.length && tx.length >= 2) {
          if (tx.slice(0, 2) === "--") {
            hasTHead = true;
            firstCell.innerHTML = firstCell.innerHTML.replace("--", "");
          }
        }
        console.log(table, hasTHead);
        const tableType = (hasTHead ? "general" : "general_no_heading");
        table.insertAdjacentHTML("beforebegin", tableFormatter(table, tableType));
        table.remove();
      }
      else if (key === "middle") {
        table.insertAdjacentHTML("beforebegin", tableFormatter(table, "middle"));
        table.remove();
      }
    }
    const newTables = dom.querySelectorAll("table");
    for (const table of newTables) {
      const cells = table.querySelectorAll("th, td");
      for (const cell of cells) {
        const t = cell.textContent.trim();
        if (["〇", "◯", "◎", "△", "×", "✖"].includes(t)) {
          cell.style.textAlign = "center";
        }
      }
    }

    // 最初のパートにおける、メリット・デメリットや、◯◯の流れを、自動で編集する
    if (key === "top") {
      const headings = dom.querySelectorAll("h2, h3, h4");

      // メリット・デメリットの編集
      for (const h of headings) {
        const tx = h.textContent;
        if (!tx.includes("デメリット") && !tx.match(/[^デ]メリット/)) continue; // 両方とも含まれない、メリデメに無関係な見出しならスキップする
        if (tx.includes("デメリット") && tx.match(/[^デ]メリット/)) continue; // メリットとデメリットの両方を含む、両者をまとめているであろう上位見出しもスキップする
        console.log(tx);
        const goodOrBad = tx.includes("デメリット") ? "bad" : "good";
        // hタグ以降のnextElementをたどって、liがひとつだけのulを置換していく
        let nex = h;
        while (true) {
          nex = nex.nextElementSibling;
          if (!nex) break; // 次の要素が見つからない場合は終了する
          const tagName = nex.tagName.toUpperCase();
          if (tagName.match(/H\d/)) break; // 次の見出しタグにぶつかったら終了する
          if (tagName !== "UL") continue; // ulリスト以外の要素はスキップする
          const lis = nex.querySelectorAll("li");
          if (lis.length !== 1) continue; // 含んでいるli要素が1つの場合以外はスキップする
          // メリデメの見出しdivをulの後ろに設置する
          nex.insertAdjacentHTML("afterend", `<div class="${goodOrBad}-box common-icon-box"><span class="bold">${lis[0].innerHTML}</span></div>`);
          // ulを記録したうえでnexを挿入したdivへ移動してから、ulは削除する
          const ul = nex;
          nex = nex.nextElementSibling;
          ul.remove();
        }
      } // メリット・デメリットの編集 終了

      // 流れの編集
      for (const h of headings) {
        const tx = h.textContent;
        if (!tx.includes("流れ")) continue; // 該当しない見出しはスキップする
        // 流れを書いたolリストを探す
        let nex = h;
        let href = "", linkText = "";
        while (true) {
          nex = nex.nextElementSibling;
          if (!nex) break;
          const tagName = nex.tagName.toUpperCase();
          if (tagName.match(/H\d/)) break; // 次の見出しタグにぶつかったら終了する
          // 囲みブルーを見つけたら、その情報を記録しておく
          if (tagName === "DIV" && nex.querySelector(".box-title")) {
            const a = nex.querySelector("a");
            href = a?.href || "";
            linkText = a.textContent;
            continue; // 次へ
          }
          if (tagName !== "OL") continue; // olタグ以外なら次へ
          // ol直下のli一覧を取得する
          const lis = nex.querySelectorAll("li");
          const steps = []; // ステップの情報を記録する、html文字列を子要素とする二次元配列
          // 最初に選び方や安くする方法がなければ、step1として下書きを作成する
          if ( !(lis[0].textContent.includes("選び方") && lis[0].textContent.includes("方法")) ) {
            steps.push(["●●を探す", 'まずは、●●を探しましょう。本記事ではオススメの●●、選び方、安くする方法などを紹介しています。ぜひ参考にしてください。']);
          }
          // li一覧を順に解析してステップの情報を集める
          for (const li of lis) {
            const htmlRows = li.innerHTML.split("\n");
            if (htmlRows.length > 1) {
              steps.push([htmlRows.shift(), htmlRows.join("\n")]);
            } else {
              steps.push([li.innerHTML, ""]);
            }
          }
          // 流れのHTMLを作成
          let timeline = '<div class="timeline-box cf">\n<div class="timeline-title">';
          timeline += h.textContent + "\n";
          timeline += `<span style="font-size: 14px;">（${linkText ? linkText : "●●"}の事例）</span></div>\n`;
          timeline += '<ul class="timeline">\n';
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            timeline += `<li class="timeline-item cf">\n<div class="timeline-item-label">STEP${i + 1}</div>\n<div class="timeline-item-content">`;
            timeline += `<div class="timeline-item-title">${step[0]}</div>`;
            timeline += `<div class="timeline-item-snippet">${step[1]}</div>\n</div>\n</li>\n`;
          }
          timeline += '</ul>\n<p style="text-align: center;">';
          if (href && linkText) {
            timeline += `（<a href="${href}">${linkText}公式サイト</a>より参考事例）`;
          } else {
            timeline += '（<a href="">●●公式サイト</a>より参考事例）';
          }
          timeline += '</p>\n</div>';
          // 流れをolの後ろに設置
          nex.insertAdjacentHTML("afterend", timeline);
          // olは削除
          nex.remove();
          break;
        }
      } // 流れの編集 終了
    }

    // 各社の章だけに行う操作
    if (key === "middle") {
      // 各社の最初の (囲みブルー > (img・表・日付)) の処理を行う
      const d = new Date();
      const [year, month, date] = [d.getFullYear(), d.getMonth() + 1, d.getDate()];
      const box3s = dom.querySelectorAll("h3 ~ .box3-blue");
      for (const box of box3s) {
        const a = box.querySelector("a:last-of-type");
        if (!a) continue;
        const [company, href] = [a.textContent, a.href];
        let table = box;
        while (true) {
          table = table.nextElementSibling;
          if (!table) break;
          const tagName = table.tagName.toUpperCase();
          if (tagName.match(/H\d/)) break; // 見出しタグにあたったらあきらめる
          if (tagName === "TABLE") {
            box.insertAdjacentElement("beforeend", table);
            box.insertAdjacentHTML("beforeend", `（※<a href="${href}">${company}の料金一覧</a>：${year}年${month}月${date}日時点）`);
            break;
          }
        }
      }
      // 各社の最後に公式リンクがなければ設置する
      // middleにおける2つ目以降のh3に着目し、その前のElementを見る
      const h3s = dom.querySelectorAll("h3");
      for (let i = 1; i < h3s.length; i++) {
        const h3 = h3s[i];
        const pre = h3.previousElementSibling;
        const preTagName = pre.tagName.toUpperCase();
        // 公式リンクボタンが含まれていない条件を判定する
        if (preTagName !== "A" || pre.textContent.includes("コチラ") === false) {
          // 直前のh3見出しからサービス名を取得する
          const serviceNameMatch = h3s[i - 1].textContent.match(/^(.+?)の.{2}相場/);
          if (!serviceNameMatch || serviceNameMatch.length < 2) continue; // h3からのサービス名取得に失敗したらスキップする
          const serviceName = serviceNameMatch[1];
          // 直前のh3に続くbox3を取得して、その中にある最初のリンク先を公式リンクとする
          let serviceUrl = "";
          let box = h3s[i - 1];
          while (true) {
            box = box.nextElementSibling;
            if (!box) break; // 次の要素が見つからない場合は中断する
            const tagName = box.tagName.toUpperCase();
            // boxが見つかった場合にUrlを取得する
            if (tagName === "DIV" && box.querySelector(".box-title")) {
              serviceUrl = box.querySelector("a")?.href;
              break;
            }
            // boxが見つからずh2やh3に到達してしまった場合は中断する
            if (tagName === "H3" || tagName === "H2") {
              break;
            }
          }
          if (!serviceUrl) continue; // リンク取得に失敗していたらスキップする
          // 取得したサービス名とリンク先をもとに、色は赤で公式リンクボタンを挿入する
          h3.insertAdjacentHTML("beforebegin", `<a class="btn btn-red btn-l" href="${serviceUrl}">${serviceName}\n公式サイトはコチラ</a>\n`);
        }
      }
    }
  }

  for (const key of keys) {
    sections[key] = doms[key].innerHTML;
  }
}


// クリップボードにコピー
elem.copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(elem.outputArea.value);
  elem.outputArea.style.borderColor = "#0f0";
  setTimeout(() => {
    elem.outputArea.style.borderColor = "#fff";
  }, 1000);
});

// テスト用コード
const testDraft = ``;

function test() {
  elem.inputArea.value = testDraft;
  main();
}
// test();
