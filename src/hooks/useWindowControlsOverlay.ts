import { useState, useEffect } from 'react';

interface WindowControlsOverlay {
  readonly visible: boolean;
  getTitlebarAreaRect(): DOMRect;
  addEventListener(type: 'geometrychange', listener: () => void): void;
  removeEventListener(type: 'geometrychange', listener: () => void): void;
}

interface WCOState {
  isVisible: boolean;
  controlsWidth: number;
}

function getWCO(): WindowControlsOverlay | undefined {
  return (navigator as { windowControlsOverlay?: WindowControlsOverlay }).windowControlsOverlay;
}

function getSnapshot(): WCOState {
  const wco = getWCO();
  if (!wco?.visible) return { isVisible: false, controlsWidth: 0 };
  const rect = wco.getTitlebarAreaRect();
  return {
    isVisible: true,
    controlsWidth: window.innerWidth - rect.width,
  };
}

export function useWindowControlsOverlay(): WCOState {
  const [state, setState] = useState<WCOState>(getSnapshot);

  useEffect(() => {
    const wco = getWCO();
    if (!wco) return;
    const update = () => setState(getSnapshot());
    wco.addEventListener('geometrychange', update);
    return () => wco.removeEventListener('geometrychange', update);
  }, []);

  return state;
}
