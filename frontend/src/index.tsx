/* @refresh reload */
import "./index.css";
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import StatusPage from "./pages/StatusPage";
import PublicStatusPage from "./pages/PublicStatusPage";
import Embed from "./pages/Embed";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

render(
  () => (
    <ThemeProvider>
      <Router>
        <Route path="/" component={Dashboard} />
        <Route path="/status/:slug" component={StatusPage} />
        <Route path="/public/:slug" component={PublicStatusPage} />
        <Route path="/embed/:slug" component={Embed} />
      </Router>
    </ThemeProvider>
  ),
  root!
);
