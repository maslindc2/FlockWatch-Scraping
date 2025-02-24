import { Router, Request, Response } from "express";
import { logger } from "../utils/winstonLogger";

const router = Router();

router.get("/status", (req: Request, res: Response): void => {
    // Current idea is to use this as a way to kick start the server
    res.status(200).json({ message: "We are alive and ready!" });
});

router.post("/fetch-data", (req: Request, res: Response): void => {
    logger.info(
        `Received POST request on Fetch Data Route. Params: ${req.query.runJob}`
    );
    /**
     *  We will use this route to trigger scrape jobs remotely. Of course, we will have an auth system in place to
     * only allow me or FlockWatch to run the scrape job.
     * */
    res.sendStatus(200);
});

export default router;
