import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          compact
            ? 'flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-orange-500 px-3 py-2 text-sm font-bold text-slate-950 shadow-md active:scale-95 transition-transform whitespace-nowrap shrink-0'
            : 'w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 px-4 py-3 font-bold text-slate-950 shadow-lg active:scale-[0.98] transition-transform'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            compact
              ? 'flex items-center justify-center gap-1.5 rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm font-semibold text-white active:scale-95 transition-transform whitespace-nowrap shrink-0'
              : 'w-full flex items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/20 px-4 py-3 font-semibold text-white active:scale-[0.98] transition-transform'
          }
        >
          <Share className="w-4 h-4 shrink-0" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[#1C1036]/95 border border-white/15 p-5 shadow-2xl text-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg font-bold">Install on iPhone / iPad</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10 text-white"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-purple-100/90 leading-relaxed">
                1. Tap the <strong>Share</strong> button in the Safari toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
                <br />
                3. Launch from your home screen to play 100% offline.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full min-h-[44px] rounded-2xl bg-gradient-to-b from-pink-500 to-rose-600 py-2.5 font-bold text-white"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
