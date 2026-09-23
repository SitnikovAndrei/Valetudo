<template>
    <section class="panel max-w-4xl">
        <h1 class="mb-5 text-2xl font-bold">{{ $t("Analytics") }}</h1>
        <p>{{ $t("Software analytics can help developers understand how users experience their software when those perspectives have drifted apart.") }}</p>
        <svg class="mx-auto my-6 max-w-md" viewBox="0 0 400 220" role="img" :aria-label='$t("Developers and users as separated circles")'><circle cx="150" cy="100" r="80" fill="#4896d9" opacity=".5"/><text x="130" y="105" text-anchor="middle" fill="currentColor">{{ $t("Developers") }}</text><circle cx="260" cy="100" r="80" fill="#f0b338" opacity=".5"/><text x="280" y="105" text-anchor="middle" fill="currentColor">{{ $t("Users") }}</text><text x="205" y="200" text-anchor="middle" fill="currentColor">{{ $t("Trend") }}</text></svg>
        <p>{{ $t("Valetudo is developed by people who use Valetudo. The desired state is one shared circle: developers feel the same friction that users feel. This is often called dogfooding or scratching your own itch.") }}</p>
        <svg class="mx-auto my-6 max-w-xs" viewBox="0 0 200 200" role="img" :aria-label='$t("Developers and users in one circle")'><circle cx="100" cy="100" r="78" fill="#51a778" opacity=".5"/><circle cx="100" cy="100" r="80" fill="none" stroke="#4896d9" stroke-width="3" stroke-dasharray="12 12"/><circle cx="100" cy="100" r="80" fill="none" stroke="#f0b338" stroke-width="3" stroke-dasharray="12 12" stroke-dashoffset="12"/><text x="100" y="105" text-anchor="middle" fill="currentColor">{{ $t("Cool people") }}</text></svg>
        <p>{{ $t("This approach gathers insight through direct use, without collecting usage metrics in a cloud service. As the user group grows beyond the developers, that shared experience may change.") }}</p>
        <p class="mt-6">{{ $t("Analytics are also often introduced for financial or emotional reasons:") }}</p>
        <svg class="mx-auto my-6 max-w-xs" viewBox="0 0 300 120" role="img" :aria-label='$t("A line that goes up")'><polyline points="20,100 80,80 140,60 200,40 260,20" fill="none" stroke="#dc6666" stroke-width="3"/><text x="150" y="110" text-anchor="middle" fill="currentColor">{{ $t("line that goes up") }}</text></svg>
    </section>
</template>
