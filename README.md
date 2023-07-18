## Description

This is a challenge

The Challenge:

Implement a REST endpoint and simple client that will accept a query parameter for an electronic part, and return data aggregated from various supplier APIs. For the purpose of this assignment, the supplier APIs have been simplified to two publicly accessible JSON files, and the only data we should expect to see aggregated would come from part number `0510210200`. It is okay to return the data as JSON rendered in your simple client. Imagine, that this system is going to be running in production and is going to be accessed by the public.

## About this application

This application queries some supplier endpoints, aggregates the data a returns the data formatted.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

The application is served on port 3080.

## Swagger Docs

API endpoints are documented on swagger and can be accessed here:

`http://localhost:3080/api`
