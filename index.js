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

function dateString(date) {
  return date.toISOString().substring(0,10);
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

  function getPizzasWithToppings(agent) {
    return getPizzas().then(function(pizzaSchedule) {
      pizzaSchedule.forEach(function(pizza) {
        pizza.numMatches = agent.parameters.toppings.reduce(function(numMatches, topping) {
          return pizza.toppings.toLowerCase().includes(topping.toLowerCase()) ? numMatches + 1 : numMatches;
        }, 0);
      });

      let pizzasWithToppings = pizzaSchedule.filter(p => p.numMatches > 0);

      if (pizzasWithToppings.length === 0) {
        console.log("no pizzas found");
        agent.add("I can't find any pizzas like that.");
        return;
      }
      let upcomingPizzasWithToppings = pizzasWithToppings.filter(function (pizza) {
        return dateString(new Date(pizza.date)) >= dateString(new Date());
      });

      if (upcomingPizzasWithToppings.length === 0) {
        console.log("no pizzas found");
        agent.add("They had one like that this week, but you missed it!");
        return;
      }

      let exactMatches = upcomingPizzasWithToppings.filter(p => p.numMatches === agent.parameters.toppings.length);

      if (exactMatches.length > 1) {
        let message = "I found a couple pizzas like that. ";
        exactMatches.forEach(function(pizza) {
          let pizzaDate = new Date(pizza.date)
          message += "On " + pizzaDate.toDateString() + " the pizza is " + pizza.toppings + ". "
        });
        agent.add(message);
      } else if (exactMatches.length === 1) {
        let pizzaDate = new Date(exactMatches[0].date);
        agent.add("The pizza on " + pizzaDate.toDateString() + " will have " + exactMatches[0].toppings)
      } else {
        upcomingPizzasWithToppings.sort((p1, p2) => p2.numMatches - p1.numMatches);
        let message = "I couldn't find a pizza exactly like that, but here's what I found. ";
        upcomingPizzasWithToppings.forEach(function(pizza) {
          let pizzaDate = new Date(pizza.date)
          message += "On " + pizzaDate.toDateString() + " the pizza is " + pizza.toppings + ". "
        });
        agent.add(message);
      }
    }).catch(function(err) {
      console.log(err);
      console.log('Something went wrong');
      agent.add('Something went wrong!');
    });
  }

  let intentMap = new Map();
  intentMap.set('pizza-schedule', pizzaSchedule);
  intentMap.set('Find pizza with topping', getPizzasWithToppings);
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
