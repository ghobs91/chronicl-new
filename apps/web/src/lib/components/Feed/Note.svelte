<script lang="ts">
	import { CaretRight, Lightning } from 'phosphor-svelte';
	import UserProfile from "$components/User/UserProfile.svelte";
	import { Avatar, Name, RelativeTime, ZapsButton, ndk } from "@kind0/ui-common";
	import { Hexpubkey, NDKEvent, NDKFilter, NDKKind, NDKTag, NDKUserProfile, NostrEvent,getRootEventId, isEventOriginalPost } from "@nostr-dev-kit/ndk";
	import { EventCardDropdownMenu, EventContent } from "@nostr-dev-kit/ndk-svelte-components";
	import { Readable, derived } from "svelte/store";
	import NewPost from "./NewPost/NewPost.svelte";
	import { getRepliesStore, getConversationRepliesStore, getThreadStore, computeScore } from "./replies";
	import CommentsButton from "$components/buttons/CommentsButton.svelte";
	import ReplyAvatars from "./ReplyAvatars.svelte";
	import RelayIndicator from '$components/Events/RelayIndicator.svelte';
	import ViewConversation from './ViewConversation.svelte';
	import Bookmark from '$components/Bookmark.svelte';
	import MediaCollection from '$components/Events/MediaCollection.svelte';
	import TopPlusRecentZaps from '$components/Events/Zaps/TopPlusRecentZaps.svelte';
	import currentUser from '$stores/currentUser';
	import { UserProfileType } from '../../../app';
	import { goto } from '$app/navigation';
	import BoostButton from '$components/buttons/BoostButton.svelte';
	import { onDestroy } from 'svelte';
    import { createEventDispatcher } from 'svelte';
	import { devMode } from '$stores/settings';

    const dispatch = createEventDispatcher();

    export let event: NDKEvent;
    export let author = event.author;
    export let op: NDKEvent = event;
    export let mostRecentActivity: number = event.created_at!;
    export let skipTitle = false;
    export let skipReply = false;
    export let topLevel = true;
    export let maxContentLength = 1500;
    export let expandThread = false;
    export let positionInThread = 0;
    export let expandReplies = false;
    export let nestedMaxLevel = 2;
    export let showReply: boolean | undefined = undefined;
    export let urlPrefix: string = "/e/";
    export let willShowReply: boolean | undefined = undefined;
    export let newPostCompact = false;

    export let hTag = op.tagValue("h");

    let isLastInThread: boolean;

    $: isLastInThread = positionInThread === $eventsInThread.length;

    let filter: NDKFilter;
    if (hTag) {
        filter = { "#h": [hTag], "#e": [event.id], kinds: [NDKKind.GroupReply] };
    } else {
        filter = { "#e": [event.id], kinds: [NDKKind.Text] };
    }

    const events = $ndk.storeSubscribe(
        filter,
        { groupable: true, groupableDelay: 250, subId: 'note-replies', groupableDelayType: 'at-least' }
    );

    onDestroy(() => {
        events?.unsubscribe();
    })

    let replyKind: NDKKind;
    let newPostTags: NDKTag[] = [];

    $: {
        replyKind = event.kind === NDKKind.Text ? NDKKind.Text : NDKKind.GroupReply;
        const replyEvent = new NDKEvent($ndk, { kind: replyKind } as NostrEvent);
        let rootEventId = getRootEventId(event);
        if (!rootEventId && isEventOriginalPost(event)) rootEventId = event.id;
        if (rootEventId) replyEvent.tags.push(["e", rootEventId, "", "root"]);
        replyEvent.tag(event, "reply");
        const hTag = event.tagValue("h");
        if (hTag) { replyEvent.tags.push(["h", hTag]); }
        newPostTags = replyEvent.tags;
    }

    export let eventsInThread: Readable<NDKEvent[]> = getThreadStore(op, events);

    export let threadView = false;

    const title = event.tagValue("title");
    const contentToRender = event.content.slice(0, maxContentLength);

    const replies = threadView ? getRepliesStore(event, events, eventsInThread, op) : getConversationRepliesStore(op, events);

    const commentAuthors = derived(replies, $replies => {
        const authors = new Set<Hexpubkey>();

        for (const replyEvent of $replies.values()) {
            authors.add(replyEvent.pubkey);
            if (replyEvent.kind === NDKKind.GroupReply) authors.add(replyEvent.pubkey);
            else if (replyEvent.kind === NDKKind.Text) authors.add(replyEvent.pubkey);
        }

        authors.delete(event.pubkey);

        return Array.from(authors);
    });

    let shouldDisplayVerticalBar = false;
    let shouldExpandBeyondBox = false;

    let noRepliesToShow: boolean = false;
    let noZapsToShow: boolean = false;

    $: if ((threadView && $eventsInThread.length > 0) || (!expandReplies && ($replies.length > 0))) {
        shouldDisplayVerticalBar = expandThread ? positionInThread < $eventsInThread.length : true;
        shouldExpandBeyondBox = (expandThread && positionInThread < $eventsInThread.length);
    }

    const isCurrentUser = $currentUser?.pubkey === event.pubkey;

    $: willShowReply = showReply === true || (showReply == undefined && isLastInThread && topLevel && isCurrentUser);

    $: if (expandReplies && $replies.length > 0) {
        shouldDisplayVerticalBar = !willShowReply;
        shouldExpandBeyondBox = true;
    }

    let newPostPlaceholder = "Reply...";

    $: if ($currentUser?.pubkey === event.pubkey) {
        newPostPlaceholder = "Add to this thread";
    } else if (userProfile && userProfile.name) {
        newPostPlaceholder = `Reply to ${userProfile.name}...`;
    } else {
        newPostPlaceholder = `Reply...`;
    }

    let autofocusNewPost = false;
    let userProfile: UserProfileType | undefined | null;

    function contentClicked(e: CustomEvent) {
        const { type, pubkey } = e.detail;
        console.log('in note', e)
        if (type === "pubkey") {
            const user = $ndk.getUser({pubkey});
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            goto(`/${user.npub}`);
            console.log(user.npub)
        }
    }

    function noteClicked(e: Event) {
        dispatch('open:note', { event, originalEvent: e });
    }

    function viewConversationClicked(e: CustomEvent) {
        const { event, originalEvent } = e.detail;
        dispatch('open:conversation', { event, originalEvent });
    }

    const clientName = event.tagValue("client")
