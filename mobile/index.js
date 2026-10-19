import { registerRootComponent } from "expo";
// Must be imported at the entry point so the background GPS task is registered
// even when Android restarts the JS runtime for the foreground service.
import "./src/driver/services/locationSharing";
import App from "./App";

registerRootComponent(App);
