import React, { useState } from "react";
import { 
  FolderOpen, 
  Search, 
  Printer, 
  FileText, 
  Clock, 
  CheckCircle, 
  Eye, 
  Download,
  Filter,
  UserCheck
} from "lucide-react";

interface ClientDirectoryProps {
  onLogPrint?: (msg: string) => void;
}

export function ClientDirectory({ onLogPrint }: ClientDirectoryProps) {
  const [search, setSearch] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [orders, setOrders] = useState([
    {
      id: "ORD-9912",
      client: "Vertex Architecture LLC",
      doc: "Site_Plan_A1_Approved.dwg.pdf",
      specs: "A1 Blueprint • 12 Copies • 120gsm Uncoated",
      date: "Today, 10:45 AM",
      status: "Completed",
    },
    {
      id: "ORD-9908",
      client: "Solaria Studio",
      doc: "Lookbook_Spring_Editorial.pdf",
      specs: "Saddle-Stitched Brochure • 300gsm Matte",
      date: "Today, 09:15 AM",
      status: "Completed",
    },
    {
      id: "ORD-9884",
      client: "Dr. Marcus Chen",
      doc: "Conference_Poster_36x48.pdf",
      specs: "Vinyl Banner • High-Gloss UV Finish",
      date: "Yesterday",
      status: "Ready for Pickup",
    },
    {
      id: "ORD-9840",
      client: "Elena Rostova",
      doc: "Passport_Biometric_35x45.png",
      specs: "35x45mm Grid • 16 Tiled Units • Photo Gloss",
      date: "Oct 10, 2026",
      status: "Completed",
    },
    {
      id: "ORD-9812",
      client: "Beacon Capital Partners",
      doc: "Quarterly_Financial_Report.pdf",
      specs: "Wire-O Bound • Double Sided • 200gsm Silk",
      date: "Oct 08, 2026",
      status: "Archived",
    },
  ]);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.client.toLowerCase().includes(search.toLowerCase()) ||
      o.doc.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase());
    
    if (filterStatus === "all") return matchesSearch;
    return matchesSearch && o.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const handleReprint = (order: typeof orders[0]) => {
    window.print();
    if (onLogPrint) {
      onLogPrint(`Reprinted order ${order.id} (${order.client})`);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-y-auto custom-scrollbar p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Client History & Archived Orders
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instant retrieval, specification recall, and 1-click reprinting for verified jobs.
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, order ID, or document name..."
            className="w-full bg-card border border-border rounded-xl pl-9 pr-3.5 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="ready for pickup">Ready for Pickup</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* ORDERS LIST */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xs divide-y divide-border">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No orders match your filter criteria.
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-foreground">{order.id}</span>
                  <span className="text-xs font-semibold text-foreground">• {order.client}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    order.status === "Completed" 
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : order.status === "Ready for Pickup"
                      ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                      : "bg-neutral-500/10 text-neutral-600 border-neutral-500/20"
                  }`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {order.doc}
                </p>
                <p className="text-[11px] text-muted-foreground/80">
                  {order.specs} • {order.date}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleReprint(order)}
                  className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Reprint</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
