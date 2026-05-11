/** Edge runtime + remote ESM imports (editor / `tsc -p supabase/functions` only). */

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
  env: {
    get(key: string): string | undefined;
  };
};

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function createClient(...args: any[]): any;
}
