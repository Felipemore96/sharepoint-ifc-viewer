import * as ReactDOM from "react-dom/client";
import App from "./App";
import { StrictMode } from "react";

const rootElement = document.getElementById("root") as HTMLDivElement;
const appRoot = ReactDOM.createRoot(rootElement);
appRoot.render(
  <StrictMode>
    <App />
  </StrictMode>
);
