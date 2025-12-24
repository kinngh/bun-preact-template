import { useRouter } from "@attayjs/client";

const HomePage = () => {
  const router = useRouter();

  async function getData() {
    const res = await (await fetch("/api/test")).json();
    console.dir(res, { depth: null });
  }

  return (
    <>
      <p>This is some content for the home page</p>
      <button
        onClick={() => {
          router.push("/shoppy/route");
        }}
      >
        Route
      </button>
      <button
        onClick={async () => {
          await getData();
        }}
      >
        Get Data
      </button>
    </>
  );
};

export default HomePage;
