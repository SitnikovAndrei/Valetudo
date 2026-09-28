import {isAxiosError} from "axios";
import {QueryClient} from "@tanstack/vue-query";
import {fetchCapabilities, fetchDuststreamingConfiguration, fetchValetudoInformation, fetchWifiStatus} from "./client";

/** Shared client so non-component code (router guards) reads the same cache as components. */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: (failureCount, error) => !(isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) && failureCount < 2
        }
    }
});

export const capabilitiesQuery = {queryKey: ["capabilities"], queryFn: fetchCapabilities} as const;
export const valetudoInformationQuery = {queryKey: ["valetudoInformation"], queryFn: fetchValetudoInformation} as const;
export const duststreamConfigurationQuery = {queryKey: ["duststreamConfiguration"], queryFn: fetchDuststreamingConfiguration} as const;
export const wifiStatusQuery = {queryKey: ["wifiStatus"], queryFn: fetchWifiStatus} as const;
