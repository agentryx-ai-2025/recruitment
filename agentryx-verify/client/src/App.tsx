import { Route, Switch } from "wouter";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { ProjectView } from "./pages/ProjectView";
import { FeedbackInbox } from "./pages/FeedbackInbox";
import { Roadmap } from "./pages/Roadmap";

export function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/admin/roadmap" component={Roadmap} />
      <Route path="/p/:slug/feedback" component={FeedbackInbox} />
      <Route path="/p/:slug" component={ProjectView} />
      <Route>404</Route>
    </Switch>
  );
}
