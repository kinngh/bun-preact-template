import { Kysely } from "kysely";
import { PlanetScaleDialect } from "kysely-planetscale";

const url = process.env.DATABASE_URL || "";
const match = url.match(
  /^mysql:\/\/(?<username>[^:]+):(?<password>[^@]*)@(?<host>[^:/]+)(?::(?<port>\d+))?\/(?<database>.+)$/,
);

if (!match) {
  throw new Error("Invalid DATABASE_URL");
}

const { username, password, host } = match.groups;

/** @type {Kysely<import("../prisma/ky/types").DB>} */
const ky = new Kysely({
  dialect: new PlanetScaleDialect({
    host,
    username,
    password,
    useSharedConnection: true,
  }),
});

export default ky;
