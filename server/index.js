import attayRoutes from "@attayjs/server";

const autoRoutes = await attayRoutes({ dir: "./routes", prefix: "/api" });

const server = Bun.serve({
  port: 3000,
  routes: { ...autoRoutes },
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Running on localhost:3000`);
