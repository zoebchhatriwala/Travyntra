
import { DefaultSession } from "next-auth";

/**
 * Module augmentation for the 'next-auth' package to include custom user properties
 * in the Session and User interfaces.
 */
declare module "next-auth" {
    /**
     * Extended Session interface containing the custom user object.
     */
    interface Session {
        /** The authenticated user with additional role and identifier properties */
        user: {
            /** The unique database identifier for the user */
            id: string;
            /** The assigned system role for the user */
            role: string;
        } & DefaultSession["user"];
    }

    /**
     * Extended User interface containing core application properties.
     */
    interface User {
        /** The unique database identifier for the user */
        id: string;
        /** The assigned system role for the user */
        role: string;
    }
}

/**
 * Module augmentation for the 'next-auth/jwt' package to include custom properties
 * within the JSON Web Token.
 */
declare module "next-auth/jwt" {
    /**
     * Extended JWT interface reflecting the data stored in the session token.
     */
    interface JWT {
        /** The unique database identifier for the user stored in the token */
        id: string;
        /** The user's role stored in the token for quick permission checks */
        role: string;
    }
}
