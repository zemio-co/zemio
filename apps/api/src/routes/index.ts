import { Hono } from "hono";
import pdf from "./pdf";

const routes = new Hono();

routes.route("/pdf", pdf);

export default routes;
