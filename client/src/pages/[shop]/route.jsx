import { useRouter } from "@router";
import { useEffect } from "preact/hooks";

const ThisIsARoute = () => {
  const router = useRouter();

  useEffect(() => {
    console.dir(router, { depth: null });
  }, []);

  return (
    <>
      <p>Route contents:</p>
      <p>{JSON.stringify(router, null, 2)}</p>
      <button
        onClick={() => {
          router.push("/");
        }}
      >
        Go Home you're drunk
      </button>
    </>
  );
};

export default ThisIsARoute;
