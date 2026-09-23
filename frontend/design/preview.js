const root = document.documentElement;
const toast = document.querySelector(".toast");
const dialog = document.querySelector(".sections-dialog");
const roomNames = {living: "Гостиная", kitchen: "Кухня", bedroom: "Спальня"};
const roomClasses = {living: "room-living", kitchen: "room-kitchen", bedroom: "room-bedroom"};
const selectedRooms = new Set();
let state = "docked";
let mode = "all";
let selection = null;
let passes = 1;
let toastTimer;
let homeTimer;

for (const [index, target] of [...document.querySelectorAll(".map-art")].entries()) {
    const fragment = document.querySelector("#floor-map").content.cloneNode(true);
    const svg = fragment.querySelector("svg");
    const id = `map-grid-${index}`;
    svg.querySelector("#map-grid").id = id;
    svg.querySelector("rect[fill='url(#map-grid)']").setAttribute("fill", `url(#${id})`);
    target.append(fragment);
}

for (const card of document.querySelectorAll(".action-card")) {
    const summary = document.createElement("div");
    summary.className = "action-status";
    summary.setAttribute("aria-live", "polite");
    summary.innerHTML = '<span class="action-status-dot"></span><strong>На базе</strong><span>Rockrobo S5 · 86%</span>';
    card.prepend(summary);
}

const mobilePrimary = document.querySelector(".mobile-action-sheet [data-command='start']");
const mobilePrimaryBar = document.createElement("div");
mobilePrimaryBar.className = "mobile-primary-bar";
mobilePrimary.setAttribute("data-mobile-primary", "");
mobilePrimaryBar.append(mobilePrimary);
const phoneScreen = document.querySelector(".phone-screen");
phoneScreen.insertBefore(mobilePrimaryBar, phoneScreen.querySelector(".mobile-nav"));

function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.hidden = true;
    }, 3500);
}

function selectScreen(name) {
    for (const screen of document.querySelectorAll("[data-screen]")) {
        screen.hidden = screen.dataset.screen !== name;
    }
    for (const button of document.querySelectorAll("[data-screen-button]")) {
        button.setAttribute("aria-pressed", String(button.dataset.screenButton === name));
    }
    for (const button of document.querySelectorAll("[data-nav='map'], [data-nav='settings']")) {
        const active = button.dataset.nav === name;
        button.classList.toggle("selected", active);
        button.classList.toggle("active", active);
        if (active) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    }
}

function selectTheme(name) {
    root.dataset.theme = name;
    for (const button of document.querySelectorAll("[data-theme-button]")) {
        button.setAttribute("aria-pressed", String(button.dataset.themeButton === name));
    }
}

function clearMapSelection() {
    selectedRooms.clear();
    selection = null;
    for (const svg of document.querySelectorAll(".floor-map")) {
        svg.querySelectorAll(".map-selection").forEach(node => node.remove());
        for (const room of Object.keys(roomNames)) {
            const path = svg.querySelector(`.${roomClasses[room]}`);
            path.classList.remove("is-selected");
            path.setAttribute("aria-pressed", "false");
        }
    }
}

function updateActions() {
    const ready = state === "paused" || (["docked", "stopped"].includes(state) && (mode === "all" || (mode === "rooms" && selectedRooms.size > 0) || (mode !== "rooms" && selection !== null)));
    for (const button of document.querySelectorAll("[data-command='start']")) {
        const mobilePause = button.hasAttribute("data-mobile-primary") && state === "cleaning";
        button.disabled = !ready && !mobilePause;
        button.firstChild.textContent = mobilePause ? "Ⅱ " : "▶ ";
        button.querySelector("span").textContent = mobilePause ? "Пауза" : state === "paused" ? "Продолжить" : mode === "goto" ? "Отправить к точке" : "Начать уборку";
    }
    for (const button of document.querySelectorAll("[data-command='pause']")) {
        button.disabled = state !== "cleaning";
    }
    for (const button of document.querySelectorAll("[data-command='stop']")) {
        button.disabled = !["cleaning", "paused", "moving", "returning"].includes(state);
    }
    for (const button of document.querySelectorAll("[data-command='home']")) {
        button.disabled = state === "docked" || state === "returning";
    }
    for (const button of document.querySelectorAll("[data-mode], [data-mobile-mode]")) {
        button.disabled = !["docked", "stopped"].includes(state);
    }
}

