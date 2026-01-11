import { prisma } from "../src/lib/prisma";
import { hash } from "bcryptjs";
import { UserRole, CompanyStatus, SubscriptionPlan } from "@prisma/client";

async function main() {
    console.log("Seeding database...");

    const hashedPassword = await hash("password123", 10);

    // 1. Super Admin
    await prisma.user.upsert({
        where: { email: "admin@travyntra.com" },
        update: {
            name: "Super Admin",
            password: hashedPassword,
            isActive: true,
            role: UserRole.SUPER_ADMIN,
        },
        create: {
            email: "admin@travyntra.com",
            name: "Super Admin",
            password: hashedPassword,
            role: UserRole.SUPER_ADMIN,
            isActive: true,
        },
    });


    // 2. Demo Company: Acme Corp
    const acme = await prisma.company.upsert({
        where: { slug: "acme" },
        update: {},
        create: {
            name: "Acme Corporation",
            slug: "acme",
            domain: "acme.com",
            status: CompanyStatus.ACTIVE,
            plan: SubscriptionPlan.ENTERPRISE,
        }
    });

    // 3. Company Admin for Acme
    await prisma.user.upsert({
        where: { email: "john@acme.com" },
        update: {},
        create: {
            email: "john@acme.com",
            name: "John Manager",
            password: hashedPassword,
            role: UserRole.COMPANY_ADMIN,
            companyId: acme.id,
            isActive: true,
        }
    });

    // 4. Demo Company: Globex (Pending)
    const globex = await prisma.company.upsert({
        where: { slug: "globex" },
        update: {},
        create: {
            name: "Globex Industries",
            slug: "globex",
            domain: "globex.io",
            status: CompanyStatus.PENDING,
            plan: SubscriptionPlan.STARTER,
        }
    });

    await prisma.user.upsert({
        where: { email: "hank@globex.io" },
        update: {},
        create: {
            email: "hank@globex.io",
            name: "Hank Scorpio",
            password: hashedPassword,
            role: UserRole.COMPANY_ADMIN,
            companyId: globex.id,
            isActive: false,
        }
    });

    console.log("Seed completed successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
