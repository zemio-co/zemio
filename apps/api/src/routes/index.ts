import { Hono } from "hono";
import banking from "./banking";
import datev from "./datev";
import pdf from "./pdf";

const routes = new Hono();

routes.route("/pdf", pdf);
routes.route("/banking", banking);
routes.route("/datev", datev);

export default routes;
