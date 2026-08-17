import { adminDb } from '../config/firebase';

export interface AuditLog {
  id?: string;
  adminUserId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;   // UI reads 'timestamp'; keep 'createdAt' as alias below
  metadata?: Record<string, any>;
}

// Strip undefined values so Firestore never rejects the document
function stripUndefined(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

export const logAdminAction = async (
  adminUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>
) => {
  try {
    const now = new Date().toISOString();
    const logData = stripUndefined({
      adminUserId,
      action,
      entityType,
      entityId,
      metadata: metadata ? stripUndefined(metadata) : undefined,
      timestamp: now,
      createdAt: now,
    });
    await adminDb.collection('auditLogs').add(logData);
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Never throw — audit log failure must not break the main request
  }
};

export const logCustomerAction = async (
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>
) => {
  try {
    const now = new Date().toISOString();
    const logData = stripUndefined({
      userId,
      action,
      entityType,
      entityId,
      metadata: metadata ? stripUndefined(metadata) : undefined,
      timestamp: now,
      createdAt: now,
    });
    await adminDb.collection('auditLogs').add(logData);
  } catch (error) {
    console.error('Failed to write customer audit log:', error);
  }
};

export const getAuditLogs = async (limit: number = 100, pageToken?: string) => {
  let query = adminDb.collection('auditLogs').orderBy('createdAt', 'desc').limit(limit);

  if (pageToken) {
    const lastDoc = await adminDb.collection('auditLogs').doc(pageToken).get();
    if (lastDoc.exists) {
      query = query.startAfter(lastDoc);
    }
  }

  const snapshot = await query.get();
  const logs = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      // Normalise: make sure 'timestamp' is always present for the UI
      timestamp: data.timestamp || data.createdAt || '',
    };
  }) as AuditLog[];

  const lastVisible = snapshot.docs[snapshot.docs.length - 1];

  return {
    logs,
    nextPageToken: lastVisible ? lastVisible.id : undefined,
  };
};
