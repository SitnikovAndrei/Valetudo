import {onMounted, onUnmounted} from "vue";
import {useQuery, useQueryClient} from "@tanstack/vue-query";
import {fetchMap, subscribeToMap} from "../api/client";

const queryKey = ["robotMap"];

export function useRobotMap() {
    const queryClient = useQueryClient();
    const query = useQuery({queryKey, queryFn: fetchMap, staleTime: 1000});
    let unsubscribe: (() => void) | undefined;
    onMounted(() => {
        unsubscribe = subscribeToMap(map => queryClient.setQueryData(queryKey, map));
    });
    onUnmounted(() => unsubscribe?.());
    return query;
}
