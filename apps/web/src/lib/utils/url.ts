import type { NDKEvent } from '@nostr-dev-kit/ndk';

export const EVENT_ID_SUFFIX_LENGTH = 999;

export function urlFromEvent(event: NDKEvent): string {
	const suffix = urlSuffixFromEvent(event);
	const npub = event.author.npub;

	return `https://highlighter.com/${npub}/${suffix}`;
}

export function urlSuffixFromEvent(event: NDKEvent): string {
	if (event.isParamReplaceable() && event.tagValue('d')) {
		return encodeURIComponent(event.tagValue('d')!);
	}

	return event.encode();
}

export function urlSuffixFromTagId(tagId: string): string {
	const dTag = tagId.split(':')[2];

	if (dTag) {
		return dTag;
	}

	return tagId;
}
