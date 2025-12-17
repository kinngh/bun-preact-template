import { useEffect } from "preact/hooks";

const HomePage = () => {
  async function getData() {
    const res = await (await fetch("/api/test")).json();
    console.dir(res, { depth: null });
  }

  useEffect(() => {
    getData();
  }, []);
  return (
    <>
      <p>This is some content for the home page</p>
    </>
  );
};

export default HomePage;
