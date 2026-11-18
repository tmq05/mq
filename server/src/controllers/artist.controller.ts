import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { spotifyProvider } from '../providers/spotify.provider.js';
import { itunesProvider } from '../providers/itunes.provider.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { ARTISTS_CATALOG, ArtistMeta } from '../utils/artists-data.js';
import { resolveExactFullTrack } from '../utils/track-resolver.js';
import { logger } from '../config/logger.js';

export class ArtistController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const category = (req.query.category as string || 'all').toLowerCase();
      const searchQuery = (req.query.q as string || '').trim().toLowerCase();

      // 1. Get all artists from database as single source of truth
      const dbArtists = await prisma.artist.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { songs: true, followers: true } } },
      });

      const catalogByName = new Map(
        ARTISTS_CATALOG.map((a, idx) => [a.name.toLowerCase(), { meta: a, idx }])
      );
      const catalogById = new Map(
        ARTISTS_CATALOG.map((a, idx) => [a.id, { meta: a, idx }])
      );

      // 2. Lấy số liệu thật từ Spotify cho toàn bộ nghệ sĩ có spotifyId
      const spotifyIds = dbArtists
        .map((db) => {
          const match = catalogById.get(db.id) || catalogByName.get(db.name.toLowerCase());
          return match?.meta?.spotifyId || (db.source === 'spotify' ? db.sourceId : null) || null;
        })
        .filter((id): id is string => Boolean(id));

      const spotifyMap = await spotifyProvider.getArtistsBatch(spotifyIds);

      // 3. Map DB artists, chỉ giữ nghệ sĩ có thật (khớp Spotify hoặc có bài hát thật trong DB)
      let allArtists = dbArtists
        .map((db) => {
          const match = catalogById.get(db.id) || catalogByName.get(db.name.toLowerCase());
          const meta = match?.meta;
          const spotifyId = meta?.spotifyId || (db.source === 'spotify' ? db.sourceId : undefined) || undefined;
          const sp = spotifyId ? spotifyMap.get(spotifyId) : undefined;

          // Bỏ qua nghệ sĩ ảo không tồn tại trên Spotify và không có bài hát nào trong DB
          if (!sp && db._count.songs === 0 && !meta) {
            return null;
          }

          const realFollowers = (sp?.followersCount ?? meta?.followers ?? 0) + db._count.followers;
          const realSongCount = db._count.songs > 0 ? db._count.songs : (sp?.topTrackCount ?? 0);

          return {
            _sortOrder: match ? match.idx : -1,
            id: db.id,
            slug: meta?.slug || db.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: sp?.name || db.name,
            category: meta?.category || ('vietnam' as const),
            genre: sp?.genres?.[0] || meta?.genre || 'Âm nhạc',
            bio: db.bio || meta?.bio || 'Nghệ sĩ âm nhạc',
            imageUrl:
              sp?.imageUrl ||
              db.imageUrl ||
              meta?.imageUrl ||
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
            isVerified: db.isVerified || Boolean(sp),
            spotifyId,
            _count: {
              songs: realSongCount,
              followers: realFollowers,
            },
            followers: realFollowers,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => {
          // Newly created custom DB artists first, then catalog order
          if (a._sortOrder === -1 && b._sortOrder !== -1) return -1;
          if (a._sortOrder !== -1 && b._sortOrder === -1) return 1;
          if (a._sortOrder !== -1 && b._sortOrder !== -1) return a._sortOrder - b._sortOrder;
          return 0;
        })
        .map(({ _sortOrder, ...rest }) => rest);

      // 3. Category Filter
      if (category === 'vietnam' || category === 'international') {
        allArtists = allArtists.filter((a) => a.category === category);
      }

      // 4. Search Filter
      if (searchQuery) {
        allArtists = allArtists.filter(
          (a) =>
            a.name.toLowerCase().includes(searchQuery) ||
            a.genre.toLowerCase().includes(searchQuery) ||
            a.bio.toLowerCase().includes(searchQuery)
        );
      }

      res.json({
        artists: allArtists,
        total: allArtists.length,
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const cleanId = id.replace(/^local:/, '').trim();

      // 1. Check if external Spotify ID prefix
      if (cleanId.startsWith('spotify:')) {
        const sourceId = cleanId.replace('spotify:', '');
        const extArtist = await spotifyProvider.getArtist(sourceId);
        if (extArtist) {
          const dbArtist = await prisma.artist.findFirst({
            where: {
              OR: [
                { source: 'spotify', sourceId },
                { name: { equals: extArtist.name, mode: 'insensitive' } },
              ],
            },
            include: { _count: { select: { followers: true } } },
          });

          let isFollowing = false;
          if (req.user?.userId && dbArtist) {
            const follow = await prisma.follow.findUnique({
              where: {
                userId_artistId: {
                  userId: req.user.userId,
                  artistId: dbArtist.id,
                },
              },
            });
            isFollowing = Boolean(follow);
          }

          res.json({
            ...extArtist,
            dbId: dbArtist?.id,
            isFollowing,
            followersCount: (extArtist.followersCount || 0) + (dbArtist?._count?.followers || 0),
          });
          return;
        }
      }

      // 1b. Check if external iTunes / Apple Music ID prefix
      if (cleanId.startsWith('itunes:')) {
        const sourceId = cleanId.replace('itunes:', '');
        const extArtist = await itunesProvider.getArtist(sourceId);
        if (extArtist) {
          const normalizeKey = (s: string) =>
            s
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/gi, 'd')
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '');
          const extKey = normalizeKey(extArtist.name);

          // Ưu tiên khớp nghệ sĩ trên Spotify (kể cả khác dấu/khoảng trắng như "Bùi Trường Linh" vs "buitruonglinh")
          try {
            const spRes = await spotifyProvider.search(extArtist.name, 'artist');
            const exact = spRes.artists?.find((a) => normalizeKey(a.name) === extKey);
            if (exact) {
              const fullSpotifyArtist = await spotifyProvider.getArtist(exact.sourceId);
              if (fullSpotifyArtist) {
                res.json(fullSpotifyArtist);
                return;
              }
            }
          } catch {
            // ignore optional Spotify match
          }

          let topTracks = extArtist.topTracks || [];
          if (topTracks.length === 0) {
            try {
              const trackFallback = await itunesProvider.search(extArtist.name, 'track', 10);
              topTracks = trackFallback.tracks.filter((t) =>
                t.artists.some((a) => normalizeKey(a) === extKey)
              );
            } catch {
              // ignore
            }
          }

          res.json({
            id: extArtist.id,
            name: extArtist.name,
            bio: `Nghệ sĩ ${extArtist.name} trên Apple Music / iTunes.`,
            imageUrl:
              extArtist.imageUrl ||
              topTracks[0]?.coverUrl ||
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
            genre: extArtist.genre || 'Âm nhạc',
            category: 'vietnam',
            followersCount: 100000,
            isVerified: false,
            isFollowed: false,
            topTracks,
            albums: [],
          });
          return;
        }
        res.status(404).json({ message: 'Không tìm thấy nghệ sĩ' });
        return;
      }

      // 2. Find in ARTISTS_CATALOG
      const catalogMatch = ARTISTS_CATALOG.find(
        (a) =>
          a.id === cleanId ||
          a.slug === cleanId ||
          a.name.toLowerCase() === cleanId.toLowerCase() ||
          a.spotifyId === cleanId ||
          cleanId.endsWith(a.slug)
      );

      let artistName = '';
      let bio = '';
      let imageUrl = '';
      let genre = catalogMatch?.genre || 'Nhạc Việt';
      let category = catalogMatch?.category || 'vietnam';
      let followersCount = catalogMatch?.followers || 500000;
      let isVerified = false;
      let matchedDbArtist: any = null;

      // 3. Find in Database (single source of truth for name, bio, imageUrl, isVerified)
      matchedDbArtist = await prisma.artist.findFirst({
        where: {
          OR: [
            { id: cleanId },
            { name: { equals: cleanId, mode: 'insensitive' } },
            ...(catalogMatch
              ? [
                  { id: catalogMatch.id },
                  { name: { equals: catalogMatch.name, mode: 'insensitive' as const } },
                ]
              : []),
          ],
        },
        include: {
          albums: true,
          songs: { take: 20, orderBy: { playCount: 'desc' } },
          _count: { select: { followers: true } },
        },
      });

      if (matchedDbArtist) {
        artistName = matchedDbArtist.name;
        bio =
          matchedDbArtist.bio ||
          catalogMatch?.bio ||
          `${matchedDbArtist.name} là nghệ sĩ âm nhạc được yêu thích.`;
        imageUrl =
          matchedDbArtist.imageUrl ||
          catalogMatch?.imageUrl ||
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
        followersCount = (catalogMatch?.followers ?? 0) + matchedDbArtist._count.followers;
        isVerified = Boolean(matchedDbArtist.isVerified);
      } else if (catalogMatch) {
        artistName = catalogMatch.name;
        bio = catalogMatch.bio;
        imageUrl = catalogMatch.imageUrl;
        followersCount = catalogMatch.followers;
        isVerified = true;
      }

      if (!catalogMatch && !matchedDbArtist && !cleanId.includes(':')) {
        // Try searching Spotify directly for this artist name (never search raw prefixed IDs like itunes:123)
        try {
          const spotifyRes = await spotifyProvider.search(cleanId, 'artist');
          if (spotifyRes.artists && spotifyRes.artists.length > 0) {
            const found = spotifyRes.artists[0];
            const fullSpotify = await spotifyProvider.getArtist(found.sourceId);
            if (fullSpotify) {
              res.json(fullSpotify);
              return;
            }
            artistName = found.name;
            bio = `Nghệ sĩ ${found.name} trên Spotify.`;
            imageUrl = found.imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
            followersCount = found.followersCount || 0;
          }
        } catch {
          // ignore
        }
      }

      if (!artistName) {
        res.status(404).json({ message: 'Không tìm thấy nghệ sĩ' });
        return;
      }

      // 4. Fetch Authentic Top Tracks, Followers & Albums from Spotify official artist endpoint
      let rawTracks: any[] = [];
      let officialAlbums: any[] = [];
      const targetSpotifyId =
        catalogMatch?.spotifyId ||
        (matchedDbArtist?.source === 'spotify' ? matchedDbArtist.sourceId : undefined);

      if (targetSpotifyId) {
        try {
          const spotifyArtist = await spotifyProvider.getArtist(targetSpotifyId);
          if (spotifyArtist) {
            if (typeof spotifyArtist.followersCount === 'number' && spotifyArtist.followersCount > 0) {
              followersCount = spotifyArtist.followersCount + (matchedDbArtist?._count?.followers ?? 0);
            }
            if (spotifyArtist.imageUrl) {
              imageUrl = spotifyArtist.imageUrl;
            }
            if (spotifyArtist.topTracks && spotifyArtist.topTracks.length > 0) {
              rawTracks = spotifyArtist.topTracks;
            }
            if (spotifyArtist.albums && spotifyArtist.albums.length > 0) {
              officialAlbums = spotifyArtist.albums;
            }
          }
        } catch (err: any) {
          logger.warn({ err: err.message, spotifyId: targetSpotifyId }, 'Spotify getArtist call failed');
        }
      }

      // If catalog has searchQueries, fetch tracks matching search queries
      if (catalogMatch?.searchQueries && catalogMatch.searchQueries.length > 0) {
        for (const query of catalogMatch.searchQueries.slice(0, 3)) {
          try {
            const queryRes = await spotifyProvider.search(query, 'track');
            if (queryRes.tracks.length > 0) {
              rawTracks = [...rawTracks, ...queryRes.tracks];
            }
          } catch {
            // ignore
          }
        }
      }

      // If still no tracks, search Spotify by artist name
      if (rawTracks.length === 0) {
        try {
          const spotifyRes = await spotifyProvider.search(artistName, 'track');
          if (spotifyRes.tracks.length > 0) {
            rawTracks = spotifyRes.tracks.slice(0, 15);
          }
        } catch (err: any) {
          logger.warn({ err: err.message, artistName }, 'Spotify track search error for artist');
        }
      }

      // Filter tracks to prioritize ones by the artist
      const cleanArtistKey = artistName.replace(/[^a-z0-9]/gi, '').toLowerCase();
      const artistMatchedTracks = rawTracks.filter((t) =>
        t.artists.some((a: string) => {
          const cleanA = a.replace(/[^a-z0-9]/gi, '').toLowerCase();
          return cleanA.includes(cleanArtistKey) || cleanArtistKey.includes(cleanA);
        })
      );
      if (artistMatchedTracks.length >= 2) {
        rawTracks = artistMatchedTracks;
      }

      // Add DB songs if available
      if (matchedDbArtist && matchedDbArtist.songs?.length > 0) {
        const dbTracks = matchedDbArtist.songs.map((s: any) => ({
          id: `zingmp3:${s.sourceId || s.id}`,
          dbId: s.id,
          source: 'zingmp3',
          sourceId: s.sourceId || s.id,
          title: s.title,
          artists: s.artists,
          album: s.album,
          coverUrl: s.coverUrl,
          durationMs: s.durationMs,
          playbackType: 'youtube',
          streamUrl: s.streamUrl || `/api/songs/${s.id}/stream`,
          embedId: s.embedId,
          previewUrl: s.previewUrl,
          isFullLength: true,
        }));
        rawTracks = [...dbTracks, ...rawTracks];
      }

      // De-duplicate tracks by normalized title
      const seenTitles = new Set<string>();
      const uniqueTracks: any[] = [];
      for (const t of rawTracks) {
        const key = t.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          uniqueTracks.push(t);
        }
      }

      // 5. CRITICAL: Guarantee 100% full-length playback for all top tracks
      const topTracks = await Promise.all(
        uniqueTracks.slice(0, 15).map(async (track) => {
          try {
            return await resolveExactFullTrack(track);
          } catch {
            return {
              ...track,
              playbackType: 'youtube' as const,
              isFullLength: true,
            };
          }
        })
      );

      // 6. Check follow status
      let isFollowing = false;
      if (req.user?.userId && matchedDbArtist) {
        const follow = await prisma.follow.findUnique({
          where: {
            userId_artistId: {
              userId: req.user.userId,
              artistId: matchedDbArtist.id,
            },
          },
        });
        isFollowing = Boolean(follow);
      }

      // 7. Get or construct albums
      let albums = matchedDbArtist?.albums || [];
      if (albums.length === 0 && officialAlbums.length > 0) {
        albums = officialAlbums;
      }
      if (albums.length === 0) {
        // Generate albums from catalog or tracks
        albums = [
          {
            id: `album-${catalogMatch?.slug || 'top-hits'}`,
            title: `Tuyển tập hay nhất - ${artistName}`,
            artist: artistName,
            coverUrl: imageUrl,
            year: 2024,
            genre,
          },
        ];
      }

      res.json({
        id: matchedDbArtist?.id || catalogMatch?.id || `artist-${cleanId}`,
        dbId: matchedDbArtist?.id,
        slug: catalogMatch?.slug || cleanId,
        name: artistName,
        bio,
        imageUrl,
        genre,
        category,
        albums,
        topTracks,
        followersCount,
        isFollowing,
        isVerified,
        verified: isVerified,
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleFollow(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập để theo dõi nghệ sĩ' });
        return;
      }
      const { id } = req.params;
      const cleanId = id.replace(/^local:/, '').trim();

      const catalogMatch = ARTISTS_CATALOG.find(
        (a) => a.id === cleanId || a.slug === cleanId || cleanId.endsWith(a.slug)
      );

      const isSpotifyPrefix = cleanId.startsWith('spotify:');
      const isItunesPrefix = cleanId.startsWith('itunes:');
      const externalSourceId = isSpotifyPrefix
        ? cleanId.replace('spotify:', '')
        : isItunesPrefix
        ? cleanId.replace('itunes:', '')
        : null;

      // Look up in database by ID, external sourceId, name, or catalog match
      let dbArtist = await prisma.artist.findFirst({
        where: {
          OR: [
            { id: cleanId },
            { name: { equals: cleanId, mode: 'insensitive' } },
            ...(externalSourceId ? [{ sourceId: externalSourceId }] : []),
            ...(catalogMatch
              ? [
                  { id: catalogMatch.id },
                  { name: { equals: catalogMatch.name, mode: 'insensitive' as const } },
                ]
              : []),
          ],
        },
      });

      // If not in DB, create it from catalog
      if (!dbArtist && catalogMatch) {
        dbArtist = await prisma.artist.create({
          data: {
            id: catalogMatch.id,
            name: catalogMatch.name,
            bio: catalogMatch.bio,
            imageUrl: catalogMatch.imageUrl,
            isVerified: true,
            source: 'catalog',
            sourceId: catalogMatch.spotifyId || null,
          },
        });
      }

      // Nếu là nghệ sĩ ngoài hệ thống (Spotify / iTunes), tự động lưu vào bảng artists để có thể Theo dõi
      if (!dbArtist && isSpotifyPrefix && externalSourceId) {
        const extArtist = await spotifyProvider.getArtist(externalSourceId);
        if (extArtist) {
          const byName = await prisma.artist.findFirst({
            where: { name: { equals: extArtist.name, mode: 'insensitive' } },
          });
          dbArtist =
            byName ||
            (await prisma.artist.create({
              data: {
                name: extArtist.name,
                bio: extArtist.bio || `Nghệ sĩ ${extArtist.name} trên Spotify.`,
                imageUrl: extArtist.imageUrl || null,
                isVerified: true,
                source: 'spotify',
                sourceId: externalSourceId,
              },
            }));
        }
      } else if (!dbArtist && isItunesPrefix && externalSourceId) {
        const extArtist = await itunesProvider.getArtist(externalSourceId);
        if (extArtist) {
          const byName = await prisma.artist.findFirst({
            where: { name: { equals: extArtist.name, mode: 'insensitive' } },
          });
          dbArtist =
            byName ||
            (await prisma.artist.create({
              data: {
                name: extArtist.name,
                bio: `Nghệ sĩ ${extArtist.name} trên Apple Music / iTunes.`,
                imageUrl: extArtist.imageUrl || null,
                isVerified: false,
                source: 'itunes',
                sourceId: externalSourceId,
              },
            }));
        }
      }

      if (!dbArtist) {
        res.status(404).json({ message: 'Không tìm thấy nghệ sĩ' });
        return;
      }

      const existing = await prisma.follow.findUnique({
        where: {
          userId_artistId: {
            userId: req.user.userId,
            artistId: dbArtist.id,
          },
        },
      });

      if (existing) {
        await prisma.follow.delete({ where: { id: existing.id } });
        res.json({ isFollowing: false });
      } else {
        await prisma.follow.create({
          data: {
            userId: req.user.userId,
            artistId: dbArtist.id,
          },
        });
        res.json({ isFollowing: true });
      }
    } catch (err) {
      next(err);
    }
  }
}

export const artistController = new ArtistController();
