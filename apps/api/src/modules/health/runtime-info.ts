const API_VERSION = '2.0.3';
const UNKNOWN_COMMIT = 'unknown';

export type RuntimeInfo = {
  service: 'evolua-api';
  version: string;
  commit: string;
  environment: string;
};

export function getRuntimeInfo(environment: string): RuntimeInfo {
  const renderCommit = process.env.RENDER_GIT_COMMIT?.trim();

  return {
    service: 'evolua-api',
    version: API_VERSION,
    commit: renderCommit ? renderCommit.slice(0, 12) : UNKNOWN_COMMIT,
    environment,
  };
}
