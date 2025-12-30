import express, { Application, Request, Response } from "express";
import scraperRoutes from "./routes/scraper.routes";
import { DatabaseService } from "./db/database.service";
import helmet from "helmet";
import cors from "cors";
import { logger } from "./utils/winston-logger";
import { SelfUpdate } from "./modules/update-data/self-update.service";
import cron from "node-cron";
import { LastReportDateService } from "./modules/last-report-date/last-report-date.service";
import { FetchRetryAuthID } from "./modules/fetch-retry/fetch-retry-authID";

class App {
    // Stores the express app instance
    public app: Application;

    // Setting up the express app
    constructor() {
        this.app = express();
        this.middleware();
        this.serverStart();
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
                    methods: ["POST"],
                    allowedHeaders: ["Authorization", "Content-Type"],
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
                        const allowedOrigins = [process.env.SERVER_DOMAIN];
                        if (allowedOrigins.includes(origin)) {
                            callback(null, true);
                            return;
                        }
                        callback(new Error("Not allowed by CORS"));
                    },
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
        
        // If we are not Auto Updating then enable the scraping router as we will be receiving requests from the server
        // Server will be responsible for knowing when to update
        if(!process.env.AUTO_UPDATE || process.env.AUTO_UPDATE === "false"){
            logger.info("Auto Update is Disabled! Server will request new info from us");
            logger.info("The route /scraper/process-data is active");
            this.app.use("/scraper", scraperRoutes);
        }
        
        // Set the root url to return the default message
        this.app.use("/", (req: Request, res: Response): void => {
            res.json({ message: "Nothing here but us Robots" });
        });
    }

    private async serverStart(): Promise<void> {
        await DatabaseService.connect(process.env.MONGODB_URI!);
        // If the Update Method env is set to SELF, that means we do NOT
        // listen for a request from Flock Watch Server, we deliver the data to it
        if(process.env.AUTO_UPDATE && process.env.AUTO_UPDATE === "true"){
            logger.info("Auto Update is Enabled! We will send new information to the Server!");
            logger.info("The route /scraper/process-data is DISABLED");
            
            // Run the update job as we have just started
            this.selfUpdate();

            // Create our cron job schedule
            const cronExpression = process.env.CRON || "10 12 * * 1-5";
            cron.schedule(cronExpression, this.selfUpdate);
        }
    }
    private async selfUpdate() {
        logger.info("Checking if an update is needed!");
        const updater = new SelfUpdate();
        const flockData = await updater.updateIfOutdated();

        // If we got an object back that means we ran our scrapers and have data to send
        if(flockData){
            // Create a last report date service
            const lastReportDateService = new LastReportDateService();
            // Get the auth ID Object from the DB
            const authIDObj = await lastReportDateService.getAuthID();
            // Get the authID string
            const authID = authIDObj?.auth_id ?? null;
            // If we have an authID then we are ready to run the job
            if(authID){
                // Get the server URL we are sending flock data to
                const serverURL = process.env.SERVER_UPDATE_URL! || "http://localhost:8080/data/data-update";
                // Get the fetchWithRetry object
                const fetchRetry = new FetchRetryAuthID(authID);
                // Make a post request using retry
                const res = await fetchRetry.postRetry(serverURL, flockData, 5, 30 * 1000, 500);
                // If the post was successful then update last scraped date and change auth ID
                if(res?.ok){
                    await lastReportDateService.updateLastReportDate(true);
                }else{
                    // If we failed during the post request to the server, change the auth ID
                    await lastReportDateService.updateLastReportDate(false);
                }
            }else{
                logger.info("Auth ID does not exist!");
            }
        }else{
            logger.info("DB is already up to date!")
        }
    }
}

export { App };
