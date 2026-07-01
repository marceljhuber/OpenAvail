import { mount } from "svelte";
import App from "./App.svelte";
import { initTheme } from "./lib/stores";
import "./app.css";

initTheme(); // apply theme before first paint to avoid a flash

const app = mount(App, { target: document.getElementById("app")! });

export default app;