function updateSelectionDetails() {
    const content = {
        all: ["Уборка всего дома", "Обычный запуск робота."],
        rooms: [selectedRooms.size ? `Выбрано комнат: ${selectedRooms.size}` : "Выберите комнаты", selectedRooms.size ? [...selectedRooms].map(room => roomNames[room]).join(", ") : "Нажмите на комнаты на карте или выберите их ниже."],
        zone: [selection ? "Зона выбрана" : "Выберите зону", selection ? "Демо-зона отмечена на карте." : "Нажмите на карту, чтобы разместить демо-зону."],
        goto: [selection ? "Точка выбрана" : "Выберите точку", selection ? "Цель отмечена на карте." : "Нажмите на карту, чтобы указать цель."]
    }[mode];
    for (const target of document.querySelectorAll("[data-selection-title], [data-mobile-selection-title]")) {
        target.textContent = content[0];
    }
    for (const target of document.querySelectorAll("[data-selection-hint], [data-mobile-selection-hint]")) {
        target.textContent = content[1];
    }
    for (const panel of document.querySelectorAll(".selection-panel")) {
        let detail = panel.querySelector(".selection-detail");
        if (!detail) {
            detail = document.createElement("div");
            detail.className = "selection-detail";
            panel.append(detail);
        }
        if (mode === "rooms") {
            detail.innerHTML = `<div class="room-choices" role="group" aria-label="Выбор комнат">${Object.entries(roomNames).map(([key, name]) => `<button data-room="${key}" aria-pressed="${selectedRooms.has(key)}">${name}</button>`).join("")}</div><label>Проходов <select aria-label="Число проходов по комнатам"><option>1</option><option>2</option><option>3</option></select></label>`;
        } else if (mode === "zone") {
            detail.innerHTML = '<label>Проходов <select aria-label="Число проходов по зоне"><option>1</option><option>2</option><option>3</option></select></label>';
        } else {
            detail.replaceChildren();
        }
        const select = detail.querySelector("select");
        if (select) {
            select.value = String(passes);
        }
        detail.hidden = mode === "all" || mode === "goto";
    }
    updateActions();
}

function renderMapSelection() {
    for (const svg of document.querySelectorAll(".floor-map")) {
        svg.querySelectorAll(".map-selection").forEach(node => node.remove());
        for (const room of Object.keys(roomNames)) {
            const path = svg.querySelector(`.${roomClasses[room]}`);
            path.classList.toggle("is-selected", selectedRooms.has(room));
            path.setAttribute("aria-pressed", String(selectedRooms.has(room)));
        }
        if (!selection) {
            continue;
        }
        const node = document.createElementNS("http://www.w3.org/2000/svg", mode === "zone" ? "rect" : "circle");
        node.classList.add("map-selection", mode === "zone" ? "zone-selection" : "point-selection");
        if (mode === "zone") {
            node.setAttribute("x", String(Math.max(78, Math.min(525, selection.x - 52))));
            node.setAttribute("y", String(Math.max(110, Math.min(350, selection.y - 42))));
            node.setAttribute("width", "104");
            node.setAttribute("height", "84");
            node.setAttribute("rx", "8");
        } else {
            node.setAttribute("cx", String(selection.x));
            node.setAttribute("cy", String(selection.y));
            node.setAttribute("r", "15");
        }
        svg.append(node);
    }
}

function toggleRoom(room) {
    if (mode !== "rooms" || !["docked", "stopped"].includes(state)) {
        return;
    }
    if (selectedRooms.has(room)) {
        selectedRooms.delete(room);
    } else {
        selectedRooms.add(room);
    }
    renderMapSelection();
    updateSelectionDetails();
}

function selectMode(name) {
    if (!["docked", "stopped"].includes(state)) {
        return;
    }
    mode = name;
    root.dataset.mode = name;
    passes = 1;
    clearMapSelection();
    for (const button of document.querySelectorAll("[data-mode], [data-mobile-mode]")) {
        const active = (button.dataset.mode ?? button.dataset.mobileMode) === name;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    }
    for (const canvas of document.querySelectorAll(".map-canvas")) {
        canvas.classList.toggle("map-pick-mode", name === "zone" || name === "goto");
        canvas.setAttribute("aria-label", name === "zone" ? "Выберите зону на карте" : name === "goto" ? "Выберите точку на карте" : "Карта робота");
    }
    updateSelectionDetails();
}

function selectCapability(name) {
    if (root.dataset.capability && root.dataset.capability !== name) {
        clearTimeout(homeTimer);
        updateState("docked");
        selectMode("all");
    }
    root.dataset.capability = name;
    for (const button of document.querySelectorAll("[data-capability]")) {
        button.setAttribute("aria-pressed", String(button.dataset.capability === name));
    }
}

function updateState(next) {
    state = next;
    root.dataset.robotState = next;
    const label = {docked: "На базе", cleaning: "Убирает", paused: "Пауза", moving: "Идёт к точке", returning: "Возвращается", stopped: "Остановлен"}[next];
    const description = {docked: "Готов к уборке", cleaning: "Уборка выполняется", paused: "Уборка приостановлена", moving: "Движется к выбранной точке", returning: "Направляется на базу", stopped: "Действие остановлено"}[next];
    for (const node of document.querySelectorAll("[data-status], [data-mobile-map-badge]")) {
        node.textContent = label;
    }
    document.querySelector("[data-status-description]").textContent = description;
    document.querySelector("[data-mobile-status]").textContent = label;
    for (const summary of document.querySelectorAll(".action-status strong")) {
        summary.textContent = label;
    }
    updateActions();
}

