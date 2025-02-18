import express, { Application, Request, Response, NextFunction } from "express";
import dataRoutes from "./routes/data-routes";
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
        this.app.use("/data", dataRoutes);
        this.app.use(
            "/",
            (req: Request, res: Response, next: NextFunction): void => {
                res.json({ message: "Nothing here but us Chickens" });
            }
        );
    }
}

export { App };
