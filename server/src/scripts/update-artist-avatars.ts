import 'dotenv/config';
import axios from 'axios';
import { prisma } from '../config/prisma.js';
import { spotifyProvider } from '../providers/spotify.provider.js';
import { ARTISTS_CATALOG } from '../utils/artists-data.js';

async function isImageValid(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await axios.head(url, { timeout: 5000 });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

async function main() {
  const token = await (spotifyProvider as any).getAppToken?.();
  if (!token) {
    console.error('Could not obtain Spotify access token. Check SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET.');
    process.exit(1);
  }

  const artists = await prisma.artist.findMany({
    orderBy: { name: 'asc' },
  });

  const catalogByName = new Map(ARTISTS_CATALOG.map((a) => [a.name.toLowerCase(), a]));

  // Fill missing sourceId from catalog if available
  for (const a of artists) {
    if (!a.sourceId) {
      const cat = catalogByName.get(a.name.toLowerCase());
      if (cat?.spotifyId) {
        a.sourceId = cat.spotifyId;
      }
    }
  }

  // Batch fetch /v1/artists?ids=... for those with sourceId
  const ids = artists.map((a) => a.sourceId).filter((id): id is string => Boolean(id));
  const spotifyMap = new Map<string, { imageUrl?: string; id: string; name: string }>();

  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    try {
      const res = await axios.get(`https://api.spotify.com/v1/artists?ids=${chunk.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      for (const sp of res.data?.artists || []) {
        if (sp && sp.id) {
          spotifyMap.set(sp.id, {
            id: sp.id,
            name: sp.name,
            imageUrl: sp.images?.[0]?.url || sp.images?.[1]?.url,
          });
        }
      }
    } catch (err: any) {
      console.warn('Batch Spotify fetch error:', err.message);
    }
  }

  let updatedCount = 0;
  let validCount = 0;

  for (const artist of artists) {
    let freshImage: string | undefined;
    let freshSourceId = artist.sourceId;

    if (artist.sourceId && spotifyMap.has(artist.sourceId)) {
      freshImage = spotifyMap.get(artist.sourceId)?.imageUrl;
    }

    // If still no freshImage, search Spotify by artist name
    if (!freshImage) {
      try {
        const res = await axios.get('https://api.spotify.com/v1/search', {
          params: { q: artist.name, type: 'artist', market: 'VN', limit: 5 },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        });
        const items = res.data?.artists?.items || [];
        const exact =
          items.find((it: any) => it.name.toLowerCase() === artist.name.toLowerCase()) || items[0];
        if (exact) {
          freshImage = exact.images?.[0]?.url || exact.images?.[1]?.url;
          freshSourceId = exact.id;
        }
      } catch (err: any) {
        console.warn(`Search failed for ${artist.name}:`, err.message);
      }
    }

    if (freshImage && (freshImage !== artist.imageUrl || freshSourceId !== artist.sourceId)) {
      await prisma.artist.update({
        where: { id: artist.id },
        data: {
          imageUrl: freshImage,
          sourceId: freshSourceId,
        },
      });
      updatedCount++;
      console.log(`Updated: ${artist.name} -> ${freshImage}`);
    }

    const finalUrl = freshImage || artist.imageUrl;
    if (await isImageValid(finalUrl)) {
      validCount++;
    } else {
      console.warn(`WARNING: Invalid image for ${artist.name}: ${finalUrl}`);
    }
  }

  console.log(`\nDone! Total artists: ${artists.length}, Updated: ${updatedCount}, Valid reachable images: ${validCount}/${artists.length}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
