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
  // 残りがbottom
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
        if (["〇", "○", "◯", "◎", "△", "×", "✖"].includes(t)) {
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
const testDraft = `在庫管理システムの料金相場と選び方、安くする方法を紹介します。

自社で在庫管理システムを導入しようとしている方に役立つ情報をお伝えしていきます。

それぞれの在庫管理システムの特徴や、安く利用する方法も紹介していきます。

在庫管理システムを利用するメリットもたくさんあるので、ぜひ最後までご覧下さい。

[rtoc_mokuji title="" title_display="" heading="h3" list_h2_type="" list_h3_type="" display="" frame_design="" animation=""]
<h2>在庫管理システムとは</h2>
在庫管理システムとは、企業が抱えている在庫をパソコンなどで管理するシステムのことを指します。

在庫の数量はもちろんのこと、入荷や出荷で増減する在庫の管理もリアルタイムで行えます。

企業によって様々な使い方が出来るのも魅力のひとつです。
<h3>在庫管理システムの種類</h3>
在庫管理システムの中にも種類があり、<span class="bold">自社でどのように運用したいかによって使い分ける</span>必要があります。

在庫管理システムの種類について紹介します。
<h4>受発注機能と連携できるタイプ</h4>
<span class="bold">商品を入荷し、販売する企業におすすめ</span>のタイプです。

取引先からの注文を受けて出荷した商品や、発注して仕入れた商品を<span class="bold">リアルタイムで管理</span>できます。

在庫管理システムを通して社員が簡単に在庫を把握出来るだけでなく、自動で入力されるため打ち間違いなどのミスを回避する事が出来ます。
<h4>モノの管理に特化したタイプ</h4>
企業では多くの備品を保管していますよね、例えば事務用品など多くの物品在庫を抱えていると全て把握しきれていない事もあるでしょう。

そんな時はシンプルにモノを管理する機能だけがついた在庫管理システムが最適です。

<img class="alignnone size-full wp-image-68613" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/mononokanri.jpg" alt="モノの管理" width="1262" height="582" />

（<a href="https://convibase.jp/">コンビベース</a>のHPから引用）

コンビベースでは、モノの管理に特化した在庫管理システムを用意しています。

台帳機能だけでなく、貸出機能や入出庫機能が付いていますので<span class="bold">社内の物品管理におすすめです。</span>
<h4>ネットショップ運営に特化したタイプ</h4>
ネットショップを運営していたり、個人で多くの<span class="bold">ネットショップで商品を販売している方におすすめ</span>です。

他のネットショップと連携している在庫管理システムもあり、システムを操作するだけで他のネットショップに出品している情報も変更出来ますので手間を省けます。

<img class="alignnone size-full wp-image-68614" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/okurijyou.jpg" alt="送り状" width="993" height="660" />

（<a href="https://commerce-star.com/function/invoice/">TEMPOSTAR</a>のHPから引用）

TEMPOSTARでは在庫管理だけでなく、商品の発送に関わる部分も自動化出来るのが魅力です。

面倒な送り状も自動で発行でき、荷物発送メールまで購入者に自動で送信され便利です。
<h3><span class="bold">在庫管理システム導入までの流れ</span></h3>
在庫管理システム導入はそこまで難しくはありません。

サポート体制が万全な業者ならば、導入前の技術指導もしっかりと行ってくれます。

<img class="alignnone size-full wp-image-68616" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/dounyumadenonagare.jpg" alt="導入までの流れ" width="1531" height="440" />

（<a href="https://tanayomi.jp/#flow">タナヨミ</a>のHPから引用）
<ol>
 	<li>問い合わせ
企業HPの<span class="bold">問い合わせページから相談</span>する事から始め、この時に疑問があれば一緒に書いておきましょう。</li>
 	<li>ヒアリング
具体的な日程を擦り合わせ、希望するシステムの内容などを伝えましょう。必要な機能のみをメモに書き出しておくと、余計なオプションを付けてしまう事を防げます。</li>
 	<li>プラン決定
こちらの希望に沿ったプランを提案して貰い、その中からプランを決定します。実際の運用を意識した内容になっているかも確認し、<span class="bold">疑問があればこの時点でしっかりと確認</span>しましょう</li>
 	<li>利用開始
双方の同意が得られれば契約成立で、導入に向けて動き出します。導入前はもちろんですが導入後のサポートも大切ですので、サポートの問い合わせ先などを確認しておくといいでしょう。</li>
</ol>
<h2>在庫管理システムを導入するメリット・デメリット</h2>
便利な機能の多い在庫管理システムですが、どんなメリットがあるのでしょうか。

在庫管理システムを導入するメリット・デメリットをお伝えします。
<h3>在庫管理システムを導入するメリット</h3>
まずは在庫管理システムを導入するメリットを見て行きましょう。
<ul>
 	<li>業務を効率化出来る</li>
</ul>
これまでの既存の<span class="bold">業務を効率化</span>する事が出来ます。

業務が効率化する事で人件費などのコストを削減出来るかもしれません。
<ul>
 	<li>在庫切れを防げる</li>
</ul>
適切な在庫数を維持出来れば、会社の損失を減らす事に繋がります。

在庫管理システムを導入すれば、<span class="bold">適切な在庫数を保てる</span>ように管理出来ます。
<ul>
 	<li>在庫の把握ミスを減らせる</li>
</ul>
在庫を帳面やエクセルなどで管理していると、リアルタイムに在庫を管理する事が出来ません。

そのせいで在庫の把握が出来ず、本来なら必要がないのに追加で発注してしまう可能性があります。

在庫管理システムがあれば受発注の度に在庫を確認するクセが付くので、<span class="bold">受発注ミスを減らせます。</span>
<h3>在庫管理システムを導入するデメリット</h3>
次に在庫管理システムを導入するデメリットを見て行きましょう。
<ul>
 	<li>初期費用やランニングコストがかかる</li>
</ul>
在庫管理システムを導入するには<span class="bold">初期費用が平均で100,000円～</span>かかります。

初期費用が必要ない場合でも、<span class="bold">月額料金が平均50,000円～</span>かかります。

長い目でかかる費用を計算しなくてはなりませんが、結果的に業務効率化などコスパの高い投資になると感じたならば問題ありません。

その点を含めて見積もり相談をするのもおすすめです。
<ul>
 	<li>在庫管理システムを利用する人材が必要になる</li>
</ul>
在庫管理システムは多くの場合パソコンで管理するのですが、自社にパソコンが得意な人が少ないと真価を発揮出来ないかもしれません。

結果在庫管理システムを利用する人材を新規に雇わなければいけなくなることも。

<img class="alignnone size-full wp-image-68615" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/semina-.jpg" alt="導入セミナー" width="1065" height="302" />

（<a href="https://convibase.jp/event-seminar/">コンビベース</a>のHPから引用）

コンビベースのように、導入のためのセミナーを開催している業者もあります。

無料でお試し利用出来る在庫管理システムもありますので、まずは試してみるのもいいでしょう。
<h2>在庫管理システムの料金相場：<span class="bold">0円～900,000円</span></h2>
ここからは在庫管理システムの料金相場をお伝えします。

それぞれの特徴も併せて紹介しますので、ぜひ参考にして下さいね。
<h3>クラウドトーマスプロの料金相場：150,000円～</h3>
<img class="alignnone size-full wp-image-68455" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/kuraudoto-masupuro.jpg" alt="クラウドトーマスプロ" width="1636" height="496" />

（<a href="https://xn--gckr5a9ce1k1c3h.jp/lp/professional/">クラウドトーマスプロ</a>のHPから引用）

<span class="bold">クラウドトーマスプロの料金相場は150,000円～です。</span>

こちらは<span class="bold">月額基本料金</span>となっており、利用者がどのような運用をするかによって金額が増減します。

<img class="alignnone size-full wp-image-68532" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/to-masuproryoukin.jpg" alt="トーマスプロの料金" width="995" height="495" />

（トーマスプロの<a href="https://xn--gckr5a9ce1k1c3h.jp/lp/professional/">料金ぺージ</a>から引用）

<a href="https://xn--gckr5a9ce1k1c3h.jp/lp/professional/">クラウドトーマスプロ</a>は、<span class="bold">年間100社以上の利用実績</span>がある在庫管理システムです。

顧客の利用状況に合わせた<span class="bold">カスタマイズが得意</span>なので、複雑な在庫管理もお手のもの。

賞味期限管理やロット管理も可能なので、販売店のみならず<span class="bold">衣料品や食品在庫管理</span>もOKです。

複数の倉庫を抱えていてもクラウド上で繋がることが出来ますし、プロが<span class="bold">導入支援・導入後サポート</span>もしてくれるので安心ですね。
<table style="border-collapse: collapse; width: 100%;">
<tbody>
<tr>
<td style="width: 50%;">操作端末</td>
<td style="width: 50%;">スマホ・スキャナ・ハンディ―ターミナル</td>
</tr>
<tr>
<td style="width: 50%;">通信環境</td>
<td style="width: 50%;">Wi-Fi・SIM</td>
</tr>
<tr>
<td style="width: 50%;">適応現場</td>
<td style="width: 50%;">大規模</td>
</tr>
<tr>
<td style="width: 50%;">カスタマイズ</td>
<td style="width: 50%;">可能</td>
</tr>
<tr>
<td style="width: 50%;">料金形態</td>
<td style="width: 50%;">月額</td>
</tr>
<tr>
<td style="width: 50%;">サポート</td>
<td style="width: 50%;">導入サポート・導入後サポートあり</td>
</tr>
<tr>
<td style="width: 50%;">リアルタイム在庫管理</td>
<td style="width: 50%;">可能</td>
</tr>
</tbody>
</table>
<h3>コンビベースの料金相場：55,000円～900,000円</h3>
<img class="alignnone size-full wp-image-68533" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/konnbibe-su.jpg" alt="コンビベース" width="1482" height="547" />

（<a href="https://convibase.jp/">コンビベース</a>のHPから引用）

<span class="bold">コンビベースの料金相場は55,000円～900,000円です。</span>

料金に開きがありますが、これは初期導入費用が900,000円～になっているからです。

<img class="alignnone size-full wp-image-68534" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/konnbibe-suryoukin.jpg" alt="コンビベース料金" width="1501" height="659" />

（コンビベースの<a href="https://convibase.jp/pricing/">料金ぺージ</a>から引用）

<a href="https://convibase.jp/">コンビベース</a>は、<span class="bold">導入実績が1,100件を突破</span>している在庫管理システムです。

無料個別オンライン相談会があるだけでなく、気になったら<span class="bold">無料でデモ版を使用</span>することも可能です。

台帳機能やラベル発行機能などがあり、<span class="bold">モノの管理に特化</span>しています。

ユーザーサポートも充実しているので、導入後の運用も安心です。
<table style="border-collapse: collapse;">
<tbody>
<tr>
<td style="width: 50%;">操作端末</td>
<td style="width: 50%;">スマホ・ハンディ―ターミナル</td>
</tr>
<tr>
<td style="width: 50%;">通信環境</td>
<td style="width: 50%;">モバイルアプリでログイン</td>
</tr>
<tr>
<td style="width: 50%;">適応現場</td>
<td style="width: 50%;">中規模・モノの管理に特化</td>
</tr>
<tr>
<td style="width: 50%;">カスタマイズ</td>
<td style="width: 50%;">可能</td>
</tr>
<tr>
<td style="width: 50%;">料金形態</td>
<td style="width: 50%;">月額</td>
</tr>
<tr>
<td style="width: 50%;">サポート</td>
<td style="width: 50%;">導入サポート・導入後サポートあり</td>
</tr>
<tr>
<td style="width: 50%;">リアルタイム在庫管理</td>
<td style="width: 50%;">可能</td>
</tr>
<tr>
<td style="width: 50%;">月額料金</td>
<td style="width: 50%;">55,000円～100,000円</td>
</tr>
</tbody>
</table>
<h3>タナヨミの料金相場：56,500円～147,000円</h3>
<img class="alignnone size-full wp-image-68578" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/tanayomi.jpg" alt="タナヨミ" width="1418" height="549" />

（<a href="https://tanayomi.jp/#case">タナヨミ</a>のHPから引用）

<span class="bold">タナヨミの料金相場は56,500円～147,000円です。</span>

システム利用料と初期導入費用を含めた相場で、システム利用料は利用者により異なります。

<img class="alignnone size-full wp-image-68579" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/tanayomiryoukin.jpg" alt="タナヨミの料金相場" width="1446" height="491" />

（タナヨミの<a href="https://tanayomi.jp/#case">料金ぺージ</a>から引用）

<a href="https://tanayomi.jp/#case">タナヨミ</a>は管理システムのみならず、<span class="bold">倉庫業務全般のサポート</span>をしてくれる業者です。

利用している企業の<span class="bold">成長に合わせたカスタマイズ</span>が可能なのが魅力です。

導入前はもちろんのこと、導入後もしっかりとフォローやリモート保守を任せられます。

端末のレンタルをする事も可能で、オプションも豊富で<span class="bold">初心者でも使いやすい</span>サービスと言えます。
<table style="border-collapse: collapse;">
<tbody>
<tr>
<td style="width: 50%;">操作端末</td>
<td style="width: 50%;">スマホ・ハンディ―ターミナル</td>
</tr>
<tr>
<td style="width: 50%;">通信環境</td>
<td style="width: 50%; text-align: center;">ー</td>
</tr>
<tr>
<td style="width: 50%;">適応現場</td>
<td style="width: 50%;">医療材料・物流・アパレルなど</td>
</tr>
<tr>
<td style="width: 50%;">カスタマイズ</td>
<td style="width: 50%;">可能</td>
</tr>
<tr>
<td style="width: 50%;">料金形態</td>
<td style="width: 50%;">月額</td>
</tr>
<tr>
<td style="width: 50%;">サポート</td>
<td style="width: 50%;">導入前・導入後サポートあり、リモート保守</td>
</tr>
<tr>
<td style="width: 50%;">リアルタイム在庫管理</td>
<td style="width: 50%;">可能</td>
</tr>
<tr>
<td style="width: 50%;">月額料金（システム利用料のみ）</td>
<td style="width: 50%;">56,500円～100,000円</td>
</tr>
</tbody>
</table>
<h3>GoQSystemの料金相場：0円～100,000円</h3>
<img class="alignnone size-full wp-image-68580" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/gokuu.jpg" alt="GoQSystem" width="1776" height="694" />

（<a href="https://goqsystem.com/">GoQSystem</a>のHPから引用）

<span class="bold">GoQSystemの料金相場は0円～100,000円です。</span>

上記は初期費用と月額費用を合わせた相場で、少ない利用量であれば<span class="bold">無料で利用</span>出来ます。

<img class="alignnone size-full wp-image-68582" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/goqsystemryoukin.jpg" alt="GoQSystem料金" width="1621" height="328" />

（GoQSystemの<a href="https://goqsystem.com/plan">料金ぺージ</a>から引用）

<a href="https://goqsystem.com/">GoQSystem</a>は、これまでに<span class="bold">累計40,000以上の企業が使用している</span>在庫管理システムです。

全てのコースを<span class="bold">20日間無料でお試し</span>出来るだけでなく、利用量が少ない場合は何と初期費用・月額無料で使用する事が可能です。

ネットショップを運営している方に最適で、メルカリへの出品も簡単です。

ヤマト運輸と連携しているため、<span class="bold">運送関係の充実したサポート</span>が期待出来ます。
<table style="border-collapse: collapse;">
<tbody>
<tr>
<td style="width: 50%;">操作端末</td>
<td style="width: 50%;">パソコン</td>
</tr>
<tr>
<td style="width: 50%;">通信環境</td>
<td style="width: 50%; text-align: center;">ー</td>
</tr>
<tr>
<td style="width: 50%;">適応現場</td>
<td style="width: 50%;">ネットショップなど</td>
</tr>
<tr>
<td style="width: 50%;">カスタマイズ</td>
<td style="width: 50%;">自身である程度可能</td>
</tr>
<tr>
<td style="width: 50%;">料金形態</td>
<td style="width: 50%;">月額</td>
</tr>
<tr>
<td style="width: 50%;">サポート</td>
<td style="width: 50%;">連携サービス多数、導入サービスあり</td>
</tr>
<tr>
<td style="width: 50%;">リアルタイム在庫管理</td>
<td style="width: 50%;">可能</td>
</tr>
<tr>
<td style="width: 50%;">初期費用</td>
<td style="width: 50%;">0円～100,000円</td>
</tr>
<tr>
<td style="width: 50%;">月額料金</td>
<td style="width: 50%;">0円～64,800円</td>
</tr>
</tbody>
</table>
<h3>TEMPOSTARの料金相場：10,000円～110,000円</h3>
<img class="alignnone size-full wp-image-68604" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/tempostar.jpg" alt="TEMPOSTAR" width="1403" height="435" />

（<a href="https://commerce-star.com/">TEMPOSTAR</a>のHPから引用）

<span class="bold">TEMPOSTARの料金相場は2,200円～110,000円です。</span>

商品登録数と受注数によって金額が変わり、このふたつを足したものが月額料金となります。

<img class="alignnone size-full wp-image-68605" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/tempostarryoukin.jpg" alt="TEMPOSTARの料金" width="1060" height="387" />

（TEMPOSTARの<a href="https://commerce-star.com/plan/">料金ぺージ</a>から引用）

<a href="https://commerce-star.com/">TEMPOSTAR</a>は、複数の<span class="bold">ネットショップの在庫管理</span>を効率的に出来るシステムです。

料金システムは定額か従量課金から選ぶ事ができ、毎月の取引量にムラがある場合は従量課金制がおすすめです。

会社の成長に合わせて<span class="bold">システムカスタマイズが可能</span>で、サポートが随時相談に乗ってくれます。

ネットショップを運営しており、<span class="bold">複数のサイトで出品している方などにおすすめ</span>のシステムです。
<table style="border-collapse: collapse;">
<tbody>
<tr>
<td style="width: 50%;">操作端末</td>
<td style="width: 50%;">パソコン</td>
</tr>
<tr>
<td style="width: 50%;">通信環境</td>
<td style="width: 50%; text-align: center;">ー</td>
</tr>
<tr>
<td style="width: 50%;">適応現場</td>
<td style="width: 50%;">ネットショップなど</td>
</tr>
<tr>
<td style="width: 50%;">カスタマイズ</td>
<td style="width: 50%;">会社の成長に合わせて可能</td>
</tr>
<tr>
<td style="width: 50%;">料金形態</td>
<td style="width: 50%;">月額・従量課金</td>
</tr>
<tr>
<td style="width: 50%;">サポート</td>
<td style="width: 50%;">ヘルプサポート対応</td>
</tr>
<tr>
<td style="width: 50%;">リアルタイム在庫管理</td>
<td style="width: 50%;">可能</td>
</tr>
<tr>
<td style="width: 50%;">従量課金（月の商品登録量によって異なる）</td>
<td style="width: 50%;">2,200円～33,000円</td>
</tr>
<tr>
<td style="width: 50%;">月額料金</td>
<td style="width: 50%;">55,000円～110,000円</td>
</tr>
</tbody>
</table>
<h3>コマースロボの料金相場：5,000円～30,000円</h3>
<img class="alignnone size-full wp-image-68606" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/koma-surobo.jpg" alt="コマースロボ" width="1479" height="659" />

（<a href="https://www.commerce-robo.com/index.html">コマースロボ</a>のHPから引用）

<span class="bold">コマースロボの料金相場は5,000円～30,000円です。</span>

コマースロボは月額基本料金にプラスし、出荷件数によって支払う金額が変わります。

<img class="alignnone size-full wp-image-68607" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/koma-suroboryoukin.jpg" alt="コマースロボの料金" width="1287" height="490" />

（コマースロボの<a href="https://www.commerce-robo.com/price.html">料金ぺージ</a>から引用）

<a href="https://www.commerce-robo.com/index.html">コマースロボ</a>は、<span class="bold">ネットショップを運営している方向け</span>の在庫管理システムです。

<span class="bold">950社以上が導入</span>しており、有名なショッピングサイトと多数連携しています。

在庫管理のみならず、商品の発送通知などの面倒な作業も自動化する事が可能です。

導入支援から運用支援まで<span class="bold">手寧なサポートが受けられる</span>のも嬉しいポイントですね。
<table style="border-collapse: collapse;">
<tbody>
<tr>
<td style="width: 50%;">操作端末</td>
<td style="width: 50%;">パソコン</td>
</tr>
<tr>
<td style="width: 50%;">通信環境</td>
<td style="width: 50%; text-align: center;">ー</td>
</tr>
<tr>
<td style="width: 50%;">適応現場</td>
<td style="width: 50%;">ネットショップなど</td>
</tr>
<tr>
<td style="width: 50%;">カスタマイズ</td>
<td style="width: 50%;">会社の成長に合わせて可能</td>
</tr>
<tr>
<td style="width: 50%;">料金形態</td>
<td style="width: 50%;">月額・従量課金</td>
</tr>
<tr>
<td style="width: 50%;">サポート</td>
<td style="width: 50%;">ヘルプサポート対応</td>
</tr>
<tr>
<td style="width: 50%;">リアルタイム在庫管理</td>
<td style="width: 50%;">可能</td>
</tr>
<tr>
<td style="width: 50%;">月額料金</td>
<td style="width: 50%;">5,000円～30,000円</td>
</tr>
</tbody>
</table>
<h3>在庫管理システムの料金相場まとめ</h3>
ここまで紹介した在庫管理システムの料金相場を表にまとめました。

それぞれの特徴も比較しているので参考にして下さいね。
<table style="border-collapse: collapse; width: 100%;">
<tbody>
<tr>
<td style="width: 10%;">システム名</td>
<td style="width: 10%;">適応現場</td>
<td style="width: 10%;">サポート</td>
<td style="width: 10%;">リアルタイム在庫</td>
<td style="width: 10%;">料金形態</td>
<td style="width: 10%;">料金相場</td>
<td style="width: 10%;">特徴</td>
</tr>
<tr>
<td style="width: 10%;">クラウドトーマスプロ</td>
<td style="width: 10%;">大規模な倉庫もOK</td>
<td style="width: 10%;">導入・導入後サポート</td>
<td style="width: 10%;">可能</td>
<td style="width: 10%;">月額</td>
<td style="width: 10%;">150,000円～</td>
<td style="width: 10%;">年間100社以上の実績あり、複数の倉庫をクラウド上で繋げられる</td>
</tr>
<tr>
<td style="width: 10%;">コンビベース</td>
<td style="width: 10%;">モノの管理に特化</td>
<td style="width: 10%;">保守サポートあり</td>
<td style="width: 10%;">可能</td>
<td style="width: 10%;">月額・初期導入サポートあり</td>
<td style="width: 10%;">55,000円～900,000円</td>
<td style="width: 10%;">1,100社以上の導入実績あり、モノの管理に特化しており、低コストで始める事も可能</td>
</tr>
<tr>
<td style="width: 10%;">タナヨミ</td>
<td style="width: 10%;">倉庫業務全般</td>
<td style="width: 10%;">導入・導入後サポート</td>
<td style="width: 10%;">可能</td>
<td style="width: 10%;">月額・初期導入費用あり</td>
<td style="width: 10%;">56,500円～147,000円</td>
<td style="width: 10%;">端末のレンタルが可能で、各種オプションが豊富。解約費用無しが嬉しい</td>
</tr>
<tr>
<td style="width: 10%;">GoQSystem</td>
<td style="width: 10%;">ネットショップ</td>
<td style="width: 10%;">サポート充実</td>
<td style="width: 10%;">可能</td>
<td style="width: 10%;">月額・初期導入費用あり</td>
<td style="width: 10%;">0円～100,000円</td>
<td style="width: 10%;">40,000件以上の企業が使用しており、通販業務特化のシステム。無料で利用出来る可能性もあり</td>
</tr>
<tr>
<td style="width: 10%;">TEMPOSTAR</td>
<td style="width: 10%;">ネットショップ</td>
<td style="width: 10%;">ヘルプサポート</td>
<td style="width: 10%;">可能</td>
<td style="width: 10%;">月額＋従量課金</td>
<td style="width: 10%;">10,000円～110,000円</td>
<td style="width: 10%;">複数のネットショップを連携して自動化が可能。受注管理もOK</td>
</tr>
<tr>
<td style="width: 10%;">コマースロボ</td>
<td style="width: 10%;">ネットショップ</td>
<td style="width: 10%;">導入・運用支援あり</td>
<td style="width: 10%;">可能</td>
<td style="width: 10%;">月額＋重量課金</td>
<td style="width: 10%;">5,000円～30,000円</td>
<td style="width: 10%;">950社導入実績あり、発送通知などの面倒な作業も自動化出来る</td>
</tr>
</tbody>
</table>
<span class="bold">在庫管理システムの料金相場は0円～900,000円です。</span>

この数字は導入費用も含まれており、<span class="bold">月額利用料金だけの料金相場は0円～110,000円です。</span>

導入費用がある業者、月額料金にプラスして従量課金がある業者など料金プランの特徴は様々です。

基本的に倉庫に登録する在庫量や、受注数が多いほど月額費用は高くなります。
<h2>在庫管理システムの選び方</h2>
在庫管理システムは多くあり、各社それぞれの特徴で勝負しています。

どのように在庫管理システムを選べばいいのでしょうか。
<h3>必要な機能を絞り込む</h3>
在庫管理システム業界は日々進化しており、どんどん便利になっています。

ですが、便利な機能が多くなるほど使用料金は高くなってしまうもの。

<span class="bold">自社に必要な機能を絞り込む</span>事で、在庫管理システムを選びやすくなります。

<img class="alignnone size-full wp-image-68608" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/kinounituite.jpg" alt="機能面について" width="1345" height="543" />

（<a href="https://convibase.jp/product/">コンビベース</a>のHPから引用）

例えばコンビベースの在庫管理システムは、オプション機能を組み合わせることで幅広い業務に対応しています。

在庫管理以外の機能が自社にとって必要かどうかを考えましょう。
<table style="border-collapse: collapse; width: 100%;">
<tbody>
<tr>
<td style="width: 13.7851%;">クラウドトーマスプロ</td>
<td style="width: 46.2149%;">ハンディ―ターミナルを使った管理・賞味期限管理・ロット管理・複数倉庫をクラウド上で繋げられる</td>
</tr>
<tr>
<td style="width: 13.7851%;">コンビベース</td>
<td style="width: 46.2149%;">台帳機能・棚卸・貸出・入出庫機能・オプション多数</td>
</tr>
<tr>
<td style="width: 13.7851%;">タナヨミ</td>
<td style="width: 46.2149%;">在庫管理だけでなく倉庫業務全般サポートが可能</td>
</tr>
<tr>
<td style="width: 13.7851%;">GoQSystem</td>
<td style="width: 46.2149%;">ヤマト運輸と連携可能・送り状伝票の発行も可能</td>
</tr>
<tr>
<td style="width: 13.7851%;">TEMPOSTAR</td>
<td style="width: 46.2149%;">複数のネットショップを連携・受注管理・商品管理も可能</td>
</tr>
<tr>
<td style="width: 13.7851%;">コマースロボ</td>
<td style="width: 46.2149%;">受注管理・在庫管理・出荷管理</td>
</tr>
</tbody>
</table>
<h3>セキュリティも重視する</h3>
在庫管理システムでは、自社が抱えている商品の数や金額などたくさんのデータを登録する事になります。

在庫データは大事な企業情報なので、情報漏洩させないためにも<span class="bold">セキュリティがしっかりしている所</span>を選びましょう。

<img class="alignnone size-full wp-image-68609" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/sekyurithini.jpg" alt="セキュリティについて" width="1321" height="586" />

（<a href="https://www.commerce-robo.com/index.html">コマースロボ</a>のHPから引用）

コマースロボでは、丁寧なサポートと万全なセキュリティサービスを受ける事が可能です。

情報のバックアップもされているので、不測の事態が起きても安心ですね。
<table style="border-collapse: collapse; width: 100%;">
<tbody>
<tr>
<td style="width: 18.7912%;">クラウドトーマスプロ</td>
<td style="width: 41.2088%;">クラウド上で倉庫を連携するためセキュリティ面が強化されている</td>
</tr>
<tr>
<td style="width: 18.7912%;">コンビベース</td>
<td style="width: 41.2088%;">データ暗号化などの対策あり</td>
</tr>
<tr>
<td style="width: 18.7912%;">タナヨミ</td>
<td style="width: 41.2088%; text-align: center;">ー</td>
</tr>
<tr>
<td style="width: 18.7912%;">GoQSystem</td>
<td style="width: 41.2088%;">セキュリティポリシーに従った運営・対策がされている</td>
</tr>
<tr>
<td style="width: 18.7912%;">TEMPOSTAR</td>
<td style="width: 41.2088%; text-align: center;">ー</td>
</tr>
<tr>
<td style="width: 18.7912%;">コマースロボ</td>
<td style="width: 41.2088%;">暗号化通信などセキュリティ面は万全</td>
</tr>
</tbody>
</table>
<h3>サポート体制があるか確認する</h3>
在庫管理システムの導入前はもちろんのこと、導入後にもトラブルは起こるものです。

使用しているうちに「こんな機能が欲しい」「カスタマイズしたい」と思う事も出てきます。

そんな時に<span class="bold">気軽に相談でき、親切に対応してくれる業者</span>を選びましょう。

<img class="alignnone size-full wp-image-68610" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/sapo-to.jpg" alt="サポート体制について" width="1541" height="417" />

（<a href="https://tanayomi.jp/#flow">タナヨミ</a>のHPから引用）

タナヨミでは遠隔でリモート対応出来るように設定してくれるオプションサービスがあります。

遠隔サポートがあれば、急ぎで確認したいことがあってもすぐに対応して貰えるというメリットがあります。
<table style="border-collapse: collapse; width: 100%;">
<tbody>
<tr>
<td style="width: 18.7912%;">クラウドトーマスプロ</td>
<td style="width: 41.2088%;">プロによる導入支援・導入後サポートあり</td>
</tr>
<tr>
<td style="width: 18.7912%;">コンビベース</td>
<td style="width: 41.2088%;">ユーザーサポートあり</td>
</tr>
<tr>
<td style="width: 18.7912%;">タナヨミ</td>
<td style="width: 41.2088%; text-align: left;">遠隔保守サービスあり</td>
</tr>
<tr>
<td style="width: 18.7912%;">GoQSystem</td>
<td style="width: 41.2088%;">導入後サポートが充実している</td>
</tr>
<tr>
<td style="width: 18.7912%;">TEMPOSTAR</td>
<td style="width: 41.2088%; text-align: left;">導入から活用までサポートして貰える</td>
</tr>
<tr>
<td style="width: 18.7912%;">コマースロボ</td>
<td style="width: 41.2088%;">導入から運用までサポートして貰える</td>
</tr>
</tbody>
</table>
<h2>在庫管理システムを安く利用する方法</h2>
在庫管理システムは基本的に月額利用料を支払う所が多く、ランニングコストがかさみます。

少しでも安く利用するにはどうしたらいいのでしょうか。
<h3>キャンペーンを利用する</h3>
それぞれの業者で開催されているキャンペーンを利用する方法があります。

いくつかの<span class="bold">業者のキャンペーン内容を比較</span>し、よりお得な方を選びましょう。

<img class="alignnone size-full wp-image-68611" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/waribiki.jpg" alt="割引について" width="1330" height="358" />

（<a href="https://goqsystem.com/">GoQSystem</a>のHPから引用）

GoQSystemはかなり規模の大きい業者なので、割引制度が充実しています。

初めて利用する方だけでなく、かつてGoQSystemを利用していた方向けの割引制度も用意されてるのでチェックしてみて下さいね。
<table style="border-collapse: collapse; width: 100%; height: 258px;">
<tbody>
<tr style="height: 43px;">
<td style="width: 18.7912%; height: 43px;">クラウドトーマスプロ</td>
<td style="width: 41.2088%; height: 43px; text-align: center;">ー</td>
</tr>
<tr style="height: 43px;">
<td style="width: 18.7912%; height: 43px;">コンビベース</td>
<td style="width: 41.2088%; height: 43px; text-align: center;">ー</td>
</tr>
<tr style="height: 43px;">
<td style="width: 18.7912%; height: 43px;">タナヨミ</td>
<td style="width: 41.2088%; height: 43px; text-align: center;">ー</td>
</tr>
<tr style="height: 43px;">
<td style="width: 18.7912%; height: 43px;">GoQSystem</td>
<td style="width: 41.2088%; height: 43px;">初期費用最大10万円引きキャンペーンあり・他社からの乗り換えで3ヶ月無料</td>
</tr>
<tr style="height: 43px;">
<td style="width: 18.7912%; height: 43px;">TEMPOSTAR</td>
<td style="width: 41.2088%; text-align: left; height: 43px;">メルカリとの連携で2ヶ月10％引き</td>
</tr>
<tr style="height: 43px;">
<td style="width: 18.7912%; height: 43px;">コマースロボ</td>
<td style="width: 41.2088%; height: 43px; text-align: center;">ー</td>
</tr>
</tbody>
</table>
<h3>IT導入補助金を使う</h3>
<span class="bold">IT導入補助金を利用して補助金を貰える</span>場合があります。

中小企業が新たなツールを利用する時など、条件に合った場合に補助金が支給される制度です。

<img class="alignnone size-full wp-image-68612" src="https://context-japan.jp/ryoukin/wp-content/uploads/2024/04/IThojyokin.jpg" alt="IT補助金" width="1230" height="386" />

（TEMPOSTARのIT<a href="https://commerce-star.com/plan/hojyokin/">補助金ぺージ</a>から引用）

TEMPOSTARでは、IT補助金制度を使う事で導入費用の4分の3を補助して貰えます。

他の企業を利用する場合も、見積もりの時点でIT補助金制度を利用出来ないか相談してみるといいでしょう。

IT補助金について更に詳しく知りたい場合は、<a href="https://it-shien.smrj.go.jp/">IT補助金2024</a>のサイトをご覧下さい。
<table style="border-collapse: collapse; width: 100%; height: 254px;">
<tbody>
<tr style="height: 43px;">
<td style="width: 18.7912%; height: 43px;">クラウドトーマスプロ</td>
<td style="width: 41.2088%; height: 43px; text-align: center;">ー</td>
</tr>
<tr style="height: 43px;">
<td style="width: 18.7912%; height: 43px;">コンビベース</td>
<td style="width: 41.2088%; height: 43px; text-align: center;">ー</td>
</tr>
<tr style="height: 43px;">
<td style="width: 18.7912%; height: 43px;">タナヨミ</td>
<td style="width: 41.2088%; height: 43px; text-align: center;">ー</td>
</tr>
<tr style="height: 43px;">
<td style="width: 18.7912%; height: 43px;">GoQSystem</td>
<td style="width: 41.2088%; height: 43px; text-align: center;">ー</td>
</tr>
<tr style="height: 43px;">
<td style="width: 18.7912%; height: 39px;">TEMPOSTAR</td>
<td style="width: 41.2088%; text-align: left; height: 39px;">IT補助金適用で導入費用の4分の3が支給される</td>
</tr>
<tr style="height: 43px;">
<td style="width: 18.7912%; height: 43px;">コマースロボ</td>
<td style="width: 41.2088%; height: 43px; text-align: center;">ー</td>
</tr>
</tbody>
</table>
<h2>在庫管理システムの料金相場と選び方、安くする方法</h2>
在庫管理システムの、初期導入費用を抜いた<span class="bold">月額利用料金の料金相場は0円～110,000円です。</span>

在庫管理システムを選ぶ時は、自社に必要な機能が揃っているかに注目しましょう。

多くの機能が付いている在庫管理システムが便利に感じるかもしれませんが、使わない機能の分までお金を払うのはもったいないですよね。

また導入にも手間がかかりますし、在庫管理システム運用に慣れるまでサポートしてくれる所を選びましょう。

安く利用したい場合は各種キャンペーンを利用するか、IT補助金が使えないか確認しましょう。`;

function test() {
  elem.inputArea.value = testDraft;
  main();
}
test();
