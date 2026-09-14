import { describe, expect, it } from 'vitest';
import { rememberSearch, resolvePick } from '../src/music/searchPickStore';
import type { MusicTrack } from '../src/music/types';

function track(title: string): MusicTrack {
  return { id: `soundcloud:${title}`, title, source: 'soundcloud' };
}

describe('searchPickStore', () => {
  it('token ile kaydedilen sonuçları indeksle döndürür', () => {
    const token = rememberSearch([track('Birinci'), track('İkinci')]);
    expect(resolvePick(token, 0)?.title).toBe('Birinci');
    expect(resolvePick(token, 1)?.title).toBe('İkinci');
  });

  it('bilinmeyen token için undefined döndürür', () => {
    expect(resolvePick('bilinmeyen-token', 0)).toBeUndefined();
  });

  it('aralık dışı indeks için undefined döndürür', () => {
    const token = rememberSearch([track('Tek')]);
    expect(resolvePick(token, 1)).toBeUndefined();
    expect(resolvePick(token, -1)).toBeUndefined();
  });

  it('her çağrıda farklı token üretir', () => {
    const a = rememberSearch([track('A')]);
    const b = rememberSearch([track('B')]);
    expect(a).not.toBe(b);
    expect(resolvePick(a, 0)?.title).toBe('A');
    expect(resolvePick(b, 0)?.title).toBe('B');
  });
});
