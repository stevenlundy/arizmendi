/*
This task is run on apify.com (running with apify/cheerio-scraper)
on Wednesdays to update the cached pizza schedule
Most recent schedule at https://api.apify.com/v2/actor-tasks/64x34o6KFJTPS8sBp/runs/last/dataset/items?token=j7sKPdBY8XTrXnbKYXbHbiwbS&status=SUCCEEDED
config:
{
  "startUrls": [
    {
      "url": "http://arizmendi-valencia.squarespace.com/pizza/",
      "method": "GET",
      "headers": {
        "user-agent": "WebKit/Blink"
      }
    }
  ],
  "useRequestQueue": false,
  "linkSelector": "a",
  "pageFunction": <see below>,
  "proxyConfiguration": {
    "useApifyProxy": false
  },
  "debugLog": false,
  "ignoreSslErrors": false,
  "maxRequestRetries": 0,
  "maxPagesPerCrawl": 10
}
 */

async ({ $, request }) => {
    let pizzasDiv = $('#block-yui_3_17_2_41_1459301702914_18062')

    let pizzas = [];
    let el = pizzasDiv.children().children().first();
    for (let i = 0; i < pizzasDiv.children().children().length; i++) {
        let pizzaDate = new Date(el.text() + " GMT-07:00"); // Set timezone
        console.log(pizzaDate)
        if (!isNaN(pizzaDate)) {
            el = el.next();
            i++;
            let toppings = el.text();
            console.log(toppings)
            pizzas.push({date: pizzaDate, toppings: toppings});
        }
        el = el.next();
    }
    return pizzas;
}
