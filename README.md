# Event Sourcing with NestJS and EventStoreDB

The goal of this project is to provide a restaurant booking system with event sourcing and CQRS using NestJS and EventStoreDB.

This project is composed of 2 services : 
- Booker service : responsible for booking a table in the restaurant
- Table manager service : responsible for managing tables in the restaurant

## Prerequisites

Before you can run this project, you need to have the following installed on your machine:

- pnpm
- Node.js
- Docker

## Running the application

1. Clone this repository
2. Run `pnpm install` to install dependencies
3. Run `docker compose up -d` to start services
4. Run bash `cp services/booker/.env.dist services/booker/.env` to copy env default
5. Run bash `cp services/table-manager/.env.dist services/booker/.env` to copy env default
6. Run `pnpm build` to build projects
7. Run `pnpm migrate:dev` to run migrations
8. Run `pnpm start:dev` to start both services

## API documentation 

Once services are started, you can access the API documentation at the following URLs:
- [Booker API documentation](http://localhost:3000/api)
- [Table manager API documentation](http://localhost:3001/api)

## Contributing

Contributions are welcome. Please open up an issue or create PR if you would like to help out.