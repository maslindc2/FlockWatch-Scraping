import { Router, Request, Response } from "express";
import { DataProcessor } from "../services/data-processor";
import { logger } from "../utils/winston-logger";

const router = Router();

router.post("/process-data", async (req: Request, res: Response) => {
    logger.http(`Auth ID from client: ${JSON.stringify(req.body)}`); // Log the body properly 
    const receivedAuthID = req.body.authID;
    if (receivedAuthID === "80801") {
        const dataProcessor = new DataProcessor();
        res.json(await dataProcessor.processData());
    } else {
        res.sendStatus(403);
    }
});
export default router;