</script>

<div class="
    w-full text-left md:p-4 pb-0 max-sm:py-4 max-sm:max-w-[100vw] flex flex-col items-start {$$props.class??""}
    !font-light
">
    <UserProfile
        user={author}
        bind:userProfile
        let:fetching
        let:authorUrl
    >
        <div class="flex flex-row items-start w-full">
            <!-- Avatars -->
            <div class="flex flex-col items-center flex-none w-10 sm:w-16 self-stretch">
                <a href={authorUrl}>
                    <Avatar user={author} {userProfile} class="w-8 sm:w-12 h-8 sm:h-12 object-cover" type="circle" {fetching} />
                </a>
                {#if shouldDisplayVerticalBar}
                    <div class="
                        w-[1px] min-h-[40px] bg-white/20 grow
                        {shouldExpandBeyondBox && "-mb-[64px]"}
                    "></div>
                {/if}
            </div>

            <!-- Content -->
            <div class="flex flex-col overflow-x-clip pl-2 md:pl-4 relative grow">
                <!-- Title and time -->
                <div class="flex flex-row items-start w-full gap-2 relative group">
                    <div class="flex flex-col items-start grow">
                        {#if title && !skipTitle && !threadView}
                            <div class="text-lg text-white font-semibold truncate grow">{title}</div>
                        {/if}
                        <div class="text-sm opacity-80">
                            <Name user={author} {userProfile} {fetching} />
                            {#if clientName}
                                <span class="ml-2 text-xs opacity-50">via {clientName}</span>
                            {/if}
                        </div>
                    </div>

                    <div class="justify-self-end text-sm h-full absolute right-0">
                        <div class="flex flex-row items-center justify-end gap-2 place-self-end">
                            <!-- Relay indicators / hidden in mobile -->
                            <div class="flex flex-row items-center max-sm:hidden gap-2 opacity-20 group-hover:opacity-80">
                                {#if event.relay}
                                    <RelayIndicator relay={event.relay.url} />
                                {/if}
                                {#each event.onRelays.slice(0, 4) as relay}
                                    {#if relay.url !== event.relay?.url}
                                        <RelayIndicator relay={relay.url} />
                                    {/if}
                                {/each}
                            </div>

                            <div class="opacity-50">
                                <RelativeTime timestamp={mostRecentActivity * 1000} />
                                {#if $devMode}
                                    <EventCardDropdownMenu {event} />
                                {/if}
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Content / reactions / comment count -->
                <div class="flex flex-col items-stretch justify-stretch basis-0 shrink overflow-x-clip">
                    {#if topLevel}
                        <div class="flex flex-row" class:hidden={noRepliesToShow}>
                            <ViewConversation {event} {urlPrefix} bind:isNoop={noRepliesToShow} on:click={viewConversationClicked} />
                        </div>
                    {/if}
                    <!-- Content -->

                    <a href="{urlPrefix}{event.encode()}" class="mt-2 mb-4" on:click={noteClicked}>
                        <EventContent
                            ndk={$ndk}
                            {event}
                            content={contentToRender}
                            class={`${$$props.contentClass??"text-white"}`}
                            mediaCollectionComponent={MediaCollection}
                            on:click={contentClicked}
                        />
                    </a>

                    <div class="flex flex-row items-center text-zinc-500 w-full max-sm:my-2" class:hidden={noZapsToShow}>
                        <div class="flex flex-row gap-2">
                            <TopPlusRecentZaps {event} count={3} class="text-xs" bind:isNoop={noZapsToShow} />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex flex-row items-end gap-4 w-full mt-2">
            <div class="flex flex-col items-center justify-end flex-none w-10 sm:w-16">
                {#if (!expandReplies || nestedMaxLevel === 0) && !(expandThread && $eventsInThread.length > 0)}
                    {#if $replies.length > 0}
                        <ReplyAvatars users={$commentAuthors} />
                    {:else if $eventsInThread.length > 0}
                        <ReplyAvatars users={[event.pubkey]} />
                    {/if}
                {/if}
            </div>

            <div class="max-sm:hidden grow"></div>

            <div class="flex flex-row sm:basis-0 text-xs w-full items-center justify-between gap-4">
                <div class="w-1/4 flex justify-center items-end">
                    {#if $eventsInThread.length > 0 && !expandThread}
                        <button class="opacity-60 whitespace-nowrap" on:click={() => expandReplies = true }>
                            View thread
                        </button>
                    {:else if $replies.length > 0 && !expandReplies}
                        <button class="text-left w-full" on:click|stopPropagation={() => { expandReplies = true }}>
                            <CommentsButton {event} prefetchedReplies={replies} />
                        </button>
                    {:else}
                        <button class="" on:click|stopPropagation={() => { autofocusNewPost = showReply = !showReply; newPostCompact = false }}>
                            <CommentsButton {event} prefetchedReplies={replies} />
                        </button>
                    {/if}
                </div>

                <div class="w-1/4 flex justify-center items-end ">
                    <BoostButton {event} />
                </div>

                <div class="w-1/4 flex justify-center items-end ">
                    <Bookmark {event} class="max-sm:w-3.5 w-5 max-sm:h-3.5 h-5" />
                </div>
                    <!-- <div class="shrink flex flex-row gap-3 items-center text-white/50 border grow justify-between"> -->

                <div class="w-1/4 flex justify-center items-end ">
                    <ZapsButton {event}>
                        <span slot="icon">
                            <Lightning class="max-sm:w-3.5 w-5 max-sm:h-3.5 h-5" />
                        </span>
                    </ZapsButton>
                </div>
            </div>
        </div>
    </UserProfile>
</div>
{#if willShowReply}
    <NewPost
        kind={replyKind}
        extraTags={newPostTags}
        bind:showReply
        autofocus={autofocusNewPost}
        placeholder={newPostPlaceholder}
        bind:collapsed={newPostCompact}
        on:publish={() => { showReply = false; }}
    />
{/if}
{#if expandThread && event.id == op.id}
    {#each $eventsInThread as thread, i (thread.id)}
        <svelte:self
            event={thread}
            op={op ?? event}
            threadView={true}
            {expandThread}
            topLevel={false}
            positionInThread={i+1}
            showReply={expandThread && i === $eventsInThread.length-1}
            expandReplies={false}
            {nestedMaxLevel}
            class={$$props.contentClass}
            maxContentLength={9999}
            {eventsInThread}
            {urlPrefix}
            {hTag}
        />
    {/each}
{/if}
{#if expandReplies && $replies.length > 0}
    {#if nestedMaxLevel > 0}
        <div class="flex flex-col discussion-wrapper">
            {#each $replies as reply, i (reply.id)}
                <svelte:self
                    event={reply}
                    op={op ?? event}
                    {expandThread}
                    expandReplies={true}
                    threadView={true}
                    nestedMaxLevel={nestedMaxLevel-1}
                    {eventsInThread}
                    {hTag}
                    {urlPrefix}
                    topLevel={false}
                />
            {/each}
        </div>
    {:else}
        <a href="{urlPrefix}{event.encode()}" class="p-4">
            <div class="text-xs text-white/50">
                View discussion
                <CaretRight class="w-4 h-4 inline-block" />
            </div>
        </a>
    {/if}
{/if}