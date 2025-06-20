export declare const authConfig: {
    readonly jwt: {
        readonly secret: string;
        readonly refreshSecret: string;
        readonly expiresIn: string;
        readonly refreshExpiresIn: string;
        readonly issuer: "bareloft-api";
        readonly audience: "bareloft-users";
    };
    readonly bcrypt: {
        readonly rounds: number;
    };
    readonly otp: {
        readonly expiresInMinutes: number;
        readonly length: 6;
        readonly maxAttempts: number;
        readonly resendCooldownMinutes: 2;
        readonly alphabetic: false;
    };
    readonly session: {
        readonly secret: string;
        readonly expiresMs: number;
        readonly cookieName: "bareloft_session";
        readonly secure: boolean;
        readonly httpOnly: true;
        readonly sameSite: "strict";
    };
    readonly rateLimit: {
        readonly windowMs: number;
        readonly maxRequests: number;
        readonly skipSuccessfulRequests: false;
        readonly skipFailedRequests: false;
        readonly standardHeaders: true;
        readonly legacyHeaders: false;
    };
    readonly phoneValidation: {
        readonly countryCode: "+234";
        readonly lengthAfterCountryCode: 10;
        readonly validPrefixes: readonly ["70", "80", "81", "90", "91", "70", "71"];
        readonly regex: RegExp;
    };
};
//# sourceMappingURL=auth.d.ts.map