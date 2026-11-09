let shuttingDown = false;

export const markShuttingDown = (): void => {
  shuttingDown = true;
};

export const isShuttingDown = (): boolean => shuttingDown;
