/* Connectivity settings: MQTT, HTTP basic auth, network advertisement, NTP and Wi-Fi. */
import {get, put} from "./http";
import {
    Capability,
    type HTTPBasicAuthConfiguration,
    type MQTTConfiguration,
    type MQTTProperties,
    type MQTTStatus,
    type NetworkAdvertisementConfiguration,
    type NetworkAdvertisementProperties,
    type NTPClientConfiguration,
    type NTPClientStatus,
    type ValetudoWifiNetwork,
    type WifiConfiguration,
    type WifiConfigurationProperties,
    type WifiStatus,
} from "./types";

export const fetchMQTTConfiguration = async (): Promise<MQTTConfiguration> => {
    return get<MQTTConfiguration>("/valetudo/config/interfaces/mqtt");
};

export const sendMQTTConfiguration = async (mqttConfiguration: MQTTConfiguration): Promise<void> => {
    return put("/valetudo/config/interfaces/mqtt", mqttConfiguration, "Could not update MQTT configuration");
};

export const fetchMQTTStatus = async (): Promise<MQTTStatus> => {
    return get<MQTTStatus>("/mqtt/status");
};

export const fetchMQTTProperties = async (): Promise<MQTTProperties> => {
    return get<MQTTProperties>("/mqtt/properties");
};

export const fetchHTTPBasicAuthConfiguration = async (): Promise<HTTPBasicAuthConfiguration> => {
    return get<HTTPBasicAuthConfiguration>("/valetudo/config/interfaces/http/auth/basic");
};

export const sendHTTPBasicAuthConfiguration = async (configuration: HTTPBasicAuthConfiguration): Promise<void> => {
    return put("/valetudo/config/interfaces/http/auth/basic", configuration, "Could not update HTTP basic auth configuration");
};

export const fetchNetworkAdvertisementConfiguration = async (): Promise<NetworkAdvertisementConfiguration> => {
    return get<NetworkAdvertisementConfiguration>("/networkadvertisement/config");
};

export const sendNetworkAdvertisementConfiguration = async (configuration: NetworkAdvertisementConfiguration): Promise<void> => {
    return put("/networkadvertisement/config", configuration, "Could not update NetworkAdvertisement configuration");
};

export const fetchNetworkAdvertisementProperties = async (): Promise<NetworkAdvertisementProperties> => {
    return get<NetworkAdvertisementProperties>("/networkadvertisement/properties");
};

export const fetchNTPClientStatus = async (): Promise<NTPClientStatus> => {
    return get<NTPClientStatus>("/ntpclient/status");
};

export const fetchNTPClientConfiguration = async (): Promise<NTPClientConfiguration> => {
    return get<NTPClientConfiguration>("/ntpclient/config");
};

export const sendNTPClientConfiguration = async (configuration: NTPClientConfiguration): Promise<void> => {
    return put("/ntpclient/config", configuration, "Could not update NTP client configuration");
};

export const fetchWifiStatus = async (): Promise<WifiStatus> => {
    return get<WifiStatus>(`/robot/capabilities/${Capability.WifiConfiguration}`);
};

export const fetchWifiConfigurationProperties = async (): Promise<WifiConfigurationProperties> => {
    return get<WifiConfigurationProperties>(`/robot/capabilities/${Capability.WifiConfiguration}/properties`);
};

export const sendWifiConfiguration = async (configuration: WifiConfiguration): Promise<void> => {
    await put(`/robot/capabilities/${Capability.WifiConfiguration}`, configuration, "Could not set Wifi configuration");
};

export const fetchWifiScan = async (): Promise<Array<ValetudoWifiNetwork>> => {
    return get<Array<ValetudoWifiNetwork>>(`/robot/capabilities/${Capability.WifiScan}`);
};
