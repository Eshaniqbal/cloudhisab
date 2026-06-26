"use client";
import { useQuery } from "@apollo/client";
import { GET_INVOICE } from "@/lib/graphql/queries";
import InvoiceForm from "@/components/billing/InvoiceForm";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function EditInvoicePage() {
    const params = useParams();
    const saleId = params.saleId as string;

    const { data, loading, error } = useQuery(GET_INVOICE, {
        variables: { saleId },
        fetchPolicy: "network-only",
    });

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
                <Loader2 size={32} className="spin" color="var(--indigo)" />
            </div>
        );
    }

    if (error || !data?.getInvoice) {
        return (
            <div style={{ padding: 40, textAlign: "center" }}>
                <h2>Invoice Not Found</h2>
                <p>{error?.message || "Could not load invoice data for editing."}</p>
            </div>
        );
    }

    return <InvoiceForm initialData={data.getInvoice} />;
}
