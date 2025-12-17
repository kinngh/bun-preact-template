# Bun Preact Template - WIP

## Server

- Bun HTTP server
  - `index.js`: Allows for file base route creation
- Database: Prisma 6 + Kysely
  - PlanetScale / MySQL.
  - Use Prisma Schema to generate Kysely types
    - I'm most likely gonna drop Prisma completely after I get comfortable with writing Kysely schemas directly, but using Prisma Schema is a great way to migrate and keep moving forward.

## Client

- Preact
- Routing: `preact-iso` + helper functions for page based routing
  - I really like the `const router = useRouter()` style that I'm used to with `push()` and other related methods, so writing a small layer to enable scanning `src/pages/` and using file based routing was a fun little thing to do.
