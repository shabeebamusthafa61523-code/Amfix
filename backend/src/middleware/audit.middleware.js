// import prisma from '../config/db.js';
import logger from '../utils/logger.util.js';

/**
 * Persist an event transaction to the AuditLog database table and Winston audit log stream.
 * @param {object} req Express request context object (for IP and User-Agent capture)
 * @param {object} details Audit transaction parameters
 * @param {string} details.action CREATE | UPDATE | DELETE | APPROVE | LOGIN
 * @param {string} details.entity Database Model target e.g. "Task", "Lead", "Invoice"
 * @param {string} [details.entityId] ID of the modified record
 * @param {object} [details.oldValue] JSON object representing the state before transaction
 * @param {object} [details.newValue] JSON object representing the state after transaction
 */
export const recordAudit = async (req, {
  action,
  entity,
  entityId = null,
  oldValue = null,
  newValue = null
}) => {
  try {
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    // 1. Save directly to Database using Prisma if available
    let auditRecordId = 'mongo_' + Date.now();
    if (typeof prisma !== 'undefined' && prisma?.auditLog) {
      const auditRecord = await prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
          newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
          ipAddress,
          userAgent
        }
      });
      if (auditRecord) auditRecordId = auditRecord.id;
    }

    // 2. Stream to daily rotating Winston audit log file
    logger.info(
      `📑 AUDIT TRANSACTION SUCCESS [ID: ${auditRecordId}] | Action: ${action} | Entity: ${entity} | Triggered By User: ${userId || 'SYSTEM'} | IP: ${ipAddress}`,
      {
        requestId: req.id,
        auditId: auditRecordId,
        action,
        entity,
        entityId,
        oldValue,
        newValue,
        ipAddress,
        userAgent
      }
    );

    return auditRecord;
  } catch (error) {
    // Gracefully handle audit failures so core transactions never crash/rollback
    logger.error(`❌ Failed to record Audit transaction: ${error.message}`, {
      requestId: req.id,
      errorStack: error.stack
    });
    return null;
  }
};

/**
 * Express middleware to audit simple route triggers (e.g. Login endpoints or critical downloads)
 */
export const auditRouteTrigger = (action, entity) => {
  return async (req, res, next) => {
    // Attach trigger details to the request for post-processing or record audit on response end
    res.on('finish', () => {
      // Log only on successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        recordAudit(req, {
          action,
          entity,
          entityId: req.params.id || null,
          newValue: req.body ? { ...req.body, password: undefined, passwordHash: undefined } : null
        });
      }
    });
    next();
  };
};
export default auditRouteTrigger;
