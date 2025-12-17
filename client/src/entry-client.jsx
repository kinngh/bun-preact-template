import { render } from "preact";
import { LocationProvider } from "preact-iso";
import RouterView from "./routing/RouterView";

export function App() {
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
