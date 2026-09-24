import {onMounted, onUnmounted} from "vue";
import {useQuery, useQueryClient} from "@tanstack/vue-query";
import {fetchMap, subscribeToMap} from "../api/client";

export const robotMapQueryKey = ["robotMap"];

/**
 * Query options for the robot map. The map carries hundreds of thousands of pixel coordinates, so it is
 * kept out of Vue's deep reactivity (`shallow` + markRaw in preprocessMap) and TanStack's deep comparison
 * (`structuralSharing: false`). Every consumer of the "robotMap" key must use these options.
 */
export const robotMapQueryOptions = {
    queryKey: robotMapQueryKey,
    queryFn: fetchMap,
    staleTime: 1000,
    shallow: true,
    structuralSharing: false
} as const;

export function useRobotMap(options: {live?: boolean} = {}) {
    const queryClient = useQueryClient();
    const query = useQuery(robotMapQueryOptions);
    let unsubscribe: (() => void) | undefined;
    if (options.live !== false) {
        onMounted(() => {
            unsubscribe = subscribeToMap(map => queryClient.setQueryData(robotMapQueryKey, map));
        });
        onUnmounted(() => unsubscribe?.());
    }
    return query;
}
