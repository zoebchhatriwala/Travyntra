import { prisma } from "../src/lib/prisma";
import { parseMoney, createMoney } from "../src/lib/utils/money";

async function fixBudgetData() {
    console.log("Checking for invalid budget data...");

    const requests = await prisma.tripRequest.findMany({
        where: {
            budget: {
                not: null
            }
        },
        select: {
            id: true,
            title: true,
            budget: true
        }
    });

    console.log(`Found ${requests.length} requests with budget data`);

    let fixedCount = 0;
    let invalidCount = 0;

    for (const request of requests) {
        const money = parseMoney(request.budget);

        if (!money) {
            console.log(`\n❌ Invalid budget for request: ${request.title} (${request.id})`);
            console.log(`   Budget data:`, JSON.stringify(request.budget));
            invalidCount++;

            // Try to fix if it's a plain number
            if (typeof request.budget === 'number') {
                console.log(`   Attempting to fix: converting number ${request.budget} to Money object`);
                const fixedMoney = createMoney(request.budget, "USD");
                await prisma.tripRequest.update({
                    where: { id: request.id },
                    data: { budget: fixedMoney as any }
                });
                fixedCount++;
                console.log(`   ✅ Fixed!`);
            }
        } else {
            // Validate the money object has valid numbers
            if (typeof money.amount !== 'number' || typeof money.multiplier !== 'number' ||
                isNaN(money.amount) || isNaN(money.multiplier)) {
                console.log(`\n⚠️  Invalid Money object for request: ${request.title} (${request.id})`);
                console.log(`   Money data:`, JSON.stringify(money));
                invalidCount++;
            }
        }
    }

    console.log(`\n\nSummary:`);
    console.log(`- Total requests checked: ${requests.length}`);
    console.log(`- Invalid budgets found: ${invalidCount}`);
    console.log(`- Fixed budgets: ${fixedCount}`);
}

fixBudgetData()
    .then(() => {
        console.log("\n✅ Done!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Error:", error);
        process.exit(1);
    });
