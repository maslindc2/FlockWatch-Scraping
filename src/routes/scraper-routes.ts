import { Router, Request, Response } from "express";
import { DataController } from "../controllers/data-controller";
import { logger } from "../utils/winston-logger";
import { DataProcessor } from "../services/data-processor";

const router = Router();

router.post("/process-data", async (req: Request, res: Response) => {
    const receivedAuthID = req.body.authID;
    
    const dataController = new DataController();
    const expectedAuthID = await dataController.getServerAuthID();
    if (receivedAuthID === expectedAuthID) {
        logger.info(`Received valid scrape request! Starting job...`);
        const dataProcessor = new DataProcessor();
        res.json(await dataProcessor.processData());
    } else {
        logger.error(`Received invalid authID ${receivedAuthID}!`);
        res.sendStatus(403);
    }
});
export default router;