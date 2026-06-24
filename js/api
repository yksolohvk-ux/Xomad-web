import { db, storage } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ===== USERS =====
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ===== FOLDERS =====
export async function getFolders(uid) {
  const q = query(collection(db, 'folders'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getFolder(id) {
  const snap = await getDoc(doc(db, 'folders', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createFolder(uid, data) {
  const ref = await addDoc(collection(db, 'folders'), {
    userId: uid,
    title: data.title,
    category: data.category,
    description: data.description || '',
    status: 'in_progress',
    documents: [],
    history: [{ action: 'Dossier créé', date: new Date().toISOString(), description: 'Le dossier a été créé.' }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateFolder(id, data) {
  await updateDoc(doc(db, 'folders', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteFolder(id) {
  await deleteDoc(doc(db, 'folders', id));
}

// ===== DOCUMENTS =====
export async function uploadDocument(file, uid, folderId, onProgress) {
  const ext = file.name.split('.').pop();
  const path = `documents/${uid}/${folderId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    task.on('state_changed',
      snap => onProgress && onProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({ name: file.name, url, size: file.size, type: file.type, path, uploadedAt: new Date().toISOString() });
      }
    );
  });
}

export async function addDocumentToFolder(folderId, docData, currentDocs, uid) {
  const updated = [...(currentDocs || []), docData];
  await updateDoc(doc(db, 'folders', folderId), {
    documents: updated,
    updatedAt: serverTimestamp()
  });
  return updated;
}

export async function removeDocumentFromFolder(folderId, docIndex, currentDocs) {
  const updated = currentDocs.filter((_, i) => i !== docIndex);
  await updateDoc(doc(db, 'folders', folderId), { documents: updated, updatedAt: serverTimestamp() });
  return updated;
}

// ===== CONVERSATIONS =====
export async function getConversations(uid) {
  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', uid), orderBy('lastMessageAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getConversation(id) {
  const snap = await getDoc(doc(db, 'conversations', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getMessages(conversationId) {
  const q = query(collection(db, 'messages'), where('conversationId', '==', conversationId), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function listenMessages(conversationId, callback) {
  const q = query(collection(db, 'messages'), where('conversationId', '==', conversationId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function sendMessage(conversationId, senderId, content) {
  await addDoc(collection(db, 'messages'), {
    conversationId,
    senderId,
    content,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: content,
    lastMessageAt: serverTimestamp()
  });
}

export async function createConversation(uid, otherUid, otherName, myName) {
  const ref = await addDoc(collection(db, 'conversations'), {
    participants: [uid, otherUid],
    participantNames: { [uid]: myName, [otherUid]: otherName },
    lastMessage: '',
    lastMessageAt: serverTimestamp(),
    unreadCounts: { [uid]: 0, [otherUid]: 0 },
    createdAt: serverTimestamp()
  });
  return ref.id;
}

// ===== NOTIFICATIONS =====
export async function getNotifications(uid) {
  const q = query(collection(db, 'notifications'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function listenNotifications(uid, callback) {
  const q = query(collection(db, 'notifications'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function markNotificationRead(id) {
  await updateDoc(doc(db, 'notifications', id), { isRead: true, readAt: serverTimestamp() });
}

export async function markAllNotificationsRead(uid) {
  const notifs = await getNotifications(uid);
  const unread = notifs.filter(n => !n.isRead);
  await Promise.all(unread.map(n => markNotificationRead(n.id)));
}

export async function createNotification(uid, title, content, type = 'info') {
  await addDoc(collection(db, 'notifications'), {
    userId: uid,
    title,
    content,
    type,
    isRead: false,
    createdAt: serverTimestamp()
  });
}

// ===== SEED DEMO DATA =====
export async function seedDemoData(uid, profile) {
  const existing = await getFolders(uid);
  if (existing.length > 0) return;

  const name = `${profile.firstName} ${profile.lastName}`;

  // Create folders
  const folders = [
    { title: 'Déclaration URSSAF', category: 'URSSAF', status: 'in_progress', description: 'Déclaration URSSAF trimestrielle.' },
    { title: 'Dossier Fiscal 2023', category: 'Fiscalité', status: 'additional_information_required', description: 'Bilan fiscal annuel 2023.' },
    { title: 'Comptabilité - Avril', category: 'Comptabilité', status: 'completed', description: 'Clôture comptable du mois d\'avril.' },
    { title: 'TVA - Trimestre 1', category: 'Fiscalité', status: 'in_progress', description: 'Déclaration TVA premier trimestre.' },
    { title: 'Bilan Annuel 2023', category: 'Comptabilité', status: 'completed', description: 'Bilan comptable annuel 2023.' },
    { title: 'Contrat de travail', category: 'Ressources humaines', status: 'in_progress', description: 'Contrat de travail à durée indéterminée.' },
    { title: 'Assurance Pro', category: 'Assurance', status: 'completed', description: 'Assurance responsabilité civile professionnelle.' },
  ];

  await Promise.all(folders.map(f => addDoc(collection(db, 'folders'), {
    userId: uid,
    ...f,
    documents: [],
    history: [{ action: 'Dossier créé', date: new Date().toISOString(), description: 'Dossier créé automatiquement.' }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })));

  // Create conversations
  const agents = [
    { name: 'Sophie Martin', message: 'Documents complémentaires requis', unread: 1 },
    { name: 'Équipe Administrative', message: 'Votre dossier est terminé', unread: 0 },
    { name: 'Paul Bernard', message: 'Merci pour votre retour', unread: 0 },
    { name: 'Julie Durand', message: 'Informations reçues, merci', unread: 0 },
    { name: 'Support Technique', message: 'Bonjour, comment pouvons-nous vous aider ?', unread: 0 },
  ];

  for (const agent of agents) {
    const agentUid = `agent_${agent.name.replace(/\s/g, '_').toLowerCase()}`;
    const convRef = await addDoc(collection(db, 'conversations'), {
      participants: [uid, agentUid],
      participantNames: { [uid]: name, [agentUid]: agent.name },
      lastMessage: agent.message,
      lastMessageAt: serverTimestamp(),
      unreadCounts: { [uid]: agent.unread, [agentUid]: 0 },
      createdAt: serverTimestamp()
    });
    await addDoc(collection(db, 'messages'), {
      conversationId: convRef.id,
      senderId: agentUid,
      content: agent.message,
      createdAt: serverTimestamp()
    });
  }

  // Create notifications
  const notifs = [
    { title: 'Nouveau message', content: 'Sophie Martin vous a envoyé un message.', type: 'message' },
    { title: 'Document demandé', content: 'Des documents complémentaires sont requis pour votre dossier URSSAF.', type: 'document' },
    { title: 'Dossier terminé', content: 'Votre dossier « Bilan Annuel 2023 » est terminé.', type: 'folder' },
  ];

  await Promise.all(notifs.map(n => addDoc(collection(db, 'notifications'), {
    userId: uid,
    ...n,
    isRead: false,
    createdAt: serverTimestamp()
  })));
}
