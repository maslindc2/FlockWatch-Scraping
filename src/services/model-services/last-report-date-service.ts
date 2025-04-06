import { LastReportDateModel } from "../../models/last-report-date-model";

class LastReportDateService {
    public async getLastReportDate() {
        return LastReportDateModel.getModel.find({}).select("-_id -__v");
    }
    public async getAuthID() {
        return LastReportDateModel.getModel.find({ authID: { $exists: true } });
    }
}
export { LastReportDateService };
