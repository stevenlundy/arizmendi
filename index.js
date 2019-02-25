// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const express = require('express')
const app = express()
var bodyParser = require('body-parser')
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const request = require('request-promise-native');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

function sameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

const ARIZMENDI_API = "https://api.apify.com/v2/actor-tasks/dmRyLwsXpREsMLDAH/runs/last/dataset/items?token=j7sKPdBY8XTrXnbKYXbHbiwbS";
function getPizzas() {
  return request(ARIZMENDI_API).then((body) => JSON.parse(body));
}

app.use(bodyParser.json())

app.post('*', function(request, response) {
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
        let pizzaDate = new Date(pizzaSchedule[i].date)
        if (sameDay(pizzaDate, dateOfInterest)) {
          agent.add("The pizza on " + dateOfInterest.toDateString() + " will have " + pizzaSchedule[i].toppings);
          console.log("found a pizza");
          return;
        }
      }
      console.log("no pizza on that day");
      agent.add("I couldn't find a pizza for that date");
    }).catch(function(err) {
      console.log(err);
      console.log('Something went wrong');
      agent.add('Something went wrong!');
    });
  }

  let intentMap = new Map();
  intentMap.set('pizza-schedule', pizzaSchedule);
  agent.handleRequest(intentMap);
});

app.get('*', function(request, response) {
  getPizzas().then(function(pizzaSchedule) {
    response.send(pizzaSchedule);
  });
});

if (require.main === module) {
  app.listen(3000);
} else {
  module.exports = app;
}
