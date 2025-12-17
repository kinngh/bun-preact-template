import { useRouter } from "@router";

const ThisIsARoute = () => {
  const router = useRouter();

  return (
    <>
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
