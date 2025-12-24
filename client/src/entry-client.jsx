import RouterView from "@attayjs/client";
import { render } from "preact";
import { LocationProvider } from "preact-iso";

export function App() {
  //If you want to do a custom import
  //const pages = import.meta.glob("/src/pages/**/!(_)*.{tsx,jsx}");

  return (
    <LocationProvider>
      <RouterView />
    </LocationProvider>
  );
}

const mount = document.getElementById("root") || document.getElementById("app");
if (!mount) {
  throw new Error("Missing mount element: expected #root or #app");
}

render(<App />, mount);
