import type { Session } from 'koishi';
import type { Config } from '../../config/config.js';

export function isAdmin(session: Session, cfg: Config): boolean {
    return cfg.adminIds?.includes(session.userId) ?? false;
}

export function requireAdmin(session: Session, cfg: Config): boolean {
    return isAdmin(session, cfg);
}
