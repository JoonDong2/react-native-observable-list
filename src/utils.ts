export const isFunction = (f: any) => typeof f === 'function';

export function parallelize<F>(...funs: (F | undefined)[]) {
  return ((...props: unknown[]) => {
    for (let i = 0; i < funs.length; i++) {
      const fun = funs[i];
      if (typeof fun === 'function') {
        fun(...props);
      }
    }
  }) as F;
}
