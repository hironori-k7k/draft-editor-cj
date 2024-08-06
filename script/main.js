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
  // 各社の見出し下のイメージ画像
  sections.middle = sections.middle.replaceAll(/<\/h3>\n<blockquote>(.+?)<\/blockquote>\n+(（<a .+?）)/g, '</h3>\n<p style="text-align: center;">$1<span style="font-size: 14px;">$2</span></p>');
  // イメージ画像以外の引用画像
  for (const key in sections) {
    sections[key] = sections[key].replaceAll(/<blockquote>(.+?alt="(.+?)".+?)<\/blockquote>\n+(（<a .+?）)/g, '<div class="box3-blue">\n<div class="box-title">$2</div>\n$1$3\n\n</div>');
  }
  // 各社の公式リンクボタン
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
        table.insertAdjacentHTML("beforebegin", tableFormatter(table));
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

    // 各社画像のdivに、表を入れ込む
    if (key === "middle") {
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