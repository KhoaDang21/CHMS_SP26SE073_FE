import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export const adminTicketService = {
  async list(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.adminTickets.list, params);
  },

  async statistics() {
    return apiService.get<any>(apiConfig.endpoints.adminTickets.statistics);
  },
};
