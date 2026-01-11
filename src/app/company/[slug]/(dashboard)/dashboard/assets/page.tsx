
import { getEmployeeAssets } from "../actions";
import {
    FileText,
    Download,
    Ticket,
    Stamp,
    Book,
    File,
    Plane
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default async function AssetsPage() {
    const assets = await getEmployeeAssets();

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Asset Vault</h1>
                <p className="text-gray-500 font-medium">
                    Securely access your tickets, visas, and travel documents.
                </p>
            </div>

            {assets.length === 0 ? (
                <div className="text-center py-20 bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <FileText size={32} className="text-gray-300" />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Vault is empty</h3>
                    <p className="text-gray-400 text-xs max-w-xs mx-auto">
                        Documents uploaded by your travel agent will appear here automatically.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assets.map((asset) => {
                        let Icon = File;
                        let colorClass = "bg-gray-100 text-gray-600";

                        switch (asset.type) {
                            case 'TICKET':
                                Icon = Ticket;
                                colorClass = "bg-purple-100 text-purple-600";
                                break;
                            case 'VISA':
                                Icon = Stamp;
                                colorClass = "bg-amber-100 text-amber-600";
                                break;
                            case 'PASSPORT':
                                Icon = Book;
                                colorClass = "bg-blue-100 text-blue-600";
                                break;
                            case 'INVOICE':
                                Icon = FileText;
                                colorClass = "bg-emerald-100 text-emerald-600";
                                break;
                            default:
                                Icon = File;
                                colorClass = "bg-gray-100 text-gray-600";
                        }

                        return (
                            <Card key={asset.id} className="border-none shadow-sm ring-1 ring-gray-100 rounded-[24px] overflow-hidden hover:ring-indigo-200 hover:shadow-md transition-all group">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClass}`}>
                                            <Icon size={24} />
                                        </div>
                                        <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider border-gray-200">
                                            {asset.type}
                                        </Badge>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="font-bold text-gray-900 truncate mb-1" title={asset.name}>
                                            {asset.name}
                                        </h3>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                            <Plane size={10} />
                                            <span className="truncate max-w-[150px]">{asset.tripTitle}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            {format(new Date(asset.createdAt), "MMM dd, yyyy")}
                                        </span>
                                        <Button size="sm" variant="ghost" className="h-8 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold text-xs" asChild>
                                            <a href={asset.url} target="_blank" rel="noopener noreferrer" download>
                                                <Download size={14} className="mr-2" />
                                                Download
                                            </a>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
