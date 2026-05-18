import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminPanel from "./pages/AdminPanel";
import GroupSetup from "./pages/GroupSetup";
import HostPanel from "./pages/HostPanel";
import LiveDisplay from "./pages/LiveDisplay";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/admin"} component={AdminPanel} />
      <Route path={"/setup"} component={GroupSetup} />
      <Route path={"/host/:sessionId"} component={HostPanel} />
      <Route path={"/live/:sessionId"} component={LiveDisplay} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
