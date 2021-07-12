// Require dependencies
const express = require('express');
const DataStore = require('nedb');
const fetch = require('node-fetch');
require('dotenv').config()

// Create express server
const app = express();
app.listen(3000, () => console.log('Listening at 3000'));
app.use(express.static('public')); // Host static files
app.use(express.json({limit:'1mb'})); // limit 1mb used, see express documentation

// Create and load the NeDB database
// I intend to allow the user to save locations 
const database = new DataStore('database.db');
database.loadDatabase();

// Store the current latitude and longitude to send to viewMap.html
let weatherData = {};

// Get the Latitude and Longitude from the client as parameters, make a call to the national 
// weather service API to get the forecast, and send the forecast back to the client. This
// requires installing node-fetch (npm install node-fetch) and requiring it in dependencies.
// Parameters are specified by a colon and referenced with request.params 
app.get('/weather/:location', async (request, response) => {
  // For Convenience, split the params by commas into an array and put them in variables 
  const location = request.params.location.split(',');
  const lat = location[0];
  const lon = location[1];

  // Forecasts are divided into 2.5km grids. Each NWS office is responsible for a section of the grid. 
  // Get the office, gridX, gridY with the latitude and longitude, to use in the call to get the forecast
  const nws_office_api = `https://api.weather.gov/points/${lat},${lon}`;
  const nws_office = await fetch(nws_office_api);
  const office = await nws_office.json();

  // Get the weather forecast with the office gridId, gridX, and gridY properties
  // (https://api.weather.gov/gridpoints/{office}/{grid X},{grid Y}/forecast)
  const nws_forecast_api = `https://api.weather.gov/gridpoints/${office.properties.gridId}/${office.properties.gridX},${office.properties.gridY}/forecast`;
  const get_forecast = await fetch(nws_forecast_api);
  const forecast = await get_forecast.json();

  response.json(forecast);
}); 

// Get the Air Quality from open weather map and send it to index.html
// Get the Latitude and Longitude from the client as parameters, make a call to the open weather map API
// to receive the air quality and send that data back to the client
app.get('/air/:location', async (request, response) => {
   // For Convenience, split the params by commas into an array and put them in variables 
   const location = request.params.location.split(',');
   const lat = location[0];
   const lon = location[1];

  // Get the air quality form the open weather map api
  // http://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=50&lon=50&appid={API key}
  const key = process.env.OPEN_WEATHER_KEY;
  const air_quality_api =`http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${key}`;
  const get_air_quality = await fetch(air_quality_api);
  const air_quality = await get_air_quality.json();
  response.json(air_quality);
});

// Store the user's saved locations and weather data in the database
// This happens when the user clicks save location in index.html
app.post('/saveLocation', (request, response) => {
  const data = request.body;
  database.insert(data);
  response.end();
});

// Store the data: location, forecast, air quality and time in the weatherData object
// This happens when the page is loaded and the user has allowed geolocation
app.post('/sendData', (request, response) => {
  const data = request.body;
  weatherData = data;
  response.end();
});  

// Send the current location and forecast to viewMap.html
app.get('/getData', (_request, response) => {
  response.json(weatherData);
});  

