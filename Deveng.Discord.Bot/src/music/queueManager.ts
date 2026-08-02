import { randomUUID } from 'crypto';
import type { MusicQueueItem, MusicTrack } from './types';

export class QueueManager {
  add(queue: MusicQueueItem[], track: MusicTrack, playNext = false): MusicQueueItem[] {
    const item: MusicQueueItem = {
      ...track,
      queueItemId: randomUUID(),
      position: playNext ? 1 : queue.length + 1,
      addedAt: new Date().toISOString(),
    };
    const next = playNext ? [item, ...queue] : [...queue, item];
    return this.normalizePositions(next);
  }

  remove(queue: MusicQueueItem[], queueItemId: string): MusicQueueItem[] {
    return this.normalizePositions(queue.filter((item) => item.queueItemId !== queueItemId));
  }

  move(queue: MusicQueueItem[], queueItemId: string, newPosition: number): MusicQueueItem[] {
    const index = queue.findIndex((item) => item.queueItemId === queueItemId);
    if (index < 0) return queue;
    const next = [...queue];
    const [item] = next.splice(index, 1);
    const target = Math.max(0, Math.min(next.length, newPosition - 1));
    next.splice(target, 0, item);
    return this.normalizePositions(next);
  }

  shuffle(queue: MusicQueueItem[]): MusicQueueItem[] {
    const next = [...queue];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return this.normalizePositions(next);
  }

  private normalizePositions(queue: MusicQueueItem[]): MusicQueueItem[] {
    return queue.map((item, index) => ({ ...item, position: index + 1 }));
  }
}

export const queueManager = new QueueManager();
