type IdleTask = () => void | Promise<void>;

type ScheduleOptions = {
  timeout?: number;
};

function runTask(task: IdleTask, resolve: () => void) {
  Promise.resolve()
    .then(task)
    .catch((error) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[scheduleIdleTask] task failed", error);
      }
    })
    .finally(resolve);
}

export function scheduleIdleTask(
  task: IdleTask,
  options?: ScheduleOptions,
): Promise<void> {
  if (typeof window === "undefined") {
    return new Promise((resolve) => runTask(task, resolve));
  }

  const idleWindow = window as Window & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      opts?: IdleRequestOptions,
    ) => number;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    return new Promise((resolve) => {
      idleWindow.requestIdleCallback(
        () => {
          runTask(task, resolve);
        },
        options,
      );
    });
  }

  const timeout = options?.timeout ?? 0;
  return new Promise((resolve) => {
    window.setTimeout(() => {
      runTask(task, resolve);
    }, timeout);
  });
}
