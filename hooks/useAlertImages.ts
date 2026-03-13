import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export interface AlertImage {
  id: string;
  userId: string;
  image: string;      // base64 data URL
  lat: number;
  lng: number;
  timestamp: Date;
}

export function useAlertImages(maxImages = 20) {
  const [images, setImages] = useState<AlertImage[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'alert_images'),
      orderBy('timestamp', 'desc'),
      limit(maxImages)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          userId: d.userId || 'unknown',
          image: d.image || '',
          lat: d.lat || 0,
          lng: d.lng || 0,
          timestamp: d.timestamp?.toDate?.() || new Date(),
        } as AlertImage;
      });
      setImages(data);
    }, (err) => {
      console.error('Failed to listen to alert_images:', err);
    });

    return () => unsub();
  }, [maxImages]);

  return images;
}
