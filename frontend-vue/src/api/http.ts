/* Transport layer: axios instance, version guard, shared SSE subscriptions and request helpers. */
import axios from "axios";
import {Capability} from "./types";
import ReconnectingEventSource from "reconnecting-eventsource";

export const valetudoAPIBaseURL = "./api/v2";

export const valetudoAPI = axios.create({
    baseURL: valetudoAPIBaseURL,
});

let currentCommitId = "unknown";

valetudoAPI.interceptors.response.use(response => {
    /*
       As using an outdated frontend with an updated backend might lead to undesirable
       or even catastrophic results, we try to automatically detect this state and
       act accordingly.
       By just looking at the response headers of any api request, we avoid additional
       periodic API requests for polling the current version.

       If something such as a reverse proxy strips these headers, the check will not work.
       Users of advanced setups like these should remember to press ctrl + f5 to force refresh
       after each Valetudo update
    */
    if (response.headers["x-valetudo-commit-id"]) {
        if (currentCommitId !== response.headers["x-valetudo-commit-id"]) {
            if (currentCommitId === "unknown") {
                currentCommitId = response.headers["x-valetudo-commit-id"];
            } else {
                /*
                    While we could display a textbox informing the user that the backend changed,
                    there wouldn't be any benefit to that as the refresh is mandatory anyway

                    By just calling location.reload() here, we avoid having to somehow inject the currentCommitId
                    value from this mostly stateless api layer into the React application state
                 */
                location.reload();
            }
        }
    }

    return response;
});

const SSESubscribers = new Map<string, () => () => void>();

const SSECleanupTimeouts = new Map<string, any>();

export const subscribeToSSE = <T>(
    endpoint: string,
    event: string,
    listener: (data: T) => void,
    raw = false,
): (() => void) => {
    const key = `${endpoint}@${event}@${raw}`;

    const existingCleanupTimeout = SSECleanupTimeouts.get(key);
    if (existingCleanupTimeout !== undefined) {
        SSECleanupTimeouts.delete(key);
        clearTimeout(existingCleanupTimeout);
    }

    const existingSubscriber = SSESubscribers.get(key);
    if (existingSubscriber !== undefined) {
        return existingSubscriber();
    }

    const source = new ReconnectingEventSource(valetudoAPI.defaults.baseURL + endpoint, {
        withCredentials: true,
        max_retry_time: 30000
    });

    source.addEventListener(event, (event: any) => {
        listener(raw ? event.data : JSON.parse(event.data));
    });
    // eslint-disable-next-line no-console
    console.info(`[SSE] Subscribed to ${endpoint} ${event}`);

    let subscribers = 0;
    const subscriber = () => {
        subscribers += 1;

        return () => {
            subscribers -= 1;

            if (subscribers <= 0) {
                const existingCleanupTimeout = SSECleanupTimeouts.get(key);
                if (existingCleanupTimeout !== undefined) {
                    SSECleanupTimeouts.delete(key);
                    clearTimeout(existingCleanupTimeout);
                }

                SSECleanupTimeouts.set(
                    key,
                    setTimeout(() => {
                        // eslint-disable-next-line no-console
                        console.info(`[SSE] Unsubscribed from ${endpoint} ${event}`);

                        source.close();
                        SSESubscribers.delete(key);
                    }, 500)
                );
            }
        };
    };

    SSESubscribers.set(key, subscriber);

    return subscriber();
};

/** Enables or disables a simple toggle capability. */
export const sendToggleMutation = async (capability: Capability, enable: boolean): Promise<void> => {
    await put(`/robot/capabilities/${capability}`, {action: enable ? "enable" : "disable"}, `Could not change ${capability} state`);
};

/** GET a JSON resource and return its body. */
export async function get<T>(url: string): Promise<T> {
    return (await valetudoAPI.get<T>(url)).data;
}

/**
 * PUT a body. When an error message is given, anything but HTTP 200 is treated as a failure,
 * matching the backend's contract for configuration endpoints.
 */
export async function put(url: string, body?: unknown, errorMessage?: string): Promise<void> {
    const {status} = await valetudoAPI.put(url, body);
    if (errorMessage !== undefined && status !== 200) throw new Error(errorMessage);
}

export async function post(url: string, body?: unknown, errorMessage?: string): Promise<void> {
    const {status} = await valetudoAPI.post(url, body);
    if (errorMessage !== undefined && status !== 200) throw new Error(errorMessage);
}

export async function del(url: string): Promise<void> {
    await valetudoAPI.delete(url);
}
