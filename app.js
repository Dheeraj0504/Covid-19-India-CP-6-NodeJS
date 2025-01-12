const express = require('express');
const path = require('path');

const {open} = require('sqlite');
const sqlite3 = require('sqlite3');

const databasePath = path.join(__dirname, 'covid19India.db');
const app = express();
app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/');
    });
  } 
  catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//State Table
const convertStateDbObjectToResponseObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
};

//District Table
const convertDistrictDbObjectToResponseObject = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
};

//API 1:Returns a list of all states in the state table
app.get('/states/', async (request, response) => {
  const getStatesQuery = `
    SELECT
      *
    FROM
      state;
  `;
  const statesArray = await database.all(getStatesQuery);
  response.send(
    statesArray.map(eachState =>
      convertStateDbObjectToResponseObject(eachState),
    ),
  );
});

//API 2:Returns a state based on the state ID
app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params;
  //console.log(stateId);
  const getStateQuery = `
    SELECT 
      *
    FROM 
      state 
    WHERE 
      state_id = ${stateId};
  `;
  const state = await database.get(getStateQuery);
  response.send(convertStateDbObjectToResponseObject(state));
});

//API 3:Create a district in the district table
app.post('/districts/', async (request, response) => {
  const {stateId, districtName, cases, cured, active, deaths} = request.body;
  const createDistrictQuery = `
    INSERT INTO
      district (state_id, district_name, cases, cured, active, deaths)
    VALUES
      (
        ${stateId}, 
        '${districtName}', 
        ${cases}, 
        ${cured}, 
        ${active}, 
        ${deaths}
      );
  `;
  const districtResponse = await database.run(createDistrictQuery);
  //console.log(districtResponse);
  response.send('District Successfully Added');
});

//API 4:Returns a district based on the district ID
app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `
    SELECT
      *
    FROM
     district
    WHERE
      district_id = ${districtId};
  `;
  const district = await database.get(getDistrictQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

//API 5:Deletes a district from the district table based on the district ID
app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteDistrictQuery = `
  DELETE FROM
    district
  WHERE
    district_id = ${districtId};
  `;
  await database.run(deleteDistrictQuery);
  response.send('District Removed');
});

//API 6:Updates the details of a specific district based on the district ID
app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params;
  const {districtName, stateId, cases, cured, active, deaths} = request.body;
  const updateDistrictQuery = `
    UPDATE
      district
    SET
      district_name = '${districtName}',
      state_id = ${stateId},
      cases = ${cases},
      cured = ${cured},
      active = ${active}, 
      deaths = ${deaths}
    WHERE
      district_id = ${districtId};
  `;
  const updatedResponse = await database.run(updateDistrictQuery);
  //console.log(updatedResponse);
  response.send('District Details Updated');
});

//API 7:Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID
app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params;
  const getStateStatisticsQuery = `
    SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM
      district
    WHERE
      state_id=${stateId};
  `;
  const statistics = await database.get(getStateStatisticsQuery);
  response.send({
    totalCases: statistics['SUM(cases)'],
    totalCured: statistics['SUM(cured)'],
    totalActive: statistics['SUM(active)'],
    totalDeaths: statistics['SUM(deaths)'],
  });
});

//API 8:Returns an object containing the state name of a district based on the district ID
app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params;
  const getStateNameQuery = `
    SELECT
      state_name
    FROM
      district
    NATURAL JOIN
      state
    WHERE 
      district_id=${districtId};
  `;
  const state = await database.get(getStateNameQuery);
  response.send({stateName: state.state_name});
});

//Returns a list of all districts in the district table
app.get('/districts/', async (request, response) => {
  const getDistrictsQuery = `
    SELECT 
      *
    FROM
      district;    
  `;
  const districtsArray = await database.all(getDistrictsQuery);
  response.send(
    districtsArray.map(eachdistrict =>
      convertDistrictDbObjectToResponseObject(eachdistrict),
    ),
  );
});

module.exports = app;
