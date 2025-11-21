import express, { Application, Request, Response } from "express";
import scraperRoutes from "./routes/scraper.routes";
import { DatabaseService } from "./db/database.service";
import helmet from "helmet";
import cors from "cors";
import { logger } from "./utils/winston-logger";

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

        if (process.env.NODE_ENV === "development") {
            logger.info(
                "Currently in development mode, CORS allows all origins!"
            );
            this.app.use(
                cors({
                    origin: "*",
                    methods: ["GET"],
                    allowedHeaders: ["Content-Type"],
                })
            );
        } else {
            this.app.use(
                "/scraper",
                cors({
                    origin: (origin, callback) => {
                        // Allow requests that don't have an origin
                        if (!origin) {
                            callback(null, true);
                            return;
                        }
                        // Allowed origins array
                        const allowedOrigins = [process.env.FRONTEND_DOMAIN];
                        if (allowedOrigins.includes(origin)) {
                            callback(null, true);
                            return;
                        }
                        callback(new Error("Not allowed by CORS"));
                    },
                    // Only allow POST methods
                    methods: ["POST"],
                    allowedHeaders: ["Authorization", "Content-Type"],
                })
            );
        }

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
