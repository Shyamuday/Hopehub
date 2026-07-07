export function createDebouncedSaver(delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule(fn: () => void | Promise<void>) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void fn();
      }, delayMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    }
  };
}
