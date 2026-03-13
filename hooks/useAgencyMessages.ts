'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';

export interface AgencyMessage {
  id: string;
  userId: string;
  message: string;
  audioBase64?: string;
  operatorId: string;
  timestamp: Date;
  type: string;
  delivered: boolean;
  acknowledged: boolean;
}

export function useAgencyMessages(userId: string) {
  const [messages, setMessages] = useState<AgencyMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'messages'),
      where('userId', '==', userId),
      where('type', '==', 'agency_ping'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages: AgencyMessage[] = [];
      let unread = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const message: AgencyMessage = {
          id: doc.id,
          userId: data.userId,
          message: data.message,
          audioBase64: data.audioBase64,
          operatorId: data.operatorId,
          timestamp: data.timestamp.toDate(),
          type: data.type,
          delivered: data.delivered,
          acknowledged: data.acknowledged,
        };
        newMessages.push(message);
        if (!data.acknowledged) unread++;
      });

      console.log(`[useAgencyMessages] Received ${snapshot.size} messages for user ${userId}`);
      setMessages(newMessages);
      setUnreadCount(unread);
    }, (error) => {
      // This fires when the Firestore composite index is missing!
      console.error('[useAgencyMessages] Snapshot listener error:', error.message);
      console.error('[useAgencyMessages] If you see "requires an index", click the link in the error above to create it.');
    });

    return unsubscribe;
  }, [userId]);

  const acknowledgeMessage = async (messageId: string) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        acknowledged: true,
        delivered: true,
      });
    } catch (error) {
      console.error('Failed to acknowledge message:', error);
    }
  };

  return { messages, unreadCount, acknowledgeMessage };
}