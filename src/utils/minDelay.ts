/** Ensures a promise takes at least `ms` milliseconds to resolve. */
export function minDelay<T>(promise: Promise<T>, ms = 600): Promise<T> {
  return Promise.all([promise, new Promise<void>((r) => setTimeout(r, ms))]).then(
    ([result]) => result,
  );
}
