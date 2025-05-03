import express, { Application, Request, Response } from "express";
import scraperRoutes from "./routes/scraper-routes";
import { DatabaseService } from "./services/database-service";
import helmet from "helmet";

class App {
    // Stores the express app instance
    public app: Application;

    // Setting up the express app
    constructor() {
        this.app = express();
        this.middleware();

        // Connect to DB
        DatabaseService.connect(process.env.MONGODB_URI!);
    }

    private middleware(): void {
        // Accepting json
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: false }));
        // Setting up helmet for setting security headers
        this.app.use(helmet());
        // Set the default permissions for this service if accessed by browser
        // The specification is not fully implemented yet however in case it does we will be protected
        // Helmet at some point will adds these when the specification gets added in the future.
        this.app.use((req, res, next) => {
            res.setHeader(
                "Permissions-Policy",
                "geolocation=(), interest-cohort=()"
            );
            next();
        });
        // Anything handle the scraper is on /scraper
        this.app.use("/scraper", scraperRoutes);
        // Set the root url to return the default message
        this.app.use("/", (req: Request, res: Response): void => {
            res.json({ message: "Nothing here but us Robots" });
        });
    }
}

export { App };
