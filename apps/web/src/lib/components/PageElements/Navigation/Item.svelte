<script lang="ts">
	import { page } from "$app/stores";

    export let href: string | undefined = undefined;
    export let matches: RegExp = new RegExp(`^${href}$`);
    export let tooltip: string | undefined = undefined;

    export let active: boolean | undefined = undefined;

    $: active = matches.test($page.url.pathname);
</script>

<div class="
    item
    w-full
    {$$props.class??""}
"
    class:active={active} data-tip={tooltip}
    class:tooltip={!!tooltip}
    class:tooltip-right={!!tooltip}
>
    {#if href}
        <a
            {href}
            class="
                inline-flex items-center justify-center
                text-neutral-500 hover:text-neutral-300 transition-all duration-300
                flex-none {$$props.elClass}
            "
            class:active={active}
            on:click
        >
            <div class="w-full h-full max-w-[40px]">
                <slot {active} />
            </div>
        </a>
    {:else}
        <button
            class="
                inline-flex items-center justify-center
                text-neutral-500 hover:text-neutral-300 transition-all duration-300
                flex-none {$$props.elClass}
            "
            class:active={active}
            on:click
        >
            <div class="w-full h-full max-w-[32px]">
                <slot {active} />
            </div>
        </button>
    {/if}
</div>

<style lang="postcss">
    a, button {
        @apply py-2.5 px-2 sm:px-4 cursor-pointer w-full;
        @apply max-sm:px-3 max-sm:pt-3;
    }

    a.active, button.active {
        @apply text-neutral-200;
        @apply !bg-inherit !bg-opacity-20;
    }

    .item {
        @apply sm:border-r-4;
        @apply max-sm:border-t-4;
        @apply border-transparent;
    }

    /* .item.active {
        @apply border-neutral-200;

    } */

    .highlight {
        @apply !bg-accent2 p-2 rounded-2xl text-neutral-200;
    }
</style>