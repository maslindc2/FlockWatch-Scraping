import express, { Application, Request, Response, NextFunction } from "express";
import scraperRoutes from "./routes/scraper-routes";
import { logger } from "./utils/winston-logger";
import { DatabaseService } from "./services/database-service";

class App {
    public app: Application;

    constructor() {
        this.app = express();
        this.middleware();

        // Connect to DB
        DatabaseService.connect(process.env.MONGODB_URI!);
    }

    private middleware(): void {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: false }));
        this.app.use("/scraper", scraperRoutes);
        this.app.use(
            "/",
            (req: Request, res: Response): void => {
                res.json({ message: "Nothing here but us Robots" });
            }
        );
    }
}

export { App };