for (const svg of document.querySelectorAll(".floor-map")) {
    svg.setAttribute("role", "group");
    for (const [room, className] of Object.entries(roomClasses)) {
        const path = svg.querySelector(`.${className}`);
        path.setAttribute("role", "button");
        path.setAttribute("tabindex", "0");
        path.setAttribute("aria-label", roomNames[room]);
        path.setAttribute("aria-pressed", "false");
        path.addEventListener("click", event => {
            if (mode === "rooms") {
                event.stopPropagation();
                toggleRoom(room);
            }
        });
        path.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleRoom(room);
            }
        });
    }
    svg.addEventListener("click", event => {
        if (!["zone", "goto"].includes(mode) || !["docked", "stopped"].includes(state) || root.dataset.capability === "basic") {
            return;
        }
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const local = point.matrixTransform(svg.getScreenCTM().inverse());
        selection = {x: Math.round(local.x), y: Math.round(local.y)};
        renderMapSelection();
        updateSelectionDetails();
    });
}

for (const button of document.querySelectorAll("[data-screen-button]")) {
    button.addEventListener("click", () => selectScreen(button.dataset.screenButton));
}
for (const button of document.querySelectorAll("[data-theme-button]")) {
    button.addEventListener("click", () => selectTheme(button.dataset.themeButton));
}
for (const button of document.querySelectorAll("[data-capability]")) {
    button.addEventListener("click", () => selectCapability(button.dataset.capability));
}
for (const button of document.querySelectorAll("[data-mode], [data-mobile-mode]")) {
    button.addEventListener("click", () => selectMode(button.dataset.mode ?? button.dataset.mobileMode));
}
document.addEventListener("click", event => {
    const room = event.target.closest(".room-choices button");
    if (room) {
        toggleRoom(room.dataset.room);
    }
});
document.addEventListener("change", event => {
    if (event.target.closest(".selection-detail select")) {
        passes = Number(event.target.value);
        for (const select of document.querySelectorAll(".selection-detail select")) {
            select.value = String(passes);
        }
    }
});
for (const button of document.querySelectorAll("[data-command]")) {
    button.addEventListener("click", () => {
        const command = button.hasAttribute("data-mobile-primary") && state === "cleaning" ? "pause" : button.dataset.command;
        if (command === "start") {
            updateState(state === "paused" ? "cleaning" : mode === "goto" ? "moving" : "cleaning");
        }
        if (command === "pause") {
            updateState("paused");
        }
        if (command === "stop") {
            clearTimeout(homeTimer);
            updateState("stopped");
        }
        if (command === "home") {
            updateState("returning");
            clearTimeout(homeTimer);
            homeTimer = setTimeout(() => updateState("docked"), 2500);
        }
        showToast(`Демо: ${button.textContent.trim()}. Команда роботу не отправлена.`);
    });
}
for (const button of document.querySelectorAll("[data-settings-tab]")) {
    button.setAttribute("aria-pressed", String(button.classList.contains("active")));
    button.addEventListener("click", () => {
        for (const peer of document.querySelectorAll("[data-settings-tab]")) {
            const active = peer === button;
            peer.classList.toggle("active", active);
            peer.setAttribute("aria-pressed", String(active));
        }
        for (const panel of document.querySelectorAll("[data-settings-panel]")) {
            panel.hidden = panel.dataset.settingsPanel !== button.dataset.settingsTab;
        }
    });
}
for (const button of document.querySelectorAll("[data-nav]")) {
    button.addEventListener("click", () => {
        const section = button.dataset.nav;
        if (section === "map" || section === "settings") {
            selectScreen(section);
        } else {
            showToast(`Раздел «${button.textContent.trim()}» есть в Valetudo; отдельный экран здесь не нарисован.`);
        }
    });
}
for (const button of document.querySelectorAll("[data-open-sections]")) {
    button.addEventListener("click", () => dialog.showModal());
}
document.querySelector("[data-close-sections]").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
    if (event.target === dialog) {
        dialog.close();
    }
});
document.querySelector("[data-apply-dnd]").addEventListener("click", () => {
    document.querySelector("[data-save-status]").textContent = "Демо: изменения только в макете. В приложении статус появится после ответа робота.";
    showToast("Демо: настройки DND не отправлены роботу.");
});
for (const button of document.querySelectorAll("[data-zoom]")) {
    button.addEventListener("click", () => {
        const map = button.closest(".map-canvas").querySelector(".map-art");
        const current = Number(map.dataset.zoom ?? "1");
        const next = Math.max(1, Math.min(1.6, current + (button.dataset.zoom === "in" ? .2 : -.2)));
        map.dataset.zoom = String(next);
        map.style.transform = `scale(${next})`;
    });
}
selectCapability("full");
selectMode("all");
updateState("docked");
updateSelectionDetails();
