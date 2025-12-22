import { withMiddleware } from "@/index";
import logMethodMiddleware from "@/middleware/logMethodMiddleware";

/**
 * @param {Request} request
 */
async function handler(request) {
  return new Response(
    JSON.stringify({ message: "Hello from GET /api/example" }),
    { headers: { "Content-Type": "application/json" } },
  );
}

export default withMiddleware(logMethodMiddleware, handler);
