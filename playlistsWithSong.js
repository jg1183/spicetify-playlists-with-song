// NAME: Playlists With Song
// DESCRIPTION: Right-click a song → "Show playlists with this song". Lists every playlist in your library that contains it.
// Rewrite that uses Spicetify.Platform APIs (the old sp://core-playlist Cosmos endpoints no longer work).

(function playlistsWithSong() {
	const S = window.Spicetify;
	if (!S?.ContextMenu || !S?.Platform?.RootlistAPI || !S?.Platform?.PlaylistAPI || !S?.PopupModal || !S?.URI) {
		setTimeout(playlistsWithSong, 300);
		return;
	}

	const LOG = "[PlaylistsWithSong]";
	const PAGE = 500;
	const PARALLEL = 4;

	// Walk the library tree (folders can nest) and collect playlists.
	function collectPlaylists(items, folderPath, out) {
		for (const item of items || []) {
			if (item.type === "folder") {
				collectPlaylists(item.items, [...folderPath, item.name], out);
			} else if (item.type === "playlist" && item.uri) {
				out.push({ uri: item.uri, name: item.name, owner: item.owner?.name, folder: folderPath.join(" / ") });
			}
		}
		return out;
	}

	async function getLibraryPlaylists() {
		const root = await S.Platform.RootlistAPI.getContents();
		return collectPlaylists(root.items, [], []);
	}

	const idOf = (uri) => (uri || "").split(":").pop();

	// True if the playlist contains the track (matches by URI, or by track ID for relinked songs).
	async function playlistHasTrack(playlistUri, trackUri) {
		const isLocal = trackUri.startsWith("spotify:local:");
		const trackId = idOf(trackUri);
		let offset = 0;
		for (;;) {
			const res = await S.Platform.PlaylistAPI.getContents(playlistUri, { offset, limit: PAGE });
			const items = res?.items || [];
			for (const it of items) {
				if (it.uri === trackUri) return true;
				if (!isLocal && it.uri?.startsWith("spotify:track:") && idOf(it.uri) === trackId) return true;
				if (!isLocal && it.linkedFrom?.uri === trackUri) return true;
			}
			offset += items.length;
			const total = res?.totalLength ?? 0;
			if (items.length === 0 || offset >= total) return false;
		}
	}

	function el(tag, style, text) {
		const e = document.createElement(tag);
		if (style) e.style.cssText = style;
		if (text != null) e.textContent = text;
		return e;
	}

	function goTo(uri) {
		S.PopupModal.hide();
		const path = S.URI.fromString(uri)?.toURLPath?.(true) || `/playlist/${idOf(uri)}`;
		S.Platform.History.push(path);
	}

	async function run(uris) {
		const trackUri = uris[0];
		const box = el("div", "display:flex;flex-direction:column;gap:8px;min-width:320px;");
		const status = el("div", "opacity:.7;", "Loading your library…");
		const list = el("div", "display:flex;flex-direction:column;gap:4px;");
		box.append(status, list);
		S.PopupModal.display({ title: "Playlists with this song", content: box, isLarge: true });

		try {
			const playlists = await getLibraryPlaylists();
			const found = [];
			let done = 0;
			let failed = 0;
			const queue = [...playlists];

			async function worker() {
				while (queue.length) {
					const p = queue.shift();
					try {
						if (await playlistHasTrack(p.uri, trackUri)) {
							found.push(p);
							render();
						}
					} catch (err) {
						failed++;
						console.warn(LOG, "Could not read", p.name, p.uri, err);
					}
					done++;
					status.textContent = `Checked ${done} of ${playlists.length} playlists…`;
				}
			}

			function render() {
				list.replaceChildren();
				for (const p of [...found].sort((a, b) => a.name.localeCompare(b.name))) {
					const row = el(
						"button",
						"all:unset;cursor:pointer;padding:8px 10px;border-radius:6px;background:rgba(255,255,255,.07);display:flex;flex-direction:column;"
					);
					row.append(el("span", "font-weight:600;", p.name));
					const meta = [p.owner && `by ${p.owner}`, p.folder && `in ${p.folder}`].filter(Boolean).join(" · ");
					if (meta) row.append(el("span", "font-size:12px;opacity:.65;", meta));
					row.onmouseenter = () => (row.style.background = "rgba(255,255,255,.14)");
					row.onmouseleave = () => (row.style.background = "rgba(255,255,255,.07)");
					row.onclick = () => goTo(p.uri);
					list.append(row);
				}
			}

			await Promise.all(Array.from({ length: Math.min(PARALLEL, playlists.length) }, worker));

			status.textContent =
				(found.length
					? `Found in ${found.length} of ${playlists.length} playlists.`
					: `Not in any of your ${playlists.length} playlists.`) +
				(failed ? ` (${failed} couldn't be read — see console.)` : "");
		} catch (err) {
			console.error(LOG, err);
			status.textContent = `Error: ${err?.message || err}. Open DevTools (Ctrl+Shift+I) → Console for details.`;
			status.style.color = "#f15e6c";
			status.style.opacity = "1";
		}
	}

	new S.ContextMenu.Item(
		"Show playlists with this song",
		run,
		(uris) => uris.length === 1 && (S.URI.isTrack(uris[0]) || uris[0].startsWith("spotify:local:")),
		"playlist"
	).register();

	console.log(LOG, "loaded");
})();
