interface SiteDetails {
    special_id: string;
    county: string;
    state: string;
    production_type: string;
    confirmed_diagnosis_date: Date;
    status: "active" | "released" | "na";
    control_area_released_date?: Date;
    birds_affected: number;
}

interface HistoricalSummary {
    total_birds_affected_all_time: number;
    total_sites_all_time: number;
    total_active_sites: number;
    total_released_sites: number;
    total_na_sites: number;
    total_birds_active: number;
}

interface StatusTransitionSummary {
    sites_confirmed_last_30_days: number;
    sites_released_last_30_days: number;
    birds_affected_last_30_days: number;
}

export type { SiteDetails, HistoricalSummary, StatusTransitionSummary };
