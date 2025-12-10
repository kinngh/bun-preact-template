import ky from "@/utils/ky";

/**
 * @param {Request} request
 */
async function handler(request) {
  //Ky call
  const getPlaceholderContent = await ky
    .selectFrom("placeholder_model")
    .selectAll()
    .execute();
  console.log(getPlaceholderContent);

  //Return response
  return new Response(
    JSON.stringify({ message: "Hello from GET /api/example" }),
    { headers: { "Content-Type": "application/json" } }
  );
}

export default handler;
