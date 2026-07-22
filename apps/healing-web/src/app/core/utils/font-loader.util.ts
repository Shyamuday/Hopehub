/**
 * Font Loader Utility
 * Provides robust font loading detection and management
 * 
 * Features:
 * - Detects when Google Fonts are loaded
 * - Prevents FOIT (Flash of Invisible Text)
 * - Provides fallback fonts during loading
 * - Works with SSR (Server-Side Rendering)
 */
export class FontLoader {
  private static fontsLoaded = false;
  private static fontLoadPromise: Promise<void> | null = null;

  /**
   * Check if fonts are loaded
   */
  static areFontsLoaded(): boolean {
    if (typeof document === 'undefined') return false;
    
    if (this.fontsLoaded) return true;
    
    // Check if fonts are available using FontFace API
    if ('fonts' in document) {
      try {
        return document.fonts.check('1em Inter') || 
               document.fonts.check('1em Poppins') ||
               document.fonts.check('1em "Playfair Display"');
      } catch {
        return false;
      }
    }
    
    // Fallback: assume fonts are not loaded yet
    return false;
  }

  /**
   * Wait for fonts to load
   */
  static async waitForFonts(): Promise<void> {
    if (typeof document === 'undefined') {
      return Promise.resolve();
    }

    if (this.fontsLoaded) {
      return Promise.resolve();
    }

    if (this.fontLoadPromise) {
      return this.fontLoadPromise;
    }

    this.fontLoadPromise = new Promise<void>((resolve) => {
      // Use FontFace API if available (modern browsers)
      if ('fonts' in document && 'ready' in document.fonts) {
        document.fonts.ready
          .then(() => {
            this.fontsLoaded = true;
            resolve();
          })
          .catch(() => {
            // Fallback: resolve after timeout even if fonts fail
            setTimeout(() => {
              this.fontsLoaded = true;
              resolve();
            }, 3000);
          });
      } else {
        // Fallback: wait for document ready and a short delay
        if (document.readyState === 'complete') {
          setTimeout(() => {
            this.fontsLoaded = true;
            resolve();
          }, 1000);
        } else {
          const handleLoad = () => {
            setTimeout(() => {
              this.fontsLoaded = true;
              resolve();
            }, 1000);
            window.removeEventListener('load', handleLoad);
          };
          window.addEventListener('load', handleLoad);
        }
      }
    });

    return this.fontLoadPromise;
  }

  /**
   * Initialize font loading detection
   * Should be called in app initialization
   */
  static init(): void {
    if (typeof document === 'undefined') return;

    // Ensure loading class is set
    if (!document.documentElement.classList.contains('font-loading')) {
      document.documentElement.classList.add('font-loading');
    }

    // Remove loading class once fonts are loaded
    this.waitForFonts().then(() => {
      document.documentElement.classList.remove('font-loading');
      document.documentElement.classList.add('fonts-loaded');
    });
  }
}
