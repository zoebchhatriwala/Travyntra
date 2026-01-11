"use client";

interface SpendingChartProps {
    data: { month: string; amount: number }[];
}

export function SpendingChart({ data }: SpendingChartProps) {
    const maxAmount = Math.max(...data.map(d => d.amount), 1000);

    return (
        <div className="h-[200px] flex items-end gap-3 pt-8 px-4">
            {data.map((item, idx) => {
                const heightPercentage = (item.amount / maxAmount) * 100;
                return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="relative w-full">
                            {/* Bar */}
                            <div
                                className="w-full bg-indigo-50 rounded-t-xl hover:bg-indigo-600 transition-all duration-500 cursor-pointer relative"
                                style={{ height: `${heightPercentage}%` }}
                            >
                                {/* Tooltip */}
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                                    ${item.amount.toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">{item.month}</p>
                    </div>
                );
            })}
        </div>
    );
}
