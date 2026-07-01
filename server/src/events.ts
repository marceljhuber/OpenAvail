// Tiny in-process pub/sub used to push Server-Sent Events to connected clients.
// A published channel name tells clients which store to refetch.

export type Channel = "board" | "polls" | "comments";
type Listener = (channel: Channel) => void;

const listeners = new Set<Listener>();

export const bus = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  publish(channel: Channel): void {
    for (const fn of listeners) {
      try {
        fn(channel);
      } catch {
        /* a slow/broken client must not break others */
      }
    }
  },
};
