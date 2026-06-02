/**
 * Override Paraglide's getLocale to be base-path aware.
 *
 * Paraglide extracts the locale by looking at the first path segment
 * of `window.location.pathname`.  When the app is served under a
 * non-root base (e.g. GitHub Pages /irodori-interactive/), the first
 * segment is the repo name, not the locale, so every extraction falls
 * back to the baseLocale.
 *
 * This module must be imported *once* and *early* (before any UI code
 * calls getLocale).  It patches getLocale by reading the locale from
 * the router-managed URL segment instead of the raw pathname.
 */

import { overwriteGetLocale, isLocale, baseLocale } from "../i18n/runtime";

const BASE = import.meta.env.BASE_URL || "/";

function getLocaleFromUrl() {
	const pathname = window.location.pathname;

	// Strip the Vite base path from the pathname.
	const base = BASE === "/" ? "" : BASE.replace(/\/$/, "");
	const relativePath = base && pathname.startsWith(base)
		? pathname.slice(base.length)
		: pathname;

	// The relative path looks like "/en/home" — the first segment
	// after the slash is the locale.
	const firstSegment = relativePath.split("/").filter(Boolean)[0];
	if (firstSegment && isLocale(firstSegment)) {
		return firstSegment;
	}

	// If no locale found, fall back to localStorage first.
	try {
		const stored = localStorage.getItem("PARAGLIDE_LOCALE");
		if (stored && isLocale(stored)) {
			return stored;
		}
	} catch {
		/* ignore storage errors */
	}

	return baseLocale;
}

overwriteGetLocale(() => getLocaleFromUrl());

export {};
