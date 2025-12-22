import useRouter from "@router";

const HomePage = () => {
  const router = useRouter();

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
    </>
  );
};

export default HomePage;
