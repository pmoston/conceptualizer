import { Client } from "@hubspot/api-client";

export const hubspot = new Client({
  accessToken: process.env.HUBSPOT_API_KEY,
});
