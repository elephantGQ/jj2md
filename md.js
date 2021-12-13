const puppeteer = require("puppeteer");
const TurndownService = require("turndown");
const $ = require("jquery")
const fs = require("fs");
let [url] = process.argv.splice(2);

function htmlTableToJson(table) {
  table = $(table);
  let data = {
    theaders: [],
    tbodys: []
  };
  let colsLength = $(table.find("thead tr")[0]).find("th").length;
  let rowsLength = $(table.find("tbody tr")).length;

  for (let i = 0; i < colsLength; i++) {
    data.theaders[i] = $(table.find("thead tr")[0])
      .find("th")
      .eq(i)
      .text();
  }

  for (let i = 0; i < rowsLength; i++) {
    let tableRow = $(table.find("tbody tr")[i]);
    let rowData = [];
    for (let j = 0; j < colsLength; j++) {
      rowData.push(
        tableRow
          .find("td")
          .eq(j)
          .text()
      );
    }
    data.tbodys.push(rowData);
  }
  return data;
}
let turndownService = new TurndownService();
// 定义一下table的规则
turndownService.addRule("table", {
  filter: ["table"],
  replacement: function(content, node, options) {
    let { theaders, tbodys } = htmlTableToJson(node);
    let len = theaders.length;
    let tableStr = "";
    tableStr += `|${theaders.join("|")}|`;
    tableStr += "\n|" + "-|".repeat(len);
    for (let ele of tbodys) {
      tableStr += `\n|${ele.join("|")}|`;
    }
    return tableStr;
  }
});

(async () => {
  const browser = await puppeteer.launch({ headless: true, devtools: false });
  const page = await browser.newPage();
  await page.goto(url);
  const goal = await page.$$eval(".article", (doms) => {
    let imgs = doms[0].querySelectorAll(".lazyload.inited");
    imgs.forEach(ele =>{
      ele.src = ele.getAttribute('data-src').replace('/webp/','jpg');
    });   
    let title = doms[0].querySelector(".article-title").innerHTML;
    let content =
      doms[0].querySelector(".article-title").outerHTML +
      "" +
      doms[0].querySelector(".article-content").innerHTML;
    let all = doms[0].innerHTML;
    return { title, content, all };
  });
  let md = turndownService.turndown(goal.content);
  fs.writeFile(`${goal.title}.md`, md, function (err) {
    if (err) {
      return console.log(err);
    }
  });
  await page.evaluate((md) => {
    console.log("md", md);
    var input = document.createElement("textarea");
    document.body.appendChild(input);
    input.setAttribute("readonly", "");
    input.value = md;
    input.select();
    if (document.execCommand("copy")) {
      document.execCommand("copy");
    }
    document.body.removeChild(input);
  }, md);
  await browser.close();
  console.log(`执行成功,已生成${goal.title}.md,已复制到粘贴板`);
})();
