import {ref} from "vue";

const today = new Date();
export const aprilFools = ref(today.getMonth() === 3 && today.getDate() === 1);
export const activationKey = "aprilfools-valetudo-activation";
export const activated = ref(localStorage.getItem(activationKey) === "true");

export function activate() {
    localStorage.setItem(activationKey, "true");
    activated.value = true;
}
