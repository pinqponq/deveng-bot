import { describe, expect, it } from 'vitest';
import {
  LIVE_DURATION_THRESHOLD_MS,
  detectMusicSource,
  fallbackSourcesFor,
  isUrl,
  normalizeDurationMs,
  playableQueryFor,
  sourcePrefix,
  sourceToSearchPlatform,
} from '../src/music/playbackResolver';
import type { MusicPlayRequest, MusicTrack } from '../src/music/types';

describe('isUrl', () => {
  it('http(s) bağlantılarını tanır', () => {
    expect(isUrl('https://youtu.be/abc')).toBe(true);
    expect(isUrl('http://example.com')).toBe(true);
  });
  it('bağlantı olmayan metinleri reddeder', () => {
    expect(isUrl('daft punk one more time')).toBe(false);
    expect(isUrl('ftp://x')).toBe(false);
  });
});

describe('normalizeDurationMs', () => {
  it('geçerli tam sayı süreyi döndürür', () => {
    expect(normalizeDurationMs(1234)).toBe(1234);
  });
  it('stream/geçersiz/0/negatif/ondalık için undefined döndürür', () => {
    expect(normalizeDurationMs(1000, true)).toBeUndefined();
    expect(normalizeDurationMs('nan' as unknown)).toBeUndefined();
    expect(normalizeDurationMs(0)).toBeUndefined();
    expect(normalizeDurationMs(-5)).toBeUndefined();
    expect(normalizeDurationMs(Number.NaN)).toBeUndefined();
    // Yalnızca güvenli tam sayılar kabul edilir; ondalıklar reddedilir.
    expect(normalizeDurationMs(1234.6)).toBeUndefined();
  });
  it('canlı yayın eşiğinin üstünü undefined yapar', () => {
    expect(normalizeDurationMs(LIVE_DURATION_THRESHOLD_MS)).toBeUndefined();
    expect(normalizeDurationMs(LIVE_DURATION_THRESHOLD_MS - 1)).toBe(LIVE_DURATION_THRESHOLD_MS - 1);
  });
});

describe('detectMusicSource', () => {
  it('açık kaynağı korur ama spotify -> youtube map eder', () => {
    expect(detectMusicSource('x', 'soundcloud')).toBe('soundcloud');
    expect(detectMusicSource('x', 'spotify')).toBe('youtube');
  });
  it('URL alan adından kaynağı çıkarır', () => {
    expect(detectMusicSource('https://soundcloud.com/x')).toBe('soundcloud');
    expect(detectMusicSource('https://open.spotify.com/track/x')).toBe('spotify');
    expect(detectMusicSource('https://youtu.be/x')).toBe('youtube');
    expect(detectMusicSource('https://example.com/song.mp3')).toBe('direct');
  });
  it('düz metinde youtube varsayar', () => {
    expect(detectMusicSource('some song name')).toBe('youtube');
  });
});

describe('sourceToSearchPlatform', () => {
  it('kaynakları Lavalink arama platformlarına çevirir', () => {
    expect(sourceToSearchPlatform('soundcloud')).toBe('scsearch');
    expect(sourceToSearchPlatform('spotify')).toBe('ytmsearch');
    expect(sourceToSearchPlatform('youtube')).toBe('ytmsearch');
    expect(sourceToSearchPlatform('auto')).toBe('ytmsearch');
    expect(sourceToSearchPlatform(undefined)).toBe('ytmsearch');
    expect(sourceToSearchPlatform('direct')).toBe('http');
  });
});

describe('sourcePrefix', () => {
  it('doğru arama önekini verir', () => {
    expect(sourcePrefix('soundcloud')).toBe('scsearch:');
    expect(sourcePrefix('youtube')).toBe('ytmsearch:');
    expect(sourcePrefix('spotify')).toBe('ytmsearch:');
    expect(sourcePrefix('direct')).toBe('');
  });
});

describe('fallbackSourcesFor', () => {
  it('metin aramada youtube/spotify/auto için soundcloud fallback verir', () => {
    expect(fallbackSourcesFor('youtube', 'name')).toEqual(['soundcloud']);
    expect(fallbackSourcesFor('spotify', 'name')).toEqual(['soundcloud']);
    expect(fallbackSourcesFor('auto', 'name')).toEqual(['soundcloud']);
    expect(fallbackSourcesFor(undefined, 'name')).toEqual(['soundcloud']);
  });
  it('URL ve soundcloud kaynağı için fallback vermez', () => {
    expect(fallbackSourcesFor('youtube', 'https://youtu.be/x')).toEqual([]);
    expect(fallbackSourcesFor('soundcloud', 'name')).toEqual([]);
  });
});

describe('playableQueryFor', () => {
  const baseRequest = (query: string, source?: MusicPlayRequest['source']): MusicPlayRequest => ({
    guildId: 'g',
    query,
    source,
  });

  it('track yokken query + tespit edilen kaynağı döndürür', () => {
    expect(playableQueryFor(baseRequest('  hello  '))).toEqual({ query: 'hello', source: 'youtube' });
  });

  it('spotify track için başlık+sanatçıyı birleştirir ve kaynağı spotify tutar', () => {
    const track: MusicTrack = { id: 's:1', title: 'Song', author: 'Artist', source: 'spotify' };
    expect(playableQueryFor(baseRequest('ignored'), track)).toEqual({ query: 'Song Artist', source: 'spotify' });
  });

  it('spotify olmayan track için uri önceliklidir', () => {
    const track: MusicTrack = { id: 'y:1', title: 'T', uri: 'https://youtu.be/z', source: 'youtube' };
    const result = playableQueryFor(baseRequest(''), track);
    expect(result.query).toBe('https://youtu.be/z');
    expect(result.source).toBe('youtube');
  });
});
