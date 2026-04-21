/**
 * lib/useSubscription.ts
 * ----------------------
 * Hook to fetch & cache subscription status.
 * Components import this to check if the user can access features.
 */

"use client";

import { gql, useQuery, useMutation } from "@apollo/client";

// ── GraphQL ────────────────────────────────────────────────────────────
const GET_SUBSCRIPTION = gql`
  query GetSubscriptionStatus {
    getSubscriptionStatus {
      tenantId
      plan
      status
      razorpaySubId
      trialEndsAt
      currentPeriodEnd
      isActive
    }
  }
`;

const CREATE_SUBSCRIPTION = gql`
  mutation CreateSubscription($input: CreateSubscriptionInput!) {
    createSubscription(input: $input) {
      subscriptionId
      planId
      shortUrl
      isTrial
    }
  }
`;

const CANCEL_SUBSCRIPTION = gql`
  mutation CancelSubscription {
    cancelSubscription
  }
`;

// ── Types ──────────────────────────────────────────────────────────────
export interface SubscriptionStatus {
    tenantId: string;
    plan: string;
    status: string;
    razorpaySubId?: string;
    trialEndsAt?: string;
    currentPeriodEnd?: string;
    isActive: boolean;
}

export interface CreateSubscriptionResult {
    subscriptionId: string;
    planId: string;
    shortUrl: string;
    isTrial: boolean;
}

// ── Hook ───────────────────────────────────────────────────────────────
export function useSubscription() {
    const { data, loading, error, refetch } = useQuery<{
        getSubscriptionStatus: SubscriptionStatus;
    }>(GET_SUBSCRIPTION, {
        fetchPolicy: "cache-and-network",
    });

    const [createSubMutation, { loading: creating }] = useMutation<{
        createSubscription: CreateSubscriptionResult;
    }>(CREATE_SUBSCRIPTION);

    const [cancelSubMutation, { loading: cancelling }] =
        useMutation<{ cancelSubscription: string }>(CANCEL_SUBSCRIPTION);

    const status = data?.getSubscriptionStatus ?? null;

    /**
     * Creates a Razorpay subscription and opens the checkout modal.
     * planKey = "MONTHLY" | "BIANNUAL" | "YEARLY"
     */
    async function subscribe(planKey: string, onSuccess?: (isTrial: boolean) => void): Promise<void> {
        const result = await createSubMutation({
            variables: { input: { planKey } },
        });

        const sub = result.data?.createSubscription;
        if (!sub) throw new Error("Failed to create subscription");

        const description = sub.isTrial
            ? `${planKey} Subscription — 7-day free trial included`
            : `${planKey} Plan — Billing starts immediately`;

        // Open Razorpay checkout in a new tab if SDK unavailable
        if (typeof window !== "undefined" && (window as any).Razorpay) {
            const rzp = new (window as any).Razorpay({
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                subscription_id: sub.subscriptionId,
                name: "CloudHisaab",
                description,
                image: "/logo.png",
                handler: async function () {
                    // Payment authorised — refetch status
                    await refetch();
                    if (onSuccess) onSuccess(sub.isTrial);
                },
                modal: {
                    // If user closes modal without paying, refetch to sync real status
                    ondismiss: async function () {
                        await refetch();
                    },
                },
                prefill: {},
                theme: { color: "#4f46e5" },
            });
            rzp.open();
        } else if (sub.shortUrl) {
            window.open(sub.shortUrl, "_blank");
        }
    }

    async function cancel(): Promise<string> {
        const result = await cancelSubMutation();
        await refetch();
        return result.data?.cancelSubscription ?? "";
    }

    return {
        status,
        loading,
        error,
        creating,
        cancelling,
        subscribe,
        cancel,
        refetch,
    };
}
