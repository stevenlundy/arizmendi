// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const cheerio = require('cheerio');
const request = require('request-promise-native');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

function findElementByText(elements, searchText) {
  let el = elements;
  for (let i = 0; i < elements.length; i++) {
    if (el.first().text() === searchText) {
      return el;
    }
    el = el.next();
  }
}

function sameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

const ARIZMENDI_MENU_URL = "http://arizmendi-valencia.squarespace.com/pizza/?format=json-pretty";
function getPizzas(callback) {
  return request({
    url: ARIZMENDI_MENU_URL,
    json: true,
    headers: {
      'user-agent': "WebKit/Blink"
    }
  }).then(function(body) {
    let $ = cheerio.load(body.mainContent);
    let titleDiv = findElementByText($('div'), "THIS WEEK'S PIZZA");
    let pizzasDiv = titleDiv.next().next();

    let pizzas = [];
    let el = pizzasDiv.children().children().first();
    for (let i = 0; i < pizzasDiv.children().children().length; i++) {
      let pizzaDate = new Date(el.text());
      if (!isNaN(pizzaDate)) {
        el = el.next();
        i++;
        let toppings = el.text();
        pizzas.push({date: pizzaDate, toppings: toppings});
      }
      el = el.next();
    }
    return pizzas;
  });
}

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  function pizzaSchedule(agent) {
    return getPizzas().then(function(pizzaSchedule) {
      if (pizzaSchedule.length === 0) {
        console.log("no pizzas found");
        agent.add("It looks their aren't any pizzas available.");
        return;
      }
      let dateOfInterest = new Date(agent.parameters.date);
      for (let i = 0; i < pizzaSchedule.length; i++) {
        if (sameDay(pizzaSchedule.date == dateOfInterest)) {
          agent.add("The pizza on " + dateOfInterest.toDateString() + " will have " + pizzaSchedule.toppings);
          console.log("found a pizza");
          return;
        }
      }
      console.log("no pizza on that day");
      agent.add("I couldn't find a pizza for that date");
    }).catch(function(err) {
      console.log(err);
      agent.add('Something went wrong!');
    });
  }

  let intentMap = new Map();
  intentMap.set('pizza-schedule', pizzaSchedule);
  agent.handleRequest(intentMap);
});
