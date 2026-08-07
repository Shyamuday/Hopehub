import type { NextFunction, Request, Response } from 'express';
import { staffCanAccessWorkspace, type AdminFocusedWorkspace } from './staff-permissions.js';
import { queryText } from './utils/helpers.js';

export type AdminWorkspaceQuery = AdminFocusedWorkspace | '';

export function getAuthorizedAdminWorkspace(
  req: Request,
  res: Response
): AdminWorkspaceQuery | null {
  const raw = queryText(req, 'workspace');
  const workspace: AdminWorkspaceQuery = raw === 'homeopathy' || raw === 'hope-hub' ? raw : '';

  if (workspace && !staffCanAccessWorkspace(req.user, workspace)) {
    res.status(403).json({
      message: 'You do not have access to this admin workspace.',
      workspace
    });
    return null;
  }

  return workspace;
}

export function requireAdminWorkspaceAccess(workspace: AdminFocusedWorkspace) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!staffCanAccessWorkspace(req.user, workspace)) {
      return res.status(403).json({
        message: 'You do not have access to this admin workspace.',
        workspace
      });
    }
    next();
  };
}
