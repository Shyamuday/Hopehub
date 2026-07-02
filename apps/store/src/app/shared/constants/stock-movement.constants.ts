export const STOCK_MOVEMENT_DISPLAY = {
  ICONS: {
    SALE_OUT: '🛒',
    ADJUSTMENT_OUT: '📤',
    ADJUSTMENT_IN: '📥',
    PURCHASE_IN: '📦',
    RETURN_IN: '↩️',
    TRANSFER_IN: '➡️',
    TRANSFER_OUT: '⬅️',
    EXPIRED_OUT: '⏰',
    DAMAGED_OUT: '💔'
  },
  LABELS: {
    SALE_OUT: 'Sale',
    ADJUSTMENT_OUT: 'Adjustment Out',
    ADJUSTMENT_IN: 'Adjustment In',
    PURCHASE_IN: 'Purchase',
    RETURN_IN: 'Return',
    TRANSFER_IN: 'Transfer In',
    TRANSFER_OUT: 'Transfer Out',
    EXPIRED_OUT: 'Expired',
    DAMAGED_OUT: 'Damaged'
  },
  COLORS: {
    SALE_OUT: '#60a5fa',
    ADJUSTMENT_OUT: '#fb923c',
    ADJUSTMENT_IN: '#4ade80',
    PURCHASE_IN: '#a78bfa',
    RETURN_IN: '#2dd4bf',
    TRANSFER_IN: '#38bdf8',
    TRANSFER_OUT: '#f472b6',
    EXPIRED_OUT: '#f87171',
    DAMAGED_OUT: '#94a3b8'
  },
  FALLBACK: {
    ICON: '📝',
    COLOR: '#94a3b8'
  }
} as const;

export const STAFF_ACTIVITY_DISPLAY = {
  ICONS: STOCK_MOVEMENT_DISPLAY.ICONS,
  LABELS: {
    ...STOCK_MOVEMENT_DISPLAY.LABELS,
    SALE_OUT: 'Sale Out',
    PURCHASE_IN: 'Stock In'
  },
  COLORS: STOCK_MOVEMENT_DISPLAY.COLORS,
  FALLBACK: STOCK_MOVEMENT_DISPLAY.FALLBACK
} as const;
