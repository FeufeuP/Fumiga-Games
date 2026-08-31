/**
 * Câmera (D2 = mundo grande): modos seguir/livre, suavização com zona
 * morta, travamento nos limites do mundo e conversão tela↔mundo.
 */
import { CAMERA } from '../core/constants';
import type { CameraMode, Vec2 } from '../core/types';

export class Camera {
  mode: CameraMode = 'follow';
  /** centro em coordenadas de mundo */
  cx = 0;
  cy = 0;
  /** viewport lógico (px de mundo visíveis) — depende do zoom/janela */
  vw = 960;
  vh = 720;
  zoom = 1;

  private worldW = 960;
  private worldH = 720;

  setWorldSize(w: number, h: number): void {
    this.worldW = w;
    this.worldH = h;
  }

  get left(): number {
    return this.cx - this.vw / 2;
  }

  get top(): number {
    return this.cy - this.vh / 2;
  }

  update(dt: number, target: Vec2 | null, freeKeys: ReadonlySet<string>): void {
    if (this.mode === 'follow' && target) {
      const dx = target.x - this.cx;
      const dy = target.y - this.cy;
      if (Math.hypot(dx, dy) > CAMERA.DEADZONE) {
        const t = 1 - Math.exp(-CAMERA.FOLLOW_LERP * dt);
        this.cx += dx * t;
        this.cy += dy * t;
      }
    } else if (this.mode === 'free') {
      let kx = 0;
      let ky = 0;
      if (freeKeys.has('a') || freeKeys.has('arrowleft')) kx -= 1;
      if (freeKeys.has('d') || freeKeys.has('arrowright')) kx += 1;
      if (freeKeys.has('w') || freeKeys.has('arrowup')) ky -= 1;
      if (freeKeys.has('s') || freeKeys.has('arrowdown')) ky += 1;
      if (kx !== 0 || ky !== 0) {
        const len = Math.hypot(kx, ky) || 1;
        this.cx += (kx / len) * CAMERA.FREE_KEY_SPEED * dt;
        this.cy += (ky / len) * CAMERA.FREE_KEY_SPEED * dt;
      }
    }
    this.clamp();
  }

  /** arrasto do dedo/mouse (delta em px de mundo) */
  pan(dx: number, dy: number): void {
    this.cx -= dx;
    this.cy -= dy;
    this.clamp();
  }

  clamp(): void {
    const halfW = this.vw / 2;
    const halfH = this.vh / 2;
    this.cx = this.worldW <= this.vw ? this.worldW / 2 : Math.min(this.worldW - halfW, Math.max(halfW, this.cx));
    this.cy = this.worldH <= this.vh ? this.worldH / 2 : Math.min(this.worldH - halfH, Math.max(halfH, this.cy));
  }

  toWorld(screenX: number, screenY: number): Vec2 {
    return { x: this.left + screenX / this.zoom, y: this.top + screenY / this.zoom };
  }
}
