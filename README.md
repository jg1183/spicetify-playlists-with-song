# Playlists With Song

A Spicetify extension that shows every playlist in your library containing a given song.

![Preview](preview.png)

## Usage

Right-click any song (including local files) and choose **Show playlists with this song**. A popup checks each playlist in your library and lists the matches as they're found, with the owner and folder. Click a result to open that playlist.

## Install

**Marketplace:** search for "Playlists With Song" and click Install.

**Manual:**
1. Run `spicetify config-dir` and copy `playlistsWithSong.js` into the `Extensions` folder.
2. Run:
   ```
   spicetify config extensions playlistsWithSong.js
   spicetify apply
   ```

## Notes

- Large libraries can take a few seconds on the first search.
- Written from scratch for recent Spotify versions as a replacement for huhridge's `listPlaylistsWithSong`, which no longer works.
- If something breaks, open DevTools (Ctrl+Shift+I) → Console, copy any line starting with `[PlaylistsWithSong]`, and open an issue.
