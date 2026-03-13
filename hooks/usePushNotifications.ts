'use client';
import { useEffect, useRef } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export function usePushNotifications(userId: string) {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!userId || subscribedRef.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[push] Push not supported in this browser');
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[push] VAPID public key not configured');
      return;
    }

    const register = async () => {
      try {
        // Register (or get existing) service worker
        const registration = await navigator.serviceWorker.register('/aegis-sw.js', {
          scope: '/',
        });
        await navigator.serviceWorker.ready;

        // Check if already subscribed
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          // Already have a subscription — just ensure it's stored
          await storeSubscription(userId, existing);
          subscribedRef.current = true;
          return;
        }

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('[push] Notification permission denied');
          return;
        }

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
        });

        await storeSubscription(userId, subscription);
        subscribedRef.current = true;
        console.log('[push] Subscribed to push notifications');
      } catch (err) {
        console.warn('[push] Failed to subscribe:', err);
      }
    };

    register();
  }, [userId]);
}

async function storeSubscription(userId: string, subscription: PushSubscription) {
  try {
    await fetch('/api/push', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription: subscription.toJSON() }),
    });
  } catch (err) {
    console.warn('[push] Failed to store subscription:', err);
  }
}
