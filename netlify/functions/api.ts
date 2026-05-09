import { handle } from "hono/aws-lambda";
import app from "../../api/boot";

export const handler = handle(app);
