export const TransactionalEmailTemplate = {
    WELCOME: "WELCOME",
} as const;

export type TransactionalEmailTemplate =
    (typeof TransactionalEmailTemplate)[keyof typeof TransactionalEmailTemplate];

export const TransactionalEmailStatus = {
    PENDING: "PENDING",
    SENT: "SENT",
    FAILED: "FAILED",
} as const;

export type TransactionalEmailStatus =
    (typeof TransactionalEmailStatus)[keyof typeof TransactionalEmailStatus];
