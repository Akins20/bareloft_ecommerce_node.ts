import { Request, Response, NextFunction } from "express";
export declare const auditLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const financialAuditLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const adminAuditLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const authenticationAuditLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const dataAccessAuditLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const performanceAuditLogger: (threshold?: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const securityEventLogger: (eventType: string, details: any) => (req: Request, res: Response, next: NextFunction) => void;
export declare const generateAuditSummary: (timeframe?: "daily" | "weekly" | "monthly") => (req: Request, res: Response, next: NextFunction) => void;
declare const _default: {
    auditLogger: (req: Request, res: Response, next: NextFunction) => void;
    financialAuditLogger: (req: Request, res: Response, next: NextFunction) => void;
    adminAuditLogger: (req: Request, res: Response, next: NextFunction) => void;
    authenticationAuditLogger: (req: Request, res: Response, next: NextFunction) => void;
    dataAccessAuditLogger: (req: Request, res: Response, next: NextFunction) => void;
    performanceAuditLogger: (threshold?: number) => (req: Request, res: Response, next: NextFunction) => void;
    securityEventLogger: (eventType: string, details: any) => (req: Request, res: Response, next: NextFunction) => void;
    generateAuditSummary: (timeframe?: "daily" | "weekly" | "monthly") => (req: Request, res: Response, next: NextFunction) => void;
};
export default _default;
//# sourceMappingURL=auditLogging.d.ts.map