import {computed, onMounted, onUnmounted} from "vue";
import {useQuery, useQueryClient} from "@tanstack/vue-query";
import {fetchStateAttributes, subscribeToStateAttributes} from "../api/client";
import {RobotAttributeClass, type BatteryState, type StatusState} from "../api/RawRobotState";

const queryKey = ["robotAttributes"];

export function useRobotAttributes() {
    const queryClient = useQueryClient();
    const query = useQuery({queryKey, queryFn: fetchStateAttributes, staleTime: 1000});
    let unsubscribe: (() => void) | undefined;

    onMounted(() => {
        unsubscribe = subscribeToStateAttributes(attributes => {
            queryClient.setQueryData(queryKey, attributes);
        });
    });
    onUnmounted(() => unsubscribe?.());

    const status = computed(() => query.data.value?.find(
        attribute => attribute.__class === RobotAttributeClass.StatusState
    ) as StatusState | undefined);
    const batteries = computed(() => (query.data.value ?? []).filter(
        attribute => attribute.__class === RobotAttributeClass.BatteryState
    ) as BatteryState[]);

    return {query, status, batteries, queryKey};
}
