/**
 * Armazenamento — localStorage com envelope versionado + checksum.
 * Fallback IndexedDB entra na Fase 7 (backup rotativo, migrações encadeadas).
 */
import { SAVE } from '../core/constants';
import type { RunSaveV1, SaveEnvelope } from './saveTypes';
import { fnv1a } from './checksum';

export function saveExists(): boolean {
  try {
    return localStorage.getItem(SAVE.KEY) !== null;
  } catch {
    return false;
  }
}

export function writeSave(data: RunSaveV1): boolean {
  try {
    const json = JSON.stringify(data);
    const envelope: SaveEnvelope = {
      v: SAVE.VERSION,
      checksum: SAVE.USE_CHECKSUM ? fnv1a(json) : '',
      data: JSON.parse(json) as RunSaveV1,
    };
    localStorage.setItem(SAVE.KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

/** Lê e valida. Retorna null se ausente, corrompido ou de versão futura. */
export function readSave(): RunSaveV1 | null {
  try {
    const raw = localStorage.getItem(SAVE.KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as SaveEnvelope;
    if (typeof envelope !== 'object' || envelope === null) return null;
    if (envelope.v !== SAVE.VERSION) return null; // migração: Fase 7
    if (SAVE.USE_CHECKSUM) {
      const json = JSON.stringify(envelope.data);
      if (fnv1a(json) !== envelope.checksum) return null; // corrompido
    }
    return envelope.data;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE.KEY);
  } catch {
    /* storage indisponível — segue sem save */
  }
}
