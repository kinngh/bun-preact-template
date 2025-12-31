# Bun Preact Template - WIP

## Server

- Bun HTTP server + `@attayjs/server`
- Database: Prisma ^6 + Kysely
  - PlanetScale / MySQL, of course.
  - Use Prisma Schema to generate Kysely types and help with `db push` and `db pull` commands, along with easy migrations

## Client

- Preact
- Routing: `preact-iso` + `@attayjs/client`

## `@attayjs`

[Attay](https://github.com/kinngh/attayjs) is a set of helper functions I wrote that sit alongside Bun and Preact to make working with them easier.
