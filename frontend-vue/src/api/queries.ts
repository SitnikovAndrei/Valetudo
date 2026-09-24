import {QueryClient} from "@tanstack/vue-query";
import {fetchCapabilities, fetchDuststreamingConfiguration, fetchValetudoInformation, fetchWifiStatus} from "./client";

/** Shared client so non-component code (router guards) reads the same cache as components. */
export const queryClient = new QueryClient();

export const capabilitiesQuery = {queryKey: ["capabilities"], queryFn: fetchCapabilities, retry: 1} as const;
export const valetudoInformationQuery = {queryKey: ["valetudoInformation"], queryFn: fetchValetudoInformation, retry: 1} as const;
export const duststreamConfigurationQuery = {queryKey: ["duststreamConfiguration"], queryFn: fetchDuststreamingConfiguration} as const;
export const wifiStatusQuery = {queryKey: ["wifiStatus"], queryFn: fetchWifiStatus, retry: 1} as const;
