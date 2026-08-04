import { SERVER_CONFIG } from '../constants/config.constants.js';
import type { InlineButton } from './telegram-bots.types.js';

export function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function publicOrigin(value: string) {
  return (
    value
      .split(',')
      .map((origin) => origin.trim())
      .find((origin) => /^https?:\/\//i.test(origin)) || value.trim()
  );
}

export function webUrl(path = '') {
  return `${stripTrailingSlash(publicOrigin(SERVER_CONFIG.ORIGINS.WEB))}${path}`;
}

export function doctorUrl(path = '') {
  return `${stripTrailingSlash(publicOrigin(SERVER_CONFIG.ORIGINS.DOCTOR))}${path}`;
}

export function adminUrl(path = '') {
  return `${stripTrailingSlash(publicOrigin(SERVER_CONFIG.ORIGINS.ADMIN))}${path}`;
}

export function apiUrl(path = '') {
  return `${stripTrailingSlash(publicOrigin(SERVER_CONFIG.API_PUBLIC_URL))}${path}`;
}

export function callbackRows(buttons: InlineButton[], columns = 2): InlineButton[][] {
  const rows: InlineButton[][] = [];
  for (let index = 0; index < buttons.length; index += columns) {
    rows.push(buttons.slice(index, index + columns));
  }
  return rows;
}

export function menuCancelRows(): InlineButton[][] {
  return [
    [
      { text: 'Main menu', callback_data: 'common:menu' },
      { text: 'Cancel', callback_data: 'common:cancel' }
    ]
  ];
}
