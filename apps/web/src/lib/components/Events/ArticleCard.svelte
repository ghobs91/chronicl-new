<script lang="ts">
	import { getSummary } from "$utils/article";
	import type { NDKArticle } from "@nostr-dev-kit/ndk";

    export let article: NDKArticle;
    export let skipSummary: boolean = false;
    let summary: string | undefined = getSummary(article);
</script>

<div class="card card-compact lg:card-side bg-base-100 text-white flex-row">
    {#if article?.image}
        <figure class="flex-none w-1/4 {$$props.imageClass??""}"><img class="h-full" src={article?.image} alt="Album"/></figure>
    {/if}
    <div class="card-body bg-base-100 !py-0 overflow-hidden">
        <h2 class="card-title truncate">{article?.title}</h2>
        {#if summary && !skipSummary}
            <p class="text-sm text-white/50">{summary}</p>
        {/if}
    </div>
</div>