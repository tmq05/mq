import { prisma } from '../config/prisma.js';
import { spotifyProvider } from '../providers/spotify.provider.js';
import axios from 'axios';
import { env } from '../config/env.js';

async function updateArtists() {
  const artists = await prisma.artist.findMany();
  console.log(`Found ${artists.length} artists in DB`);

  // Get Spotify token
  const authHeader = Buffer.from(
    `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const tokenRes = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  const token = tokenRes.data.access_token;

  for (const a of artists) {
    try {
      const query = a.name.replace(/\./g, '');
      const searchRes = await axios.get('https://api.spotify.com/v1/search', {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: query, type: 'artist', limit: 3 },
      });

      const items = searchRes.data?.artists?.items || [];
      const match = items.find((item: any) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        query.toLowerCase().includes(item.name.toLowerCase())
      ) || items[0];

      if (match) {
        const imageUrl = match.images?.[0]?.url || a.imageUrl;
        const followers = match.followers?.total || 100000;
        console.log(`Matched [${a.name}] -> Spotify [${match.name}]: followers=${followers}, img=${imageUrl}`);

        await prisma.artist.update({
          where: { id: a.id },
          data: {
            imageUrl,
            source: 'spotify',
            sourceId: match.id,
          },
        });
      }
    } catch (err: any) {
      console.error(`Failed to update ${a.name}:`, err.message);
    }
  }

  console.log('Update finished!');
}

updateArtists()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
