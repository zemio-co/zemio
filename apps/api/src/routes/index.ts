import { Hono } from "hono";
import banking from "./banking";
import pdf from "./pdf";

const routes = new Hono();

routes.route("/pdf", pdf);
routes.route("/banking", banking);

export default routes;
