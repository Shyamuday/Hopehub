export type ConsumerChromeState = {
  focusMode: boolean;
  pageOwnsMobileAction: boolean;
};

const DETAIL_ROUTE_PATTERNS = [
  /^\/services\/[^/]+$/,
  /^\/care-team\/[^/]+$/,
  /^\/psychologists\/[^/]+$/,
  /^\/p\/[^/]+$/,
];

export function consumerChromeForUrl(rawUrl: string): ConsumerChromeState {
  const path = `/${rawUrl.split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, '')}`;
  return {
    focusMode: /^\/(live-session|live-groups)\/[^/]+$/.test(path),
    pageOwnsMobileAction: DETAIL_ROUTE_PATTERNS.some((pattern) => pattern.test(path)),
  };
}